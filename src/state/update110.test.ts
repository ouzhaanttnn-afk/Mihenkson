import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const ads = vi.hoisted(() => ({ showRewardedAd: vi.fn(), showInterstitialAd: vi.fn() }));
vi.mock('@ui/ads', () => ads);
import { useGame } from './gameStore';
import { deserialize, serialize } from './save';
import { rankingWealth, calendarMonth, seasonFor } from '@domain/ranking';
import { normalizePreferences } from '@domain/preferences';
import { clampQuantity } from '@ui/QuantityControl';
import { spawnItem } from '@domain/item-spawn';
import { spawnCustomer } from '@domain/customer-spawn';
import { showcaseDemand } from '@domain/purchase';
import { DAY } from '@domain/balance';
import { LESSONS } from '@domain/onboarding';

const initial = useGame.getState();
beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v), removeItem: (k: string) => data.delete(k) });
  ads.showRewardedAd.mockReset().mockResolvedValue(true);
  ads.showInterstitialAd.mockReset().mockResolvedValue(undefined);
  useGame.setState({ ...initial, profileSetupDone: true, seenLessons: LESSONS.map(l => l.id) }, true);
});
afterEach(() => { useGame.setState(initial, true); vi.unstubAllGlobals(); });

describe('1.1 kayıt ve tercihler', () => {
  it('eski kayıt parasını, stok ve borçlarını değiştirmez', () => {
    const save = serialize(useGame.getState());
    delete save.preferences; delete save.rankingSeason; delete save.weekReports;
    const restored = deserialize(save);
    expect(restored.store).toMatchObject(save.store);
    expect(restored.inventory).toEqual(save.inventory);
    expect(restored.preferences).toMatchObject({ musicEnabled: true, vibrationEnabled: true });
    expect(restored.rankingSeason).toBeNull();
    expect(restored.weekReports).toEqual([]);
  });
  it('müzik kayıt döngüsünü tamamlar', () => {
    useGame.getState().setPreference('musicEnabled', false);
    expect(deserialize(serialize(useGame.getState())).preferences).toMatchObject({ musicEnabled: false });
    expect(normalizePreferences({ theme: 'invalid', musicVolume: Infinity }).musicVolume).toBe(25);
  });
  it('eski tema alanları yeni kayda taşınmaz', () => {
    const preferences = normalizePreferences({ theme: 'light', themeVersion: 1 });
    expect(preferences).not.toHaveProperty('theme');
    expect(preferences).not.toHaveProperty('themeVersion');
  });
});

describe('HAS net servet ve gerçek takvim', () => {
  it('bir milyon / 4000 = 250g; borç kasayı artırsa da serveti artırmaz', () => {
    const s = useGame.getState();
    const state = { ...s, market: { ...s.market, goldSpot: 4000 }, store: { ...s.store, cash: 1_000_000 }, inventory: [] };
    const first = rankingWealth(state);
    expect(first.grams).toBe(250); expect(first.score).toBe(250000);
    const borrower = { ...state, store: { ...state.store, cash: 1_100_000 }, network: [
      { ...s.network[0]!, loan: { id:'loan', memberId:'m', principal:100000, totalDue:100000, dueDay:2, takenDay:1 } },
    ] };
    expect(rankingWealth(borrower).grams).toBe(250);
  });
  it('nakitten alınan stok değerini yok saymaz; HAS iki kez sayılmaz', () => {
    const before = rankingWealth(useGame.getState());
    useGame.getState().buyPoolStock('quarter_gold', 2);
    const after = rankingWealth(useGame.getState());
    expect(after.stock).toBeGreaterThan(0);
    expect(after.grams).toBeGreaterThan(before.grams * .95);
    const s = useGame.getState();
    expect(rankingWealth({ ...s, store: { ...s.store, hasBalanceMg:10000 } }).grams - after.grams).toBeCloseTo(10);
  });
  it('tedarikçi ve vadeli borçlar da düşülür', () => {
    const s = useGame.getState();
    const before = rankingWealth(s);
    const after = rankingWealth({ ...s, store: { ...s.store, payables:[{id:'p',amount:5000,dueDay:5,label:'debt'}] } });
    expect(before.netWorth - after.netWorth).toBe(5000);
  });
  it.each(['2028-02-29T23:59:59Z','2026-01-31T23:59:59Z','2026-04-30T23:59:59Z'])('takvim ayının son gününde kaymaz: %s', date => {
    expect(calendarMonth(new Date(date))).toBe(date.slice(0,7));
  });
  it('ay değişiminde yeni başlangıç alır; aynı ayda eski başlangıç korunur', () => {
    const previous = { month:'2028-02', openingGrams:250 };
    expect(seasonFor(previous,350,new Date('2028-02-29T23:59:59Z'))).toBe(previous);
    expect(seasonFor(previous,350,new Date('2028-03-01T00:00:00Z'))).toEqual({month:'2028-03',openingGrams:350});
  });
});

function failedGuest() {
  const s = useGame.getState();
  for(let i=0;i<150;i++) {
    const guest = spawnCustomer(s.seed,i,s.market,s.store,s.dayCharacter,undefined,{inventory:[],items:{}});
    if(guest.customer.intent!=='sell' || guest.items.length!==1) continue;
    useGame.setState({ queue:[guest] });
    useGame.getState().greetCustomer();
    useGame.getState().setStage('appraise');
    useGame.getState().setStage('negotiate');
    const deal=useGame.getState().activeDeal!;
    useGame.getState().negotiationMove({ kind:'reject',atRound:deal.lines[0]!.negotiation.round });
    useGame.getState().finishDeal();
    return;
  }
  throw new Error('fixture customer missing');
}

describe('tek ziyaret geri çağırma', () => {
  it('satış müşterisinin sabit paketi geri gelir ve tek başarılı kayıt oluşur', async () => {
    const raw = spawnItem(initial.seed, 1, 'bracelet_22k_thin');
    const item = { ...raw, id:'recall-bracelet', buyCost:30000, acquiredDay:1, location:'display' as const,
      truth:{...raw.truth,hiddenFlaws:[]} };
    useGame.setState({items:{[item.id]:item},inventory:[{itemId:item.id,quantity:1,costBasis:30000,currentValue:30000,
      age:2,demand:'steady',location:'display',thesis:null,expectedExitValues:{}}]});
    const s = useGame.getState();
    const spawned = spawnCustomer(s.seed, 3, s.market, s.store, s.dayCharacter, undefined, {inventory:s.inventory,items:s.items});
    useGame.setState({queue:[{...spawned,customer:{...spawned.customer,intent:'buy',demand:showcaseDemand(item)},items:[]}]});
    useGame.getState().greetCustomer();
    useGame.getState().togglePackageItem(item.id);
    useGame.getState().setStage('negotiate');
    const original = useGame.getState().activeDeal!;
    expect(original.purchase?.lines.length).toBeGreaterThan(0);
    useGame.getState().negotiationMove({kind:'reject',atRound:original.lines[0]!.negotiation.round});
    useGame.getState().finishDeal();
    expect(useGame.getState().recallableGuest?.deal?.dealId).toBe(original.dealId);
    await useGame.getState().requestCustomerRecall();
    expect(useGame.getState().activeDeal?.purchase).toEqual(original.purchase);
    useGame.getState().togglePackageItem(item.id);
    expect(useGame.getState().activeDeal?.purchase).toEqual(original.purchase);
    useGame.getState().submitOffer(1);
    expect(useGame.getState().activeDeal?.lines[0]?.negotiation.state).toBe('ACCEPTED');
    useGame.getState().finishDeal();
    const after = useGame.getState();
    expect(after.recallableGuest).toBeNull();
    expect(after.customers[spawned.customer.id]!.visits).toBe(1);
    expect(after.ledger.deals.filter(d=>d.dealId===original.dealId+'_pkg')).toHaveLength(1);
  });

  it('aynı kimlik, bütçe, ürün, miktar, işlem ve spawn sayacını korur', async () => {
    failedGuest();
    const before=useGame.getState(); const guest=before.recallableGuest!;
    expect(guest.deal).toBeTruthy();
    await before.requestCustomerRecall();
    const after=useGame.getState();
    expect(after.spawnCounter).toBe(before.spawnCounter);
    expect(after.activeCustomer?.id).toBe(guest.customer.id);
    expect(after.activeCustomer?.budget).toBe(guest.customer.budget);
    expect(after.activeCustomer?.reservationPrice).toBe(guest.customer.reservationPrice);
    expect(after.activeDeal?.dealId).toBe(guest.deal?.dealId);
    expect(after.activeDeal?.lines.map(l=>l.itemId)).toEqual(guest.deal?.lines.map(l=>l.itemId));
    expect(after.customers[guest.customer.id]!.visits).toBe(0);
    // Save/reload cannot recover a second recall.
    useGame.setState(deserialize(serialize(after)));
    const deal=useGame.getState().activeDeal!;
    useGame.getState().negotiationMove({kind:'reject',atRound:deal.lines[0]!.negotiation.round});
    useGame.getState().finishDeal();
    expect(useGame.getState().recallableGuest).toBeNull();
    expect(useGame.getState().customers[guest.customer.id]!.visits).toBe(1);
    await useGame.getState().requestCustomerRecall();
    expect(ads.showRewardedAd).toHaveBeenCalledTimes(1);
  });
  it('reklam tamamlanmayınca müşteri ve para gelmez; vazgeçiş bir ziyaret yazar', async () => {
    failedGuest(); const s=useGame.getState();
    ads.showRewardedAd.mockResolvedValue(false);
    await s.requestCustomerRecall();
    expect(useGame.getState().activeCustomer).toBeNull();
    expect(useGame.getState().store.cash).toBe(s.store.cash);
    const id=s.recallableGuest!.customer.id;
    useGame.getState().dismissCustomerRecall();
    expect(useGame.getState().customers[id]!.visits).toBe(1);
  });
});

describe('zaman ve fırsat ödülleri', () => {
  it('haftalık rapor kayıtla korunur ve yeni haftada temiz birikim başlar', () => {
    useGame.getState().advanceDay();
    expect(useGame.getState().weekReports.map(r=>r.day)).toEqual([1]);
    useGame.getState().advanceDay();
    expect(useGame.getState().weekReports).toHaveLength(1);
    const restored = deserialize(serialize(useGame.getState()));
    expect(restored.weekReports.map(r=>r.day)).toEqual([1]);
    useGame.getState().startNewDay();
    useGame.setState({market:{...useGame.getState().market,day:8}});
    useGame.getState().advanceDay();
    expect(useGame.getState().weekReports.map(r=>r.day)).toEqual([8]);
  });

  it('4x saati ve müşteri cooldownunu dört kat ilerletir', () => {
    const start=useGame.getState();
    useGame.setState({speed:4,nextCustomerAtMinutes:start.market.clockMinutes+6});
    useGame.getState().tick(1);
    expect(useGame.getState().market.clockMinutes-start.market.clockMinutes).toBeCloseTo(DAY.minutesPerRealSecond*4);
    expect(useGame.getState().spawnCounter).toBe(start.spawnCounter+1);
  });
  it('aktif kararda 4x bile süre tüketmez', () => {
    failedGuest(); useGame.setState({speed:4});
    const before=useGame.getState().market.clockMinutes;
    useGame.getState().tick(30);
    expect(useGame.getState().market.clockMinutes).toBe(before);
  });
  it('eski sponsor girişi artık para değil müşteri fırsatı verir', async () => {
    const before=useGame.getState();
    await before.requestSponsorReward();
    expect(useGame.getState().store.cash).toBe(before.store.cash);
    expect(useGame.getState().customerRushUntilMinutes).toBe(before.market.clockMinutes+90);
    expect(useGame.getState().nextCustomerAtMinutes).toBeLessThanOrEqual(before.market.clockMinutes+3);
  });
  it('gram miktarında NaN, kesir ve maksimum güvenlidir', () => {
    expect(clampQuantity(NaN,.001,3,.1)).toBe(.001);
    expect(clampQuantity(100,.001,3.125,.1)).toBe(3.125);
    expect(clampQuantity(3.125,.001,3.125,.1)).toBe(3.125);
    expect(clampQuantity(2.31,.001,3,.1)).toBe(2.3);
  });
});
