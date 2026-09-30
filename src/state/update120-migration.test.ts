import { describe, expect, it } from 'vitest';
import { createRecord } from '@domain/customer-memory';
import { spawnItem } from '@domain/item-spawn';
import { createMarketForDay } from '@domain/market';
import { createSession } from '@domain/negotiation';
import { advanceJobsOneDay, applyServiceToItem, createServiceSession, resolveDelivery } from '@domain/service';
import { applyTransaction, createLedger, summarizeWealth } from '@domain/settlement';
import { stockUsage } from '@domain/stock-capacity';
import type { ActiveDeal, Customer, CustomerDemand, DealRecord, InventoryPosition, ItemInstance, PersonnelRole, ServiceJob } from '@domain/types';
import { useGame } from './gameStore';
import { deserialize, migrate, SAVE_VERSION, serialize, type SaveFile } from './save';

const migrationId = 'migration_1_2_0_silver';

function legacySave(): SaveFile {
  const file = structuredClone(serialize(useGame.getState()));
  file.version = 3;
  file.seed = 456;
  file.day = 5;
  file.clockMinutes = 600;
  file.market = { ...createMarketForDay(file.seed, file.day), clockMinutes: file.clockMinutes };
  file.store = { ...file.store, cash: 250_000, hasBalanceMg: 0, hasCostBasis: 0,
    level: 4, xp: 120, reputation: 61, displaySlots: 8, backStockSlots: 16,
    personnelCount: 2, personnelRoles: undefined, personnelElapsedSeconds: undefined,
    supplier: { ...file.store.supplier, openInvoices: [{ id: 'old-invoice', amount: 9_000, dueDay: 7 }] },
    payables: [{ id: 'old-payable', amount: 3_000, dueDay: 8, label: 'Old payable' }] };
  file.inventory = [];
  file.items = {};
  file.ledger = { ...createLedger(), realizedProfitToday: 750, realizedProfitTotal: 12_000 };
  file.jobs = [];
  file.queue = [];
  file.activeCustomer = null;
  file.activeDeal = null;
  file.recallableGuest = null;
  file.customerMessage = '';
  return file;
}

function item(id: string, templateId = 'silver_ring', location: ItemInstance['location'] = 'backStock'): ItemInstance {
  return { ...spawnItem(456, 3, templateId), id, location, buyCost: 10_000, acquiredDay: 2 };
}

function own(file: SaveFile, asset: ItemInstance, costBasis: number, currentValue: number, quantity = 1) {
  file.items[asset.id] = asset;
  const position: InventoryPosition = { itemId: asset.id, quantity, costBasis, currentValue,
    age: 28, demand: 'cold', thesis: 'retail', location: asset.location === 'display' ? 'display' : 'backStock', expectedExitValues: {} };
  file.inventory.push(position);
  return position;
}

function customer(id: string, intent: Customer['intent'] = 'sell', demand: CustomerDemand | null = null): Customer {
  return { id, displayName: 'Eski müşteri', archetype: 'giftBuyer', intent,
    patienceMax: 4, patience: 3, knowledge: 30, urgency: 50, priceSensitivity: 50,
    status: 40, budget: 30_000, reservationPrice: 10_000, purchaseCeilingRatio: 1.1,
    demand, trust: 70, suspicion: 0, preferences: ['silver'], referralSource: null,
    visitHistory: [{ day: 2, dealId: 'old-visit', outcome: 'accepted', trustDelta: 3, note: 'Eski işlem' }], lineIds: [] };
}

function deal(visitor: Customer, assets: ItemInstance[]): ActiveDeal {
  const lines = assets.map(asset => ({ lineId: `line-${asset.id}`, itemId: asset.id,
    knowledge: [], testResults: [], band: null, thesisOptions: [], selectedThesis: null,
    negotiation: createSession(`line-${asset.id}`, asset.id), status: 'untouched' as const }));
  return { dealId: `deal-${visitor.id}`, customerId: visitor.id,
    flow: visitor.intent === 'service' ? 'service' : visitor.intent === 'buy' ? 'purchase' : visitor.intent === 'appraisal' ? 'appraisal' : 'trade',
    stage: visitor.intent === 'service' ? 'diagnose' : 'inspect', activeLineId: lines[0]?.lineId ?? '',
    lines, service: visitor.intent === 'service' ? createServiceSession() : null,
    purchase: null, appraisal: null, startedAtSec: 420, settled: false };
}

function silverDemand(): CustomerDemand {
  return { families: ['silver'], wantsBullion: false, templateId: 'silver_ring',
    quantity: 1, minQuantity: 1, acceptsPartial: false, isBulk: false,
    summary: 'Gümüş Yüzük', alternativesLabel: '' };
}

function serviceJob(asset: ItemInstance, result: ServiceJob['result'] = 'pending'): ServiceJob {
  return { jobId: `job-${asset.id}`, type: 'clean', itemId: asset.id, customerId: 'service-customer',
    customerName: 'Eski servis müşterisi', itemName: asset.displayName,
    duration: 2, remainingDays: result === 'pending' ? 1 : 0, risk: .1, partsCost: 100,
    assignedStaff: null, venue: 'inHouse', outsourceCost: 0, promisedDay: 6, expectedDay: 6,
    fee: 500, predeterminedOutcome: 'success', result, compensation: 200, acceptedDay: 4 };
}

function oldDeal(asset: ItemInstance): DealRecord {
  return { dealId: 'historical-silver-purchase', customerId: 'old-customer', lineIds: ['old-line'],
    itemIds: [asset.id], side: 'buy', day: 2, clockMinutes: 650, testsUsed: ['loupe'],
    estimateBand: { min: 8_000, max: 11_000 }, confidence: 'medium', actualValue: 9_000,
    offerHistory: [8_000, 10_000], finalState: 'ACCEPTED', movesUsed: ['offer'],
    thesisAtDeal: 'retail', price: 10_000, costBasis: 10_000, units: 1,
    grams: asset.truth.grossWeight, channel: null, isBulk: false, realizedProfit: null,
    trustDelta: 3, reputationDelta: 1, reviewData: { missedSignals: [], keyDecisionPoint: 'Eski alım', alternativeChannelNote: '' } };
}

describe('1.2.0 silver stock migration', () => {
  it('refunds each entire position at the greater saved cost/value and preserves unrelated progress', () => {
    const file = legacySave();
    const silverA = item('silver-loss');
    const silverB = item('silver-gain', 'silver_chain');
    const gold = item('gold-held', 'ring_18k', 'display');
    own(file, silverA, 10_000, 7_000);
    own(file, silverB, 8_000, 12_000, 2);
    const goldPosition = own(file, gold, 20_000, 24_000);
    file.profile = { jewelerName: 'Test Usta', avatarId: 'male-07' };
    file.playerMarket = { owned: ['frame_telkari'], equipped: { profileFrame: 'frame_telkari' } };
    const before = structuredClone(file);
    const migrated = migrate(file);

    expect(migrated.version).toBe(SAVE_VERSION);
    expect(migrated.store.cash).toBe(272_000);
    expect(migrated.inventory).toEqual([goldPosition]);
    expect(migrated.items[gold.id]).toEqual(gold);
    expect(migrated.items[silverA.id]).toMatchObject({ id: silverA.id, templateId: 'silver_ring', location: 'sold' });
    expect(migrated.items[silverB.id]?.truth).toEqual(silverB.truth);
    expect(migrated.store).toMatchObject({ level: 4, xp: 120, reputation: 61,
      supplier: before.store.supplier, payables: before.store.payables });
    expect(migrated.profile).toEqual(file.profile);
    expect(migrated.playerMarket).toEqual(file.playerMarket);
    expect(summarizeWealth(migrated).netWorth).toBeGreaterThanOrEqual(summarizeWealth(before).netWorth);
    expect(file).toEqual(before);
    expect(migrated.ledger.transactions.at(-1)).toMatchObject({ txId: migrationId, cashDelta: 22_000,
      itemsIn: [], itemsOut: [{ itemId: silverA.id, quantity: 1 }, { itemId: silverB.id, quantity: 2 }],
      xpDelta: 0, trustDelta: 0, reputationDelta: 0 });
    expect(migrated.ledger.realizedProfitToday).toBe(750);
    expect(migrated.ledger.realizedProfitTotal).toBe(12_000);
  });

  it('applies the refund only once across repeated migrations and save/load round trips', () => {
    const file = legacySave();
    own(file, item('old-silver'), 10_000, 8_000);
    const once = migrate(file);
    expect(migrate(once)).toEqual(once);
    const restored = deserialize(JSON.parse(JSON.stringify(once)));
    const checkpoint = serialize({ ...useGame.getState(), ...restored });
    const twice = deserialize(checkpoint);
    expect(twice.store.cash).toBe(260_000);
    expect(twice.ledger.appliedTxIds.filter(id => id === migrationId)).toHaveLength(1);
    expect(twice.ledger.transactions.filter(tx => tx.txId === migrationId)).toHaveLength(1);
    expect(twice.inventory).toEqual([]);
    expect(twice.ledger.realizedProfitTotal).toBe(12_000);
  });

  it('keeps transaction/deal/customer history readable without creating a trade sale', () => {
    const file = legacySave();
    const silver = item('historical-silver');
    own(file, silver, 10_000, 8_000);
    const visitor = customer('old-customer');
    file.customers = { [visitor.id]: { ...createRecord(visitor, 2, 10), visits: 3,
      lifetimeVolume: 50_000, history: visitor.visitHistory } };
    file.ledger.appliedTxIds = ['historical-purchase'];
    file.ledger.transactions = [{ txId: 'historical-purchase', dealId: 'historical-silver-purchase',
      day: 2, cashDelta: -10_000, itemsIn: [silver], itemsOut: [], trustDelta: 3,
      reputationDelta: 1, xpDelta: 10, label: 'Eski gümüş alımı' }];
    file.ledger.deals = [oldDeal(silver)];
    const historical = structuredClone(file.ledger);
    const migrated = migrate(file);
    expect(migrated.ledger.transactions.slice(0, -1)).toEqual(historical.transactions);
    expect(migrated.ledger.appliedTxIds).toEqual(['historical-purchase', migrationId]);
    expect(migrated.ledger.deals).toEqual(historical.deals);
    expect(migrated.customers).toEqual(file.customers);
    expect(migrated.items[silver.id]?.truth).toEqual(silver.truth);
  });

  it('preserves remaining gold overflow and capacity while refunds remove only silver ownership', () => {
    const file = legacySave();
    for (let index = 0; index < 17; index++) own(file, item(`gold-${index}`, 'ring_18k'), 20_000, 24_000);
    own(file, item('old-silver'), 10_000, 7_000);
    const migrated = migrate(file);
    expect(stockUsage(migrated.inventory).backStock).toBe(17);
    expect(migrated.store.backStockSlots).toBe(16);
    expect(migrated.inventory.reduce((sum, position) => sum + position.costBasis, 0)).toBe(340_000);
    expect(migrated.store.cash).toBe(260_000);
    expect(migrated.store.supplier).toEqual(file.store.supplier);
  });

  it('does not refund unowned customer silver in pending or ready service jobs', () => {
    const file = legacySave();
    const pending = item('pending-silver', 'silver_ring', 'workshop');
    const ready = item('ready-silver', 'silver_chain', 'workshop');
    const delivered = item('delivered-silver', 'silver_object', 'customer');
    file.items = { [pending.id]: pending, [ready.id]: ready, [delivered.id]: delivered };
    file.jobs = [serviceJob(pending), serviceJob(ready, 'success'), serviceJob(delivered, 'delivered')];
    const migrated = migrate(file);
    expect(migrated.store.cash).toBe(file.store.cash);
    expect(migrated.ledger.appliedTxIds).not.toContain(migrationId);
    expect(migrated.jobs).toEqual(file.jobs);
    expect(migrated.items).toEqual(file.items);
    const advanced = advanceJobsOneDay(migrated.jobs);
    expect(advanced[0]?.result).toBe('success');
    const delivery = resolveDelivery(advanced[0]!, migrated.items[pending.id]!, 6);
    expect(delivery.succeeded).toBe(true);
    expect(delivery.cashDelta).toBe(500);
    expect(applyServiceToItem(migrated.items[pending.id]!, advanced[0]!).metal).toBe('silver');
    const outcome = applyTransaction(migrated, { txId: 'old-service-delivery', dealId: advanced[0]!.jobId,
      day: 6, cashDelta: delivery.cashDelta, itemsIn: [], itemsOut: [],
      trustDelta: delivery.trustDelta, reputationDelta: delivery.reputationDelta, xpDelta: 10, label: 'Old service delivery' });
    expect(outcome.applied).toBe(true);
    expect(outcome.state.store.cash).toBe(file.store.cash + 500);
  });

  it.each(['sell', 'appraisal'] as const)('retires an open %s silver visit without refunding customer items', intent => {
    const file = legacySave();
    const silver = item('customer-silver', 'silver_ring', 'customer');
    const visitor = customer('active-silver', intent);
    file.items[silver.id] = silver;
    file.activeCustomer = visitor;
    file.activeDeal = deal(visitor, [silver]);
    file.customerMessage = 'Eski gümüş ziyareti';
    const migrated = migrate(file);
    expect(migrated.activeCustomer).toBeNull();
    expect(migrated.activeDeal).toBeNull();
    expect(migrated.customerMessage).toBe('');
    expect(migrated.store.cash).toBe(file.store.cash);
    expect(migrated.ledger).toEqual(file.ledger);
  });

  it('preserves an active silver service session and its saved offer/job identifiers', () => {
    const file = legacySave();
    const silver = item('service-silver', 'silver_ring', 'workshop');
    const visitor = customer('active-service', 'service');
    file.items[silver.id] = silver;
    file.activeCustomer = visitor;
    file.activeDeal = deal(visitor, [silver]);
    file.activeDeal.service = { ...createServiceSession(), outcome: 'accepted', createdJobId: 'old-service-job' };
    file.customerMessage = 'Teslim sözünüzü aldım';
    const migrated = migrate(file);
    expect(migrated.activeCustomer).toEqual(visitor);
    expect(migrated.activeDeal).toEqual(file.activeDeal);
    expect(migrated.customerMessage).toBe(file.customerMessage);
    expect(migrated.store.cash).toBe(file.store.cash);
  });

  it('retires silver queue/recall visits while preserving gold visitors and spawn timing', () => {
    const file = legacySave();
    const silver = item('queued-silver', 'silver_ring', 'customer');
    const gold = item('queued-gold', 'ring_18k', 'customer');
    const silverVisitor = customer('queued-silver-customer');
    const goldVisitor = customer('queued-gold-customer');
    file.queue = [{ customer: silverVisitor, items: [silver] }, { customer: goldVisitor, items: [gold] }];
    file.recallableGuest = { customer: silverVisitor, items: [silver], deal: deal(silverVisitor, [silver]) };
    file.nextCustomerAtMinutes = 650;
    file.spawnCounter = 120;
    const migrated = migrate(file);
    expect(migrated.queue).toEqual([{ customer: goldVisitor, items: [gold] }]);
    expect(migrated.recallableGuest).toBeNull();
    expect(migrated.nextCustomerAtMinutes).toBe(650);
    expect(migrated.spawnCounter).toBe(120);
    expect(migrated.missedGuestCountToday).toBe(file.missedGuestCountToday);
  });

  it('retires demand-only silver buyers in active, queued and recalled visits', () => {
    const file = legacySave();
    const visitor = customer('old-silver-buyer', 'buy', silverDemand());
    file.activeCustomer = visitor;
    file.activeDeal = deal(visitor, []);
    file.customerMessage = 'Gümüş yüzük arıyorum';
    file.queue = [{ customer: visitor, items: [] }];
    file.recallableGuest = { customer: visitor, items: [], deal: deal(visitor, []) };
    const migrated = migrate(file);
    expect(migrated.activeCustomer).toBeNull();
    expect(migrated.activeDeal).toBeNull();
    expect(migrated.queue).toEqual([]);
    expect(migrated.recallableGuest).toBeNull();
    expect(migrated.store.cash).toBe(file.store.cash);
  });
});

describe('1.2.0 saved personnel roles', () => {
  it('defaults existing staff to idle without granting a hire or automatic role', () => {
    const file = legacySave();
    const migrated = migrate(file);
    expect(migrated.store.personnelCount).toBe(2);
    expect(migrated.store.personnelRoles).toEqual(['idle', 'idle']);
    expect(migrated.store.personnelElapsedSeconds).toBe(0);
    expect(migrated.store.cash).toBe(file.store.cash);
  });

  it('preserves valid roles, clamps the saved timer, and ignores assignments beyond staff count', () => {
    const file = legacySave();
    file.store.personnelRoles = ['reception', 'workshop', 'sales'];
    file.store.personnelElapsedSeconds = 150;
    const migrated = migrate(file);
    expect(migrated.store.personnelRoles).toEqual(['reception', 'workshop']);
    expect(migrated.store.personnelElapsedSeconds).toBe(90);
    expect(migrate(migrated)).toEqual(migrated);
  });

  it('replaces invalid or missing roles with idle and gives no roles to missing staff', () => {
    const file = legacySave();
    file.store.personnelCount = 3;
    file.store.personnelRoles = ['sales', 'unsupported-role' as PersonnelRole];
    expect(migrate(file).store.personnelRoles).toEqual(['sales', 'idle', 'idle']);
    file.store.personnelCount = undefined;
    expect(migrate(file).store.personnelRoles).toEqual([]);
    expect(migrate(file).store.personnelCount).toBe(0);
  });

  it.each([[-30, 0], [NaN, 0], [Infinity, 0], [45, 45], [120, 90]])('normalizes saved elapsed time %s to %s', (saved, expected) => {
    const file = legacySave();
    file.store.personnelElapsedSeconds = saved;
    expect(migrate(file).store.personnelElapsedSeconds).toBe(expected);
  });
});
