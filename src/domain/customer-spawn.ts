/**
 * MIHENKAYNAK — Müşteri üretimi
 * Kaynak: GDD 9 "Müşteri Simülasyonu", 9.3 "Spawn anında sabitlenenler".
 *
 * DEĞİŞMEZ (GDD 34.2): "Müşteri rezervasyon fiyatı spawn anında sabitlenir."
 * Rezervasyon fiyatı ürünün *gerçek* değerinden ve arketipin oranından türer;
 * oyuncunun bilgi durumundan bağımsızdır. Oyuncu çok test yapsa da az yapsa da
 * müşterinin kabul sınırı aynıdır — testler yalnız oyuncunun bilgisini artırır.
 */

import { ARCHETYPES, FIRST_NAMES_F, FIRST_NAMES_M, HONORIFIC_F, HONORIFIC_M, getArchetype } from '@data/archetypes';
import { PURCHASE } from './balance';
import { rollIntent, type DayCharacter } from './intent';
import { applyBulkProfile, spawnDemand, showcaseStock, showcaseDemand, SHOWCASE_TARGET_CHANCE } from './purchase';
import { dailyPurchaseMix, roundMoney } from './v5-rules';
import { customerPriceBand } from './customer-pricing';
import type { InventoryPosition } from './types';
import {
  applyMemory,
  pickReturningCustomer,
  type CustomerRecord,
  type CustomerRegistry,
} from './customer-memory';
import { bullionMeta } from '@data/bullion';
import { rulesFor } from '@data/product-classes';
import { templatesForTier } from './item-spawn';
import { spawnItem } from './item-spawn';
import { trueValue } from './valuation';
import { Rng, deriveSeed, makeId } from './rng';
import type {
  ArchetypeId,
  Customer,
  CustomerDemand,
  ItemInstance,
  MarketState,
  StoreState,
} from './types';
import { defaultSkillProgress, startingPatience, type SkillProgress } from './skill-tree';

export interface SpawnedCustomer {
  customer: Customer;
  items: ItemInstance[];
  /** §3 telemetrisi: bu niyet sabit tabandan mı, dinamik havuzdan mı geldi. */
  fromDynamicPool: boolean;
  /** GDD 10 — bu bir tekrar ziyaretse ilgili kalıcı kayıt. */
  returningRecord: CustomerRecord | null;
}

/**
 * Bir müşteri ve getirdiği kalemleri deterministik olarak üretir.
 *
 * @param spawnIndex Oyun boyunca artan sayaç. (rootSeed, spawnIndex) ikilisi
 *                   müşteriyi tamamen belirler — reload reroll üretmez.
 */
export function spawnCustomer(
  rootSeed: number,
  spawnIndex: number,
  market: MarketState,
  store: StoreState,
  character: DayCharacter,
  /** GDD 10 — tanıdık müşteri defteri. Boşsa herkes yabancıdır. */
  registry: CustomerRegistry = {},
  stock?: { inventory: InventoryPosition[]; items: Record<string, ItemInstance> },
  skills: SkillProgress = defaultSkillProgress(),
): SpawnedCustomer {
  const rng = new Rng(deriveSeed(rootSeed, 'customer', spawnIndex));

  const archetypeId = pickArchetype(rng, store, market);
  const archetype = getArchetype(archetypeId);

  // --- Kimlik ---
  const isFemale = rng.chance(0.55);
  const firstName = isFemale ? rng.pick(FIRST_NAMES_F) : rng.pick(FIRST_NAMES_M);
  const displayName = `${firstName} ${isFemale ? HONORIFIC_F : HONORIFIC_M}`;

  // --- Niyet (Ekonomi Ara Düzeltmesi §3) ---
  //
  // Dağılım artık burada elle ağırlıklandırılmaz; §3'ün iki katmanlı havuzu
  // intent.ts'te yaşar: %38 sabit alış tabanı + %38 sabit satış tabanı +
  // %24 kontrollü dinamik havuz.
  //
  // GDD 23.23'ün beş akışından uygulananlar:
  //   sell      → İncele → Değerle → Tez → Pazarlık        ✔
  //   service   → Tanıla → Süre/Risk/Fiyat → Söz → Kuyruk  ✔
  //   buy       → Stok seçimi → Değer/Paket → Pazarlık     ✔
  //   appraisal → İncele → Test → Rapor/Ücret → Sonuç      ✔
  const { intent, fromDynamicPool } = rollIntent(rootSeed, spawnIndex, character);

  // --- Talep: yalnız alış intentinde. Ürünü müşteri getirmez, oyuncu
  //     stoktan seçer (GDD 23.23). ---
  let demand: CustomerDemand | null =
    intent === 'buy'
      ? spawnDemand(rootSeed, spawnIndex, archetypeId, character, store.storeTier, store, market)
      : null;
  if (demand && stock) {
    const display = showcaseStock(stock.inventory, stock.items);
    const showcaseRng = new Rng(deriveSeed(rootSeed, 'customer/showcase', spawnIndex));
    if (display.length && showcaseRng.chance(SHOWCASE_TARGET_CHANCE)) demand = { ...showcaseDemand(stock.items[showcaseRng.pick(display).itemId]!), fallbackDemand: demand };
  }

  // --- Kalem sayısı: çoklu ürün orta oyunda açılır (GDD 12) ---
  const multiChance = store.level >= 3 ? 0.26 : store.level >= 2 ? 0.12 : 0;
  const lineCount = intent === 'sell' && rng.chance(multiChance) ? rng.int(2, 3) : 1;

  // --- Ürünler ---
  const items: ItemInstance[] = [];
  const pool = templatesForTier(store.storeTier).filter(
    (t) =>
      archetype.preferredFamilies.includes(t.family) ||
      // Arketip tercihi dışında da ürün gelebilir; havuz tek renk olmasın.
      rng.chance(0.25),
  );
  const basePool = pool.length > 0 ? pool : templatesForTier(store.storeTier);

  // §3 ürün sınıfı filtresi — servis niyetli müşteri, atölye işi ALMAYAN
  // ürünle gelemez. Standart sarrafiyenin (gram altın, çeyrek, yarım, tam,
  // Ata, külçe) servis listesi boştur; havuzda bırakılsaydı müşteri
  // "Tanıla" ekranına gelir ve uygulanabilir tek bir iş bulunmazdı.
  const serviceablePool = basePool.filter((t) => rulesFor(t).services.length > 0);

  // Ekspertizde de aynı mantık: standart sarrafiyenin ekspertizi yoktur.
  // Gram altının ağırlığı ve ayarı tanımında sabittir — band sıfır genişlikte
  // çıkar, rapor her koşulda tutar ve ücret bedava para olurdu. GDD 23.23'ün
  // ekspertizi BELİRSİZ ürün içindir; belirsizliği olmayan üründe iş yoktur.
  const appraisablePool = basePool.filter((t) => t.family !== 'bullion');

  let usablePool =
    intent === 'service' && serviceablePool.length > 0
      ? serviceablePool
      : intent === 'appraisal' && appraisablePool.length > 0
        ? appraisablePool
        : basePool;
  if (intent === 'sell') {
    const mixRng = new Rng(deriveSeed(rootSeed, 'customer/purchaseMix', spawnIndex));
    const bullion = mixRng.chance(dailyPurchaseMix(rootSeed, market.day).bullion);
    const selected = basePool.filter(t => !!bullionMeta(t.id) === bullion);
    const fallback = templatesForTier(store.storeTier).filter(t => !!bullionMeta(t.id) === bullion);
    usablePool = selected.length ? selected : fallback.length ? fallback : basePool;
  }

  // Alış intentinde müşteri elinde ürünle gelmez.
  if (intent !== 'buy') {
    for (let i = 0; i < lineCount; i++) {
      const template = rng.pick(usablePool);
      items.push(spawnItem(rootSeed, spawnIndex * 10 + i, template.id));
    }
  }

  // --- Davranış parametreleri (GDD 9.1) ---
  const patienceMax = startingPatience(Math.round(rng.band(archetype.patienceBand)), skills);
  const knowledge = Math.round(rng.band(archetype.knowledgeBand));
  // §3: dinamik havuz "müşteri kalitesi, aciliyet" gibi nitelikleri etkiler —
  // niyet payını DEĞİL. Eğim bu yüzden davranışa uygulanır, dağılıma değil.
  const urgency = clamp(
    Math.round(rng.band(archetype.urgencyBand) + character.urgencyTilt * 8),
    0,
    100,
  );
  const priceSensitivity = Math.round(rng.band(archetype.priceSensitivityBand));
  const status = Math.round(rng.band(archetype.statusBand));

  // --- Rezervasyon fiyatı: SPAWN ANINDA SABİT (GDD 9.3 / 34.2) ---
  // Müşterinin satarken kabul edeceği en düşük fiyat. Ürünün gerçek değerine
  // ve arketipin oranına dayanır; bilgi seviyesi oranı yukarı çeker.
  const fairTotal = items.reduce((sum, item) => sum + trueValue(item, market), 0);
  const baseRatio = rng.band(archetype.reservationRatioBand);
  const knowledgeAdjust = ((knowledge - 50) / 50) * 0.05; // ±5 puan
  const urgencyAdjust = -((urgency - 50) / 50) * 0.04; // Acil müşteri daha düşüğe razı
  const reservationRatio = clamp(baseRatio + knowledgeAdjust + urgencyAdjust, 0.7, 1.08);
  const reservationPrice = roundMoney(items.reduce((sum, item) => {
    const band = customerPriceBand(item, market, 'shopBuys');
    // Reuse the existing personality-derived reservation ratio, no new random roll.
    return sum + (band ? Math.max(band.min, Math.min(band.max, trueValue(item, market) * reservationRatio)) : trueValue(item, market) * reservationRatio);
  }, 0));

  // --- Bütçe (alıcı müşteride kullanılır) ---
  const qualityFactor = 1 + character.qualityTilt * 0.12;
  const budget =
    intent === 'buy'
      ? Math.round(
          purchaseBudgetBase(demand, market) * rng.range(1.1, 2.1) * (1 + status / 200) * qualityFactor,
        )
      : Math.max(reservationPrice, Math.round(fairTotal * rng.range(1.05, 1.9) * (1 + status / 200) * qualityFactor));

  // --- Ödeme tavanı oranı: SPAWN ANINDA SABİT (GDD 34.2) ---
  // Paketi oyuncu seçtiği için tavarın TL karşılığı sonradan türer; ama
  // oranı burada sabitlenir ki oyuncu paketi değiştirip zar atamasın.
  const purchaseCeilingRatio =
    rng.band(PURCHASE.ceilingRatioBand) +
    ((knowledge - 50) / 50) * -0.03 +
    ((status - 50) / 50) * 0.04;

  const id = makeId('cust', rootSeed, spawnIndex);
  const lineIds = items.map((_, i) => `${id}_line${i}`);

  // §4.1 — toplu müşteri AYRI BİR MÜŞTERİDİR. Profil dönüşümü en sonda
  // uygulanır ki arketip, gün karakteri ve RNG çekilişleri bozulmasın;
  // toplu olmak müşteriyi yeniden üretmez, davranışını değiştirir.
  const base: Customer = {
    id,
    displayName,
    archetype: archetypeId,
    intent,
    patienceMax,
    knowledge,
    urgency,
    priceSensitivity,
    status,
    budget,
    reservationPrice,
    purchaseCeilingRatio: clamp(purchaseCeilingRatio, 0.95, 1.45),
    demand,
    patience: patienceMax,
    // Yeni müşteride mağaza güveni semt itibarından türer (GDD 10.1).
    trust: clamp(Math.round(store.reputation * 0.6 + rng.range(-8, 12)), 5, 95),
    suspicion: 0,
    visitHistory: [],
    preferences: archetype.preferredFamilies,
    referralSource: null,
    lineIds,
  };

  // GDD 10.3 — tanıdık müşteri geri döner. Kimlik ve ilişki defterden
  // gelir; sabır, aciliyet ve bugünkü niyet ziyaretin kendisinden.
  // Aynı kişi, ama aynı gün değil.
  const returning = pickReturningCustomer(rootSeed, spawnIndex, registry, market.day);
  const withMemory = returning ? applyMemory(base, returning) : base;

  return {
    customer: applyBulkProfile(withMemory),
    items,
    fromDynamicPool,
    returningRecord: returning,
  };
}

/**
 * Alıcı müşterinin bütçe tabanı: getirdiği ürün olmadığı için adil değer
 * yerine ARADIĞI ŞEYİN değeri esas alınır.
 */
function purchaseBudgetBase(demand: CustomerDemand | null, market: MarketState): number {
  if (!demand) return market.goldSpot * 12;
  const unit = demand.templateId
    ? (bullionMeta(demand.templateId)?.unitWeightGrams ?? 5) *
      (bullionMeta(demand.templateId)?.unitPurity ?? 0.916) *
      market.goldSpot
    : market.goldSpot * 14;
  return unit * Math.max(1, demand.quantity);
}

/**
 * Arketip havuzu mağaza kademesine ve itibara göre değişir (GDD 10.1
 * "Semt/Marka İtibarı → müşteri trafiği, premium segment").
 */
function pickArchetype(rng: Rng, store: StoreState, market: MarketState): ArchetypeId {
  const rep = store.reputation;
  const weights = ARCHETYPES.map((a) => {
    let w = 100;

    // Premium arketipler itibar ister.
    if (a.id === 'vip') w = rep >= 60 ? 45 : 4;
    if (a.id === 'collector') w = rep >= 55 && store.storeTier >= 2 ? 40 : 6;
    if (a.id === 'weddingShopper') w = 55;
    if (a.id === 'investor') w = 70;
    if (a.id === 'informedSeller') w = 65;
    if (a.id === 'opportunist') w = 55;
    if (a.id === 'urgentCash') w = 95;
    if (a.id === 'giftBuyer') w = 80;

    // Olaylar müşteri havuzunu değiştirir (GDD 20.2 — en az iki sistem).
    const event = market.activeEvent;
    if (event?.id === 'wedding_season' && a.id === 'weddingShopper') w *= 2.4;
    if (event?.id === 'market_rally' && a.id === 'investor') w *= 2.1;
    if (event?.id === 'fake_wave' && a.id === 'opportunist') w *= 1.8;

    return { value: a.id, weight: w };
  });

  return rng.pickWeighted(weights);
}

/**
 * Müşterinin bir sonraki gelişine kadar geçecek oyun dakikası.
 * "Müşteri Akını" rewarded QoL yalnız bu aralığı kısaltır (GDD 23.10.1 / 26.2);
 * müşteri kalitesini, bütçesini veya hidden truth dağılımını değiştirmez.
 */
export function nextCustomerDelay(
  rootSeed: number,
  spawnIndex: number,
  band: readonly [number, number],
  rushActive: boolean,
): number {
  const rng = new Rng(deriveSeed(rootSeed, 'customer/delay', spawnIndex));
  const base = rng.range(band[0], band[1]);
  return Math.round(rushActive ? base * 0.4 : base);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
