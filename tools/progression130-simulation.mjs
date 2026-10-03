/**
 * Read-only, deterministic career calibration. No browser storage, ads or rewards.
 * Uses production gameStore commands and production tick/settlement in memory.
 * Run: node tools/progression130-simulation.mjs --seeds=1000 --days=90 --visits=24
 * stdout contains aggregate JSON; this script does not write any file.
 */
import { createServer } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { spawn } from 'node:child_process';

const arg = (name, fallback) => Number(process.argv.find(a => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback);
const seeds = arg('seeds', 1000), days = arg('days', 90), visits = arg('visits', 24);
const workers = arg('workers', 1), offset = arg('offset', 0), raw = process.argv.includes('--raw');
if (![seeds, days, visits].every(n => Number.isSafeInteger(n) && n > 0)) throw new Error('Positive integer arguments required');
const fileNames = ['src/domain/balance.ts', 'src/data/store-tiers.ts', 'src/domain/v5-rules.ts',
  'src/domain/settlement.ts', 'src/domain/store-growth.ts', 'src/domain/wholesaler.ts',
  'src/domain/pool-supply.ts', 'src/domain/financed-pool-supply.ts', 'src/state/gameStore.ts'];
const hashes = Object.fromEntries(fileNames.map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/*'] } }, appType: 'custom' });
try {
  const [{ useGame }, save, purchase, growth, calendar, tiers, balance, skills, market, intent, network, wholesale, settlement, pools, v5] = await Promise.all([
    server.ssrLoadModule('/src/state/gameStore.ts'), server.ssrLoadModule('/src/state/save.ts'),
    server.ssrLoadModule('/src/domain/purchase.ts'), server.ssrLoadModule('/src/domain/store-growth.ts'),
    server.ssrLoadModule('/src/domain/calendar.ts'), server.ssrLoadModule('/src/data/store-tiers.ts'),
    server.ssrLoadModule('/src/domain/balance.ts'), server.ssrLoadModule('/src/domain/skill-tree.ts'),
    server.ssrLoadModule('/src/domain/market.ts'), server.ssrLoadModule('/src/domain/intent.ts'),
    server.ssrLoadModule('/src/domain/trade-network.ts'),
    server.ssrLoadModule('/src/domain/wholesaler.ts'), server.ssrLoadModule('/src/domain/settlement.ts'),
    server.ssrLoadModule('/src/domain/pool-supply.ts'), server.ssrLoadModule('/src/domain/v5-rules.ts'),
  ]);
  save.suspendSaves(); // No localStorage reads/writes or automatic session ads.
  const initial = useGame.getState();
  const tierRequirements = structuredClone(tiers.STORE_TIERS.filter(t => t.tier >= 2 && t.tier <= 4));
  const xpTotals = Object.fromEntries(Array.from({ length: 9 }, (_, n) => {
    const level = n + 2;
    return [level, Array.from({ length: level - 1 }, (_, i) => balance.XP.levelCurve(i + 1)).reduce((a, b) => a + b, 0)];
  }));
  const modes = (process.argv.find(a => a.startsWith('--modes='))?.slice(8) ?? 'cash-counter,credit-enabled-counter').split(',');
  if (modes.some(mode => !['cash-counter', 'credit-enabled-counter', 'cash-consistent-trust', 'cash-consistent-aligned', 'planned-reserve', 'mixed', 'personnel-bulk'].includes(mode))) throw new Error('Unknown policy');
  const candidateTrust = [58, 62, 65], alignedLevels = [3, 5, 7];
  const records = Object.fromEntries(modes.map(mode => [mode, []]));
  const start = performance.now();
  let invariantChecks = 0;
  const candidateMode = mode => !['cash-counter', 'credit-enabled-counter'].includes(mode);
  const hasReserve = mode => ['planned-reserve', 'personnel-bulk'].includes(mode);
  const mixedWork = mode => ['mixed', 'personnel-bulk'].includes(mode);

  function buyStock(templateId, quantity, mode) {
    const before = useGame.getState();
    before.buyPoolStock(templateId, quantity, mode === 'credit-enabled-counter');
    const after = useGame.getState();
    if (candidateMode(mode) && after.ledger.transactions.length > before.ledger.transactions.length) {
      const transaction = after.ledger.transactions.at(-1);
      const expected = wholesale.tradeTrustAfterPurchase(before.store.supplier, -transaction.cashDelta, wholesale.creditLimit(before.store));
      // Idempotent candidate adapter: a future production cash-route fix must not grant twice.
      useGame.setState({ store: { ...after.store, supplier: { ...after.store.supplier, trust: expected.trust } } });
      return true;
    }
    return after.ledger.transactions.length > before.ledger.transactions.length;
  }
  function operateMorning(record) {
    let s = useGame.getState();
    if (mixedWork(record.mode)) {
      for (const job of [...s.jobs]) if (job.result === 'success' || job.result === 'failed') {
        s.deliverJob(job.jobId);
        if (useGame.getState().lastServiceDelivery && !useGame.getState().lastServiceDelivery.succeeded) record.serviceFailures++;
        useGame.getState().dismissServiceDelivery();
      }
    }
    s = useGame.getState();
    if (record.mode === 'personnel-bulk') {
      const count = v5.personnelEffectiveMaxTier(s.store, s.market.day);
      // Hiring is optional: retain seven days of actual prospective running costs.
      if (count > v5.personnelCount(s.store) && s.store.cash >= v5.dailyOperatingCost({ ...s.store, personnelCount: count }) * 7) {
        s.setPersonnelCount(count);
        for (let index = 0; index < v5.personnelCount(useGame.getState().store); index++) useGame.getState().setPersonnelRole(index, ['workshop', 'sales', 'reception'][index]);
      }
    }
    if (!hasReserve(record.mode) || !calendar.isShopOpen(s.market.day)) return;
    const history = record.demands.filter(row => row.day >= s.market.day - 7);
    const groups = new Map();
    for (const row of history) groups.set(row.templateId, [...(groups.get(row.templateId) ?? []), row.quantity]);
    // Empty-history starter basket is a fixed visible catalogue choice, not future demand.
    const selection = groups.size ? [...groups].sort((a, b) => b[1].length - a[1].length).slice(0, 3)
      : [['gram_gold_1', [10]], ['quarter_gold', [2]], ['full_gold', [1]]];
    let budget = useGame.getState().store.cash * .25;
    for (const [templateId, quantities] of selection) {
      s = useGame.getState();
      const current = s.inventory.filter(p => s.items[p.itemId]?.templateId === templateId).reduce((sum, p) => sum + p.quantity, 0);
      const target = [...quantities].sort((a, b) => a - b)[Math.floor(quantities.length / 2)];
      const missing = Math.max(0, target - current);
      const quote = missing > 0 ? pools.poolSupplyQuote(templateId, missing, s.market, s.store) : null;
      if (quote && quote.totalPrice <= budget && s.store.cash - quote.totalPrice >= v5.dailyOperatingCost(s.store) * 7 && buyStock(templateId, missing, record.mode)) {
        budget -= quote.totalPrice; record.preparedPurchases++;
      }
    }
  }

  function reset(seed) {
    const firstMarket = market.createMarketForDay(seed, 1);
    useGame.setState({ ...initial, seed, market: firstMarket, store: structuredClone(initial.store),
      inventory: [], items: {}, ledger: structuredClone(initial.ledger), customers: {}, jobs: [],
      network: network.spawnNetwork(seed, balance.START.reputation), skillProgress: skills.defaultSkillProgress(),
      dayCharacter: intent.dayCharacter(seed, 1, firstMarket), intentTelemetry: intent.emptyTelemetry(),
      profileSetupDone: true, seenLessons: [], queue: [], activeCustomer: null, activeDeal: null,
      recallableGuest: null, toasts: [], weekReports: [], spawnCounter: 0, jobCounter: 0 });
    useGame.getState().skipOnboarding();
  }
  function measure(record) {
    const s = useGame.getState();
    const snap = growth.growthSnapshot(s, Object.keys(s.customers).length);
    record.final = { ...snap, day: s.market.day, xp: s.store.xp, level: s.store.level,
      totalXP: s.store.xp + Array.from({ length: s.store.level - 1 }, (_, i) => balance.XP.levelCurve(i + 1)).reduce((a, b) => a + b, 0),
      realizedProfit: s.ledger.realizedProfitTotal, qualifiedWork: skills.masterySummary(s.skillProgress).completed,
      actualTier: s.store.storeTier, invoices: s.store.supplier.openInvoices.length,
      personnel: v5.personnelCount(s.store), staffSales: s.ledger.deals.filter(deal => deal.dealId.startsWith('personnel_sale_')).length,
      bulkSales: s.ledger.deals.filter(deal => deal.price > 0 && deal.isBulk).length, totalArrivals: s.spawnCounter,
      serviceAccepted: s.jobs.length, serviceDelivered: s.jobs.filter(job => job.result === 'delivered').length,
      serviceFailures: record.serviceFailures, appraisalPaid: record.appraisalPaid, appraisalAccurate: record.appraisalAccurate,
      preparedPurchases: record.preparedPurchases };
    const mark = key => { if (record.first[key] === undefined) record.first[key] = { day: s.market.day, sales: record.sales, arrivals: record.arrivals }; };
    for (let level = 2; level <= 10; level++) if (s.store.level >= level) mark(`level${level}`);
    for (const count of [5, 15, 30, 50, 80, 120]) if (record.final.qualifiedWork >= count) mark(`mastery${count}`);
    for (const count of [18, 70, 180]) if (snap.closedDeals >= count) mark(`deals${count}`);
    for (const tier of tierRequirements) {
      const gates = { ...tier.requires, investment: tier.investment };
      const value = { ...snap, investment: snap.cash };
      for (const [key, threshold] of Object.entries(gates)) if (value[key] >= threshold) mark(`tier${tier.tier}.${key}`);
      const nonLevelReady = Object.entries(gates).filter(([key]) => key !== 'level').every(([key, threshold]) => value[key] >= threshold);
      if (nonLevelReady) mark(`tier${tier.tier}.nonLevelReady`);
      for (const [candidate, levels] of Object.entries({ current: [3, 6, 10], conservative: [3, 5, 7], faster: [2, 4, 6] })) {
        if (nonLevelReady && snap.level >= levels[tier.tier - 2]) mark(`tier${tier.tier}.${candidate}Ready`);
      }
      const creditOptional = { ...gates, supplierTrust: candidateTrust[tier.tier - 2] };
      const creditOptionalAligned = { ...creditOptional, level: alignedLevels[tier.tier - 2] };
      if (Object.entries(creditOptional).filter(([key]) => key !== 'level').every(([key, threshold]) => value[key] >= threshold)) {
        mark(`tier${tier.tier}.creditOptionalNonLevelReady`);
        if (s.store.storeTier === tier.tier - 1 && snap.level < creditOptional.level) mark(`tier${tier.tier}.levelOnlyBlock`);
      }
      if (Object.entries(creditOptional).every(([key, threshold]) => value[key] >= threshold)) mark(`tier${tier.tier}.creditOptionalReady`);
      if (Object.entries(creditOptionalAligned).every(([key, threshold]) => value[key] >= threshold)) mark(`tier${tier.tier}.creditOptionalAlignedReady`);
      if (Object.entries({ ...creditOptional, level: [3, 4, 6][tier.tier - 2] }).every(([key, threshold]) => value[key] >= threshold)) mark(`tier${tier.tier}.creditOptional346Ready`);
    }
    const candidatePolicy = candidateMode(record.mode);
    const nextCandidate = tierRequirements.find(tier => tier.tier === s.store.storeTier + 1);
    if (candidatePolicy && nextCandidate) {
      const target = { ...nextCandidate.requires, supplierTrust: candidateTrust[nextCandidate.tier - 2],
        ...(record.mode === 'cash-consistent-aligned' ? { level: alignedLevels[nextCandidate.tier - 2] } : {}), investment: nextCandidate.investment };
      const value = { ...snap, investment: snap.cash };
      if (Object.entries(target).every(([key, threshold]) => value[key] >= threshold)) {
        // Controlled candidate gate only. The investment and tier effects retain production settlement.
        const id = `upgrade_tier_${nextCandidate.tier}`;
        const result = settlement.applyTransaction(s, { txId: id, dealId: id, day: s.market.day,
          cashDelta: -nextCandidate.investment, itemsIn: [], itemsOut: [], trustDelta: 0, reputationDelta: 0,
          xpDelta: 0, label: `${nextCandidate.name} candidate investment` });
        if (!result.applied) throw new Error('Candidate upgrade failed canonical settlement');
        useGame.setState({ store: growth.applyTierGrants(result.state.store, nextCandidate),
          inventory: result.state.inventory, items: result.state.items, ledger: result.state.ledger });
        mark(`upgrade${nextCandidate.tier}`);
      }
      return;
    }
    const evaluation = growth.evaluateUpgrade(s.store, snap);
    if (evaluation.ready) {
      const tier = evaluation.next.tier;
      s.upgradeStore();
      if (useGame.getState().store.storeTier === tier) mark(`upgrade${tier}`);
    }
  }
  function visit(mode, record) {
    let s = useGame.getState();
    if (!s.queue.length && !s.activeDeal) return;
    record.arrivals++;
    if (!s.activeDeal) s.greetCustomer();
    s = useGame.getState();
    if (!s.activeDeal) return;
    const flow = s.activeDeal.flow;
    record.flows[flow] = (record.flows[flow] ?? 0) + 1;
    if (flow === 'purchase') {
      const demand = s.activeDeal.purchase.demand;
      if (demand.templateId) {
        record.demands.push({ day: s.market.day, templateId: demand.templateId, quantity: demand.quantity });
        const matching = () => useGame.getState().inventory.filter(p => purchase.matchDemand(demand, useGame.getState().items[p.itemId]) === 'exact');
        const have = matching().reduce((n, p) => n + p.quantity, 0);
        const missing = Math.max(0, demand.quantity - have);
        if (missing > 0) {
          const quote = pools.poolSupplyQuote(demand.templateId, missing, s.market, s.store);
          const reserved = hasReserve(mode) ? v5.dailyOperatingCost(s.store) * 7 : 0;
          if (quote && (mode === 'credit-enabled-counter' || s.store.cash - quote.totalPrice >= reserved)) buyStock(demand.templateId, missing, mode);
        }
        s = useGame.getState();
        for (const position of matching()) s.togglePackageItem(position.itemId);
        s = useGame.getState();
        if (s.activeDeal.purchase.fulfilment !== 'none') {
          const price = purchase.recommendedSalePrice(s.activeDeal.purchase);
          s.setStage('negotiate');
          useGame.getState().submitOffer(price);
          s = useGame.getState();
          let line = s.activeDeal.lines[0];
          // Only accept the visible counter if it clears the actual package cost.
          if (line.negotiation.state !== 'ACCEPTED' && line.negotiation.activeCounter >= s.activeDeal.purchase.packageCost) {
            s.negotiationMove({ kind: 'acceptCounter', atRound: line.negotiation.round });
            s = useGame.getState(); line = s.activeDeal.lines[0];
          }
          if (line.negotiation.state === 'ACCEPTED') record.sales++;
          else record.rejectedSales++;
        } else record.unfilled++;
      }
    } else if (flow === 'service') {
      const quote = mixedWork(mode) ? [...s.activeDeal.service.quotes].filter(q => !q.blockedReason && q.netContribution > 0 && q.risk <= .2 && q.partsCost <= s.store.cash)
        .sort((a, b) => a.risk - b.risk || b.netContribution - a.netContribution)[0] : null;
      if (quote) {
        s.selectServiceType(quote.typeId); useGame.getState().selectServiceVenue(quote.venue);
        useGame.getState().setPromiseBuffer(1); useGame.getState().acceptServiceJob();
      } else s.declineServiceJob();
    } else if (flow === 'appraisal' && mixedWork(mode)) {
      for (const tool of ['scale', 'touchstone', 'loupe']) {
        s = useGame.getState();
        if (s.activeCustomer.patience > (tool === 'scale' ? 1 : 3) + 1) s.runTest(tool);
      }
      useGame.getState().setStage('appraise');
      useGame.getState().selectStance('cautious');
      useGame.getState().issueReport();
      const verdict = useGame.getState().activeDeal.appraisal.verdict;
      if (verdict?.paid) record.appraisalPaid++;
      if (verdict?.accurate) record.appraisalAccurate++;
    } else if (flow === 'appraisal') s.declineAppraisal();
    // Retail-specialist policy: acquisitions are declined, no hidden-value oracle.
    useGame.getState().finishDeal();
    useGame.getState().dismissCustomerRecall();
    for (const invoice of [...useGame.getState().store.supplier.openInvoices]) {
      if (invoice.amount <= useGame.getState().store.cash) useGame.getState().repaySupplier(invoice.id);
    }
    measure(record);
    // Toasts are transient UI only; draining them bounds memory without changing economy.
    useGame.setState({ toasts: [] });
  }
  function career(seed, mode) {
    reset(seed);
    const record = { seed, mode, first: {}, flows: {}, arrivals: 0, sales: 0, rejectedSales: 0, unfilled: 0,
      preparedPurchases: 0, appraisalPaid: 0, appraisalAccurate: 0, serviceFailures: 0, demands: [], closeFailed: false, final: null };
    measure(record);
    for (let d = 1; d <= days; d++) {
      let s = useGame.getState();
      operateMorning(record);
      measure(record);
      if (calendar.isShopOpen(s.market.day)) {
        for (let n = 0; n < visits; n++) {
          s = useGame.getState();
          const target = Math.min(balance.DAY.closeMinutes, Math.max(s.market.clockMinutes, s.nextCustomerAtMinutes) + 0.000001);
          s.tick((target - s.market.clockMinutes) / balance.DAY.minutesPerRealSecond);
          if (useGame.getState().dayCloseConfirmOpen) break;
          visit(mode, record);
        }
      }
      s = useGame.getState();
      if (s.activeDeal) throw new Error(`Unfinished visit at day close: ${seed}/${mode}/${d}`);
      s.advanceDay();
      if (useGame.getState().market.day === d) { record.closeFailed = true; break; }
      useGame.getState().startNewDay();
      measure(record);
      useGame.setState({ toasts: [] });
    }
    const s = useGame.getState();
    const expectedCash = balance.START.cash + s.ledger.transactions.reduce((sum, tx) => sum + tx.cashDelta, 0);
    if (Math.abs(expectedCash - s.store.cash) > 0.000001) throw new Error(`Cash invariant failed: ${seed}/${mode}`);
    if (s.store.cash < 0 || new Set(s.ledger.appliedTxIds).size !== s.ledger.appliedTxIds.length) throw new Error(`Atomic/idempotency invariant failed: ${seed}/${mode}`);
    invariantChecks += 3;
    return record;
  }
  const quantile = (values, q) => values.length ? [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * q)] : null;
  const distribution = values => ({ min: quantile(values, 0), p10: quantile(values, .1), p50: quantile(values, .5), p90: quantile(values, .9), max: quantile(values, 1) });
  function summarize(rows) {
    const keys = [...new Set(rows.flatMap(r => Object.keys(r.first)))].sort();
    return {
      careers: rows.length, closeFailed: rows.filter(r => r.closeFailed).length,
      final: Object.fromEntries([...Object.keys(rows[0].final), 'sales', 'arrivals', 'rejectedSales', 'unfilled'].filter(k => k !== 'day').map(key => [key,
        distribution(rows.map(r => r.final[key] ?? r[key]))])),
      first: Object.fromEntries(keys.map(key => {
        const reached = rows.filter(r => r.first[key]);
        return [key, { reached: reached.length, day: distribution(reached.map(r => r.first[key].day)), sales: distribution(reached.map(r => r.first[key].sales)) }];
      })),
      finalUnmetGates: Object.fromEntries(tierRequirements.map(tier => [tier.tier, Object.fromEntries(
        Object.entries({ ...tier.requires, investment: tier.investment }).map(([key, needed]) => [key,
          rows.filter(r => (key === 'investment' ? r.final.cash : r.final[key]) < needed).length]))])),
      policyUnmetGates: Object.fromEntries(tierRequirements.map(tier => [tier.tier, Object.fromEntries(
        Object.entries({ ...tier.requires, ...(candidateMode(rows[0].mode) ? { supplierTrust: candidateTrust[tier.tier - 2] } : {}),
          ...(rows[0].mode === 'cash-consistent-aligned' ? { level: alignedLevels[tier.tier - 2] } : {}), investment: tier.investment }).map(([key, needed]) => [key,
          rows.filter(r => (key === 'investment' ? r.final.cash : r.final[key]) < needed).length]))])),
      flows: rows.reduce((all, r) => { for (const [key, n] of Object.entries(r.flows)) all[key] = (all[key] ?? 0) + n; return all; }, {}),
    };
  }
  if (workers > 1) {
    const batches = await Promise.all(Array.from({ length: Math.min(workers, seeds) }, (_, index) => {
      const begin = Math.floor(seeds * index / workers), end = Math.floor(seeds * (index + 1) / workers);
      return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [process.argv[1], `--seeds=${end - begin}`, `--offset=${offset + begin}`,
          `--days=${days}`, `--visits=${visits}`, `--modes=${modes.join(',')}`, '--raw'], { cwd: process.cwd(), windowsHide: true });
        let stdout = '', stderr = '';
        child.stdout.on('data', chunk => { stdout += chunk; });
        child.stderr.on('data', chunk => { stderr += chunk; });
        child.on('error', reject);
        child.on('close', code => {
          if (code !== 0) { reject(new Error(`Worker ${index} failed: ${stderr}`)); return; }
          try { const result = JSON.parse(stdout); console.error(`Worker ${index + 1}/${workers} complete: ${end - begin} paired seeds`); resolve(result); }
          catch (error) { reject(error); }
        });
      });
    }));
    for (const batch of batches) {
      invariantChecks += batch.invariantChecks;
      for (const mode of modes) records[mode].push(...batch.records[mode]);
      if (JSON.stringify(batch.methodology.hashes) !== JSON.stringify(hashes) || !batch.methodology.sourceFilesUnchangedDuringRun) throw new Error('Source changed between/during workers; rerun a stable snapshot');
    }
  } else for (let n = 0; n < seeds; n++) {
    // Stable multiplicative mapping: 1,000 independent root seeds, not 1,000 visits of one root.
    const seed = (Math.imul(offset + n + 1, 2654435761) ^ 0x1302026) >>> 0;
    for (const mode of modes) records[mode].push(career(seed, mode));
    if ((n + 1) % 25 === 0) console.error(`Progress ${n + 1}/${seeds} paired seeds; ${(performance.now() - start).toFixed(0)} ms`);
  }
  const unchanged = fileNames.every(file => createHash('sha256').update(readFileSync(file)).digest('hex') === hashes[file]);
  const summaries = Object.fromEntries(modes.map(mode => [mode, summarize(records[mode])]));
  const compact = process.argv.includes('--compact');
  const compactFirst = ['level2', 'level3', 'level4', 'level5', 'level6', 'level7', 'level8', 'level9', 'level10',
    'mastery5', 'mastery120', 'upgrade2', 'upgrade3', 'upgrade4', 'tier3.creditOptionalReady', 'tier3.creditOptionalAlignedReady',
    'tier3.creditOptional346Ready', 'tier4.creditOptionalReady', 'tier4.creditOptionalAlignedReady', 'tier4.creditOptional346Ready',
    'tier2.levelOnlyBlock', 'tier3.levelOnlyBlock', 'tier4.levelOnlyBlock', 'tier3.creditOptionalNonLevelReady', 'tier4.creditOptionalNonLevelReady'];
  const compactSummaries = Object.fromEntries(Object.entries(summaries).map(([mode, result]) => [mode, {
    careers: result.careers, closeFailed: result.closeFailed,
    finalP10P50P90: Object.fromEntries(Object.entries(result.final).map(([key, stat]) => [key, [stat.p10, stat.p50, stat.p90]])),
    first: Object.fromEntries(compactFirst.map(key => [key, result.first[key] ? { reached: result.first[key].reached,
      dayP10P50P90: [result.first[key].day.p10, result.first[key].day.p50, result.first[key].day.p90],
      salesP10P50P90: [result.first[key].sales.p10, result.first[key].sales.p50, result.first[key].sales.p90] } : { reached: 0 }])),
    finalUnmetGates: result.finalUnmetGates, policyUnmetGates: result.policyUnmetGates, flows: result.flows,
  }]));
  console.log(JSON.stringify({ methodology: { seeds, days, visits, modes, candidateTrust, alignedLevels,
    note: 'At most visits arrivals per open day; voluntary early close. All policies decline customer acquisitions; mixed/personnel policies accept valid low-risk workshop quotes, deliver ready jobs and issue evidence-based cautious appraisals. Reserve policies prepare only from observed demand with25%cash budget and seven-day running-cost floor. Personnel only hires currently level-eligible staff, pays actual wages and uses real staff/bulk rules. No ads/rewards, offline gains, hidden-value oracle or learned talents. Baselines upgrade via current gates; candidate policies use existing production trust helper and controlled trust58/62/65 gates with canonical investment settlement/grants; aligned variant changes only store gate levels3/5/7. Observer readiness alone is not a counterfactual economy trajectory.',
    hashes, sourceFilesUnchangedDuringRun: unchanged }, xpTotals, invariantChecks, elapsedMs: Math.round(performance.now() - start), policies: compact ? compactSummaries : summaries,
    ...(raw ? { records: Object.fromEntries(Object.entries(records).map(([mode, rows]) => [mode, rows.map(({ demands, ...record }) => record)])) } : {}) }, compact ? null : 2));
} finally { await server.close(); }
