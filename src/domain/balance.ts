/**
 * MIHENKAYNAK — Denge parametreleri
 * Kaynak: GDD 14.1 "Başlangıç denge hedefleri – PLAYTEST", 35.1 "Denge prensipleri".
 *
 * GDD 35.1: "Tüm sayısal eşikler tuning parametresidir; tasarım değişmezleri
 * değildir." Bu dosya tek tuning yüzeyidir — sayılar sistem kodunun içine
 * gömülmez. PLAYTEST ile değişecek her değer burada işaretlidir.
 */

import type { Karat, MarketRegime, ConditionGrade } from './types';

/** GDD 6.1 — Saflık / ayar modeli. Tasarım sabiti, tuning parametresi değildir. */
export const PURITY_TABLE: Record<Karat, number> = {
  '8K': 0.333,
  '14K': 0.585,
  '18K': 0.75,
  '22K': 0.912,
  '24K': 0.995,
  AG925: 0.925,
  AG800: 0.8,
};

export const KARAT_LABEL: Record<Karat, string> = {
  '8K': '8 Ayar',
  '14K': '14 Ayar',
  '18K': '18 Ayar',
  '22K': '22 Ayar',
  '24K': '24 Ayar',
  AG925: '925 Gümüş',
  AG800: '800 Gümüş',
};

/** Altın ayarları, saflık sırasına göre — mihenk testinin bant daraltması için. */
export const GOLD_KARATS: Karat[] = ['8K', '14K', '18K', '22K', '24K'];

/** GDD 14.1 — PLAYTEST başlangıç değerleri. */
export const START = {
  /**
   * PLAYTEST AYARI — final denge değeri DEĞİLDİR.
   * Sarrafiye ekonomisini (nakitte kalma / gram alma / çeyrek stoklama /
   * portföyü dağıtma) hızlı sınayabilmek için yükseltildi.
   */
  cash: 1_000_000,
  safeLimit: 250_000,
  displaySlots: 8,
  backStockSlots: 16,
  dailyOverhead: 1_200,
  workshopCapacity: 2,
  reputation: 42,
  supplierTrust: 50,
  supplierLimit: 40_000,
  supplierTerms: 3,
} as const;

/** GDD 14.1 — hedef marj bantları. PLAYTEST. */
export const TARGET_MARGIN = {
  bullion: [0.015, 0.04] as [number, number],
  secondHandJewellery: [0.08, 0.2] as [number, number],
  service: [0.35, 0.6] as [number, number],
} as const;

/** GDD 14.2 — likidite bantları. */
export const LIQUIDITY_BANDS = {
  red: 0.15,
  caution: 0.3,
  healthy: 0.55,
} as const;

/**
 * GDD 8.1 — çıkış kanalı ekonomisi.
 * GDD 35.1: "Hızlı toptan çıkış normal perakende stratejisini ekonomik olarak
 * geçmemelidir." Aşağıdaki katsayılar bu sıralamayı korur:
 * melt < wholesale < retail ≤ serviceResale (süre/kapasite maliyeti karşılığı).
 */
export const EXIT_CHANNEL = {
  wholesale: {
    /** Toptancı, adil değerin bu oranını öder. */
    payoutRatio: 0.9,
    /** İşçilik değerinin ne kadarı korunur. */
    craftsmanshipRecovery: 0.3,
    stoneRecovery: 0.4,
    daysToCash: [0, 1] as [number, number],
    fee: 0,
  },
  retail: {
    /** Vitrin satışında adil değer üzerine perakende marjı. */
    markup: 1.18,
    /** Bekleme sırasında gerçekleşen indirim/pazarlık payı. */
    realizationRatio: 0.94,
    craftsmanshipRecovery: 1.0,
    stoneRecovery: 1.0,
    daysToCash: [3, 7] as [number, number],
    /** Vitrin slotu başına günlük fırsat maliyeti. */
    holdingCostPerDay: 35,
  },
  melt: {
    /** GDD 8.1 — eritmede metal odaklı geri kazanım; işçilik/taş kaybı. */
    metalRecovery: 0.94,
    craftsmanshipRecovery: 0,
    stoneRecovery: 0,
    refiningFee: 180,
    daysToCash: [1, 2] as [number, number],
  },
  serviceResale: {
    /** Servis sonrası kondisyonun düzelmesiyle kazanılan değer oranı. */
    conditionRecovery: 0.75,
    markup: 1.18,
    realizationRatio: 0.94,
    daysToCash: [4, 9] as [number, number],
    /** Servis maliyetinin, düzeltilen değere oranı. */
    serviceCostRatio: 0.32,
    /** Hata riskinin beklenen maliyeti (kapasite doluluğuna göre artar). */
    baseErrorRisk: 0.08,
  },
  collection: {
    /** Nadirlik primi zamanla realize olur. */
    appreciationPerDay: 0.004,
    holdDays: [10, 25] as [number, number],
    realizationRatio: 0.96,
    /** Bu kanal yalnız bu nadirlik eşiğinin üstünde rasyoneldir. */
    minRarity: 0.55,
  },
} as const;

/** GDD 6.4 — Alış Tavanı bileşenleri. PLAYTEST. */
export const BUY_CEILING = {
  /** Hedef marj — kanal riskine göre ölçeklenir. */
  targetMarginByRisk: { low: 0.05, medium: 0.11, high: 0.19 },
  /**
   * Risk rezervi — değer bandının genişliğinden türer.
   * Geniş band = düşük güven = daha yüksek rezerv (GDD 6.3).
   */
  riskReservePerBandWidth: 0.55,
  /** Operasyon/zaman maliyeti — nakde dönüş günü başına. */
  opCostPerDay: 0.006,
} as const;

/** GDD 6.5 — Satış Tabanı. */
export const SELL_FLOOR = {
  minMargin: 0.06,
  waitRiskPerDay: 0.004,
} as const;

/** GDD 13.2 — Piyasa rejim modeli. Günlük ve olay hareket bantları. */
export const MARKET_REGIME: Record<
  MarketRegime,
  {
    dailyMove: [number, number];
    eventMove: [number, number];
    label: string;
    note: string;
    /**
     * Ekonomi Ara Düzeltmesi §6 — "Belirsizlik ve hızlı fiyat değişimi makası
     * genişletebilir; sakin koşullar daraltabilir."
     */
    spreadShift: number;
    /**
     * §11 "Aşırı volatilite: makas genişleyebilir, fiyat geçerlilik süresi
     * kısalabilir." Kanallar volatil piyasada daha az hacim taşır.
     */
    capacityFactor: number;
  }
> = {
  calm: {
    dailyMove: [0.004, 0.009],
    eventMove: [0, 0],
    label: 'Sakin',
    note: 'Dar bant, düşük stok riski.',
    spreadShift: -0.002,
    capacityFactor: 1.15,
  },
  normal: {
    dailyMove: [0.008, 0.018],
    eventMove: [0.02, 0.03],
    label: 'Normal',
    note: 'Nötr veya hafif trend.',
    spreadShift: 0,
    capacityFactor: 1,
  },
  volatile: {
    dailyMove: [0.015, 0.025],
    eventMove: [0.04, 0.06],
    label: 'Volatil',
    note: 'Uyarı: likidite ve stok yaşı daha önemli.',
    spreadShift: 0.006,
    capacityFactor: 0.72,
  },
  shock: {
    dailyMove: [0.015, 0.025],
    /** GDD 13.4 — event hareketleri tavanlıdır. */
    eventMove: [0.06, 0.08],
    label: 'Şok Olay',
    note: 'Önceden kısmi sinyal; pozisyon küçültme mümkün.',
    spreadShift: 0.013,
    capacityFactor: 0.5,
  },
};

/** Normal günlük ve gün içi fiyatın açılış/kapanış çapası etrafındaki tavanı. */
export const MARKET_DAILY_CAP = 0.03;

/**
 * TL cinsinden kotasyonların küçük nominal eğilimi. İşlem günü başına oranlar
 * pasif beklemeyi zenginlik makinesine çevirmeyecek kadar düşük; buna karşın
 * gram altının uzun vadede sürekli aşağı sürüklenmesini önler.
 */
export const MARKET_NOMINAL_DRIFT = {
  gold: 0.0005,
  silver: 0.00045,
  fx: 0.00035,
} as const;

/**
 * Uzun dönem fiyat çapası. Günlük hareketi yönetmez; fiyat başlangıç
 * referansından kalıcı biçimde uzaklaştığında yalnız küçük bir karşı kuvvet
 * üretir. Böylece 30 günlük trendler yaşar, 365 günlük bileşik uçuşlar yaşamaz.
 */
export const MARKET_MEAN_REVERSION = {
  /** Hareketli makro çapanın çevresindeki geniş serbest hareket alanı. */
  freeBand: 0.15,
  /** Makro çapa her açık gün fiyatın %1'ini izler (~100 işlem günü hafıza). */
  anchorFollow: 0.01,
  /** Serbest bandın dışındaki sapmanın günlük geri besleme payı. */
  strength: 0.035,
  /** Dengeleyici hiçbir günde fiyatı tek başına %0,20'den fazla itemez. */
  dailyCap: 0.002,
} as const;

/**
 * Ekonomi Ara Düzeltmesi §2.4 / §6 / §8 — KANAL PROFİLLERİ.
 *
 * DEĞİŞMEZ (§8): "Toptancı ve esnaf ağı aynı fiyat/limit algoritmasının
 * yalnızca farklı isimleri olarak uygulanmaz." Aşağıdaki dört profil farklı
 * spread, kapasite, derinlik ve ilişki ağırlığı taşır.
 *
 * DEĞİŞMEZ (§9): "Hiçbir kanal her rejimde en iyi fiyatı, en hızlı işlemi ve
 * en düşük riski AYNI ANDA vermemelidir." Her profilde en az bir zayıflık var.
 *
 * `makerBias` — FİYATI KİM BELİRLİYOR? +1 dükkân (tezgâh müşterisine karşı
 * dükkân piyasa yapıcıdır), negatif ise karşı taraf (toptancıya karşı dükkân
 * fiyat alıcısıdır). Ürün belirsizliği, rejim ve volatilite genişlemesi bu
 * katsayıyla çarpılır: fiyatı belirleyen taraf kendini korur, alan taraf öder.
 * §6.1'in "tersine çevirebilir" cümlesi bu yapıdan doğar — sabitten değil.
 *
 * `slippageFactor` — kanalın derinliği tükendiğinde fazla adet başına ödenen
 * kayma. Tezgâh sığdır (1.35), toptancı derindir (0.42).
 *
 * `maxConcessionShare` — ilişki ve hacim ödünlerinin yarım makasın en fazla
 * ne kadarını yiyebileceği. §8'in gereği: esnaf ağı ve toptancı fiyatlarını
 * ilişki sermayesi taşır, tezgâh taşımaz. Kalan pay her koşulda ayakta kalır
 * ki §11'in arbitraj döngüsü yapısal olarak kapansın.
 */
/**
 * Ekonomi Ara Düzeltmesi §3 — MÜŞTERİ INTENT DAĞILIMI.
 *
 * V5: %35/%35 taban + bağımsız günlük %10 dağılım + %20 sürpriz.
 * Dinamik havuzun mevcut iç ağırlıkları korunur; kota/rebalancing uygulanmaz.
 */
export const INTENT_MIX = {
  /** Müşteri alış intenti — oyuncu müşteriye satar. */
  customerBuys: 0.35,
  /** Müşteri satış intenti — müşteri oyuncuya satar. */
  customerSells: 0.35,
  /** Kontrollü dinamik/RNG havuzu. */
  dynamic: 0.20,
  dailyAllocation: 0.10,
  /** Dinamik havuzun servise ayrılan payı. */
  dynamicServiceShare: 0.4,
  /**
   * Dinamik havuzun ekspertiz/danışmaya ayrılan payı (GDD 23.23 beşinci akış).
   * Servisten küçüktür: ekspertiz dükkânın her gün yaptığı bir iş değil,
   * ara sıra gelen bir danışma talebidir.
   */
  dynamicAppraisalShare: 0.15,
  /** Havuzun yön eğiminin mutlak tavanı. */
  maxDynamicTilt: 0.5,

  /**
   * §11 telemetri alarmı eşikleri. §3 "tek tek kısa seanslarda birebir yüzde
   * garantisi aranmaz" dediği için alarm ancak örneklem birikince konuşur.
   */
  alarmMinSample: 200,
  /** Sabit tabanın örneklem hatası payı. */
  baseTolerance: 0.03,
  /** Fiili alış-satış dengesinin izin verilen sapması. */
  balanceTolerance: 0.25,
} as const;

/**
 * Müşteri alış akışı ayarları (GDD 23.23 · Addendum §3, §4.1).
 * §9: "Denge ayarları veri odaklıdır: sabit kod yerine konfigürasyon."
 */
export const PURCHASE = {
  /** Bu adetten itibaren toplu müşteri kanal profili kullanılır (§4.1). */
  bulkChannelThreshold: 8,
  /** Toplu pakette adet arttıkça birim satış önerisini kademeli daraltır. */
  bulkUnitDiscountPerExtraUnit: 0.0002,
  bulkUnitDiscountMax: 0.012,

  /** Toplu müşterinin kısmi karşılamayı kabul etme olasılığı (§4.1). */
  bulkPartialChance: 0.65,
  /** Kısmi karşılamada talebin en az bu payı verilmeli. */
  partialFloorShare: 0.5,

  /** Talebe uymayan kalem başına sabır bedeli. */
  offMatchPatienceCost: 6,
  /** Talebe uymayan kalem başına ödeme tavanı kaybı. */
  offMatchCeilingCut: 0.06,
  /** Tam isabetli kalem başına tavan primi. */
  exactMatchCeilingBonus: 0.02,

  /** Ödeme tavanı oranı bandı — spawn anında sabitlenir (GDD 34.2). */
  ceilingRatioBand: [1.04, 1.34] as [number, number],

  /** Mağaza kademesine göre paketteki azami kalem sayısı. */
  maxPackageLinesByTier: { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 } as Record<number, number>,

  /**
   * §4.1 — TOPLU MÜŞTERİ PROFİLİ.
   * "Toplu müşteri, normal tekil müşterinin sadece yüksek adetli kopyası
   * değildir." Aşağıdaki katsayılar o cümlenin sayısal karşılığıdır.
   */
  bulk: {
    /** Fiyat hassasiyeti: birim farkı adetle çarpıldığı için çok daha yüksek. */
    priceSensitivityFactor: 1.45,
    /** Sabır: büyük iş pazarlık ister, kapıdan dönmez. */
    patienceFactor: 1.3,
    /** Güven: ilişkiye değil rakama bakar; temkinli başlar. */
    trustFactor: 0.85,
    /** Ödeme tavanı: perakende priminin yalnız bu kadarını öder. */
    ceilingCompression: 0.45,
  },
} as const;

/**
 * Ekonomi Ara Düzeltmesi §7 — TOPTANCI FİNANSMANI.
 *
 * DEĞİŞMEZ: "Finansman, SINIRSIZ STOK ve RİSKSİZ ARBİTRAJ üretmemeli."
 * Bu yüzden vade farkı hiçbir güven seviyesinde sıfırlanmaz (`minRate`) ve
 * limit güvenle büyüse de kendi tavanını taşır.
 */
export const WHOLESALE = {
  /** Vade farkı taban oranı (dönem başına). */
  baseRate: 0.028,
  /** Güvenin vade farkından düşürebileceği azami pay. */
  rateTrustRelief: 0.018,
  /** Vade farkı bunun altına ASLA inmez — bedava kredi arbitraj kapısıdır. */
  minRate: 0.008,

  /** Sıfır güvende bile limitin bu payı kullanılabilir. */
  limitFloorShare: 0.35,
  /** Semt itibarının limite katkı ağırlığı. */
  reputationLimitWeight: 0.2,
  /** Güvenin vadeye ekleyebileceği azami gün. */
  termBonusDays: 4,

  /** Zamanında ödemenin güven kazancı. */
  onTimeTrustGain: 4,
  /** Geciken ödemenin güven cezası. */
  lateTrustPenalty: 9,
  /** Anlamlı peşin alışların küçük güven katkısı; kredi ilişkisinin yerini almaz. */
  tradeTrustGain: 1,
  /** Peşin ticaret bu puanın üstüne taşımaz; üst kademeler için zamanında vade gerekir. */
  tradeTrustCap: 65,
  /** Güven katkısı için alışın güncel kredi limitindeki asgari payı. */
  tradeTrustMinShare: 0.25,
  /** Zamanında ödemede limit büyüme katsayısı. */
  onTimeLimitGrowth: 1.06,
  /** Gecikmede limit daralma katsayısı. */
  lateLimitCut: 0.82,
  /** Limit bunun altına inmez. */
  minLimit: 10_000,

  /** Gecikmiş borcun günlük yükü. */
  overduePerDayRate: 0.012,
  /** Gecikmenin günlük güven aşınması. */
  overdueDailyTrustPenalty: 3,

  /** Bir lotun kanal kapasitesine oranı — toptancı sınırsız mal satmaz. */
  lotShareOfCapacity: 0.18,
} as const;

/**
 * Ekonomi Ara Düzeltmesi §8 — ESNAF AĞI.
 *
 * DEĞİŞMEZ: "toptancının yerine geçen SINIRSIZ İKİNCİ BANKA DEĞİLDİR."
 * Sayılar bu cümleyi taşımak için seçildi: üye başına tavan toptancı
 * limitinin küçük bir kesri, vade yarısı kadar kısa, ve ağ tavanı üye
 * tavanlarının TOPLAMINDAN belirgin küçük.
 */
export const NETWORK = {
  /** Ağdaki esnaf sayısı. */
  memberCount: 6,
  /** Bir esnafın kasasındaki nakit bandı — bozdurma kapasitesinin kaynağı. */
  cashBand: [18_000, 70_000] as [number, number],
  /** Gün başında kasanın tazelenen payı; ağ kalıcı kurumaz. */
  dailyReplenishShare: 0.22,
  /** Bu iştahın altındaki esnaf sarrafiye almaz (§8 "uygun esnafta"). */
  minAppetiteToBuy: 0.3,

  /** Kısa vadeli borç tabanı. */
  loanBase: 4_000,
  /** Güven puanı başına borç kapasitesi. */
  loanPerTrustPoint: 90,
  /** Düzenli ödemenin kapasiteye katkısı (§8 "düzenli ödeme ağı güçlendirebilir"). */
  historyBonusPerRepayment: 1_200,
  /** Gecikmenin kapasite cezası. */
  historyPenaltyPerLate: 2_600,

  /**
   * Ağın TOPLAM açık borç tavanı. Üye tavanlarının toplamından belirgin
   * küçük: toplam olsaydı üye sayısını artırmak sınırsız bankaya giden yol
   * olurdu (§8).
   */
  networkDebtCeiling: 45_000,
  /** Sıfır ortalama güvende bile ağ tavanının bu payı açıktır. */
  ceilingFloorShare: 0.3,

  /** §8 "KISA vadeli" — toptancının vadesinin yarısı kadar. */
  termDays: 2,
  /** Bu güvenin üstündeki esnaf bir gün daha veriyor. */
  longTermTrust: 70,

  /** Dayanışma ücreti — gizli değil, işlem öncesi görünür. */
  baseFeeRate: 0.035,
  feeTrustRelief: 0.02,
  /** Ücret hiçbir güvende sıfırlanmaz; bedava para arbitraj kapısıdır. */
  minFeeRate: 0.012,

  /** Zamanında ödeme ilişkiyi güçlendirir. */
  onTimeTrustGain: 5,
  /** Gecikme ilişkiyi aşındırır — ağ toptancıdan daha kırılgandır. */
  lateTrustPenalty: 14,
  /** Ticaret ilişkiyi bir tık büyütür. */
  tradeTrustGain: 2,

  /** Gecikmiş borcun günlük yükü. */
  overduePerDayRate: 0.02,
  overdueDailyTrustPenalty: 5,
} as const;

export const CHANNEL = {
  /**
   * Tezgâh müşterisi: dükkânın fiyatı BELİRLEDİĞİ kanal (makerBias +1).
   * Marjı en yüksek, kapasitesi en dar, derinliği en sığ olan kanal.
   */
  retailCustomer: {
    buySpread: 0.02,
    sellSpread: 0.014,
    capacityUnits: 5,
    slippageFactor: 1.35,
    relationshipWeight: 0.006,
    makerBias: 1,
    maxConcessionShare: 0.55,
    settlementDays: 0,
  },
  /** Toplu müşteri: hacim getirir, pazarlık gücünün bir kısmını da (§4.1). */
  bulkCustomer: {
    buySpread: 0.011,
    sellSpread: 0.008,
    capacityUnits: 60,
    slippageFactor: 0.9,
    relationshipWeight: 0.012,
    makerBias: 0.45,
    maxConcessionShare: 0.6,
    settlementDays: 0,
  },
  /**
   * Toptancı: fiyatı TOPTANCI belirler (makerBias negatif). Dükkân burada
   * fiyat alıcısıdır — ürün belirsizliğinin ve volatilitenin bedelini o öder.
   * Karşılığında en derin piyasa ve en yüksek kapasite (§4.2).
   * Zayıflığı: küçük hacimde tezgâhtan KÖTÜ fiyat verir; üstünlüğü ancak
   * hacim tezgâhın derinliğini tükettiğinde ortaya çıkar (§6.1).
   */
  wholesaler: {
    buySpread: 0.002,
    sellSpread: 0.001,
    capacityUnits: 220,
    slippageFactor: 0.42,
    relationshipWeight: 0.022,
    makerBias: -0.6,
    maxConcessionShare: 0.8,
    settlementDays: 0,
  },
  /**
   * Esnaf ağı: toptancının kopyası DEĞİL (§8). Kapasitesi bir düzine kat
   * küçük, ilişki ağırlığı en yüksek — fiyatı neredeyse tamamen ilişki
   * sermayesi taşır. Derinliği toptancıdan çok sığdır.
   */
  tradeNetwork: {
    buySpread: 0.008,
    sellSpread: 0.006,
    capacityUnits: 18,
    slippageFactor: 1.05,
    relationshipWeight: 0.026,
    makerBias: -0.15,
    maxConcessionShare: 0.85,
    settlementDays: 0,
  },
} as const;

/**
 * Ekonomi Ara Düzeltmesi §5.1 — ERTESİ GÜN FİYAT OLUŞUMU.
 *
 * DEĞİŞMEZ: "Ertesi gün fiyatı basit ve BAĞIMSIZ bir 50/50 yükseliş-düşüş
 * çekilişiyle belirlenmez. Fiyat üretimi ... bileşenlerin AĞIRLIKLI
 * sonucudur."
 *
 * Ağırlıklar bu cümlenin sayısal karşılığı: gürültü en küçük paydır ve tek
 * başına yönü belirleyemez. Rejim + trend + olay birlikte gürültüden ağır
 * basar.
 */
export const MARKET_COMPOSITION = {
  regime: 0.65,
  trend: 0.8,
  /** Haber hissedilir; tek başına fiyatı günlük tavana yapıştırmaz. */
  event: 0.55,
  /** Kontrollü RNG payı — "keyfi veya tamamen bağımsız" olmaması için sınırlı. */
  noise: 0.5,
} as const;

/** Rejimin kendi fiyat eğilimi. Stres aşağı, sakin nötre yakın. */
export const REGIME_DRIFT: Record<MarketRegime, number> = {
  calm: 0.05,
  normal: 0,
  volatile: -0.15,
  shock: -0.4,
};

/**
 * §5.1 — rejim bir DURUM, günlük çekiliş değil. Geçiş matrisi rejimin
 * kendisiyle kalma eğilimini taşır; sakin gün genelde sakin günü izler.
 */
export const REGIME_TRANSITIONS: Record<
  MarketRegime,
  { to: MarketRegime; weight: number }[]
> = {
  calm: [
    { to: 'calm', weight: 55 },
    { to: 'normal', weight: 38 },
    { to: 'volatile', weight: 6 },
    { to: 'shock', weight: 1 },
  ],
  normal: [
    { to: 'calm', weight: 22 },
    { to: 'normal', weight: 52 },
    { to: 'volatile', weight: 22 },
    { to: 'shock', weight: 4 },
  ],
  volatile: [
    { to: 'calm', weight: 8 },
    { to: 'normal', weight: 34 },
    { to: 'volatile', weight: 44 },
    { to: 'shock', weight: 14 },
  ],
  shock: [
    { to: 'calm', weight: 4 },
    { to: 'normal', weight: 26 },
    { to: 'volatile', weight: 46 },
    { to: 'shock', weight: 24 },
  ],
};

/**
 * Olayın fiyat yönü. Olay bir haberdir; yönü kendi içeriğinden gelir,
 * yazı-tura ile değil.
 */
export const EVENT_DIRECTION: Record<string, number> = {
  wedding_season: 0.35,
  market_rally: 1,
  fx_calm: -0.4,
  fake_wave: -0.25,
};

/** Rejim seçimi ağırlıkları — gün başında belirlenir (GDD 13.3). */
export const REGIME_WEIGHTS: { value: MarketRegime; weight: number }[] = [
  { value: 'calm', weight: 30 },
  { value: 'normal', weight: 45 },
  { value: 'volatile', weight: 20 },
  { value: 'shock', weight: 5 },
];

/** Başlangıç piyasa referansları (oyun TL). */
export const MARKET_BASE = {
  goldGram: 4_244,
  silverGram: 48.6,
  usd: 32.45,
  eur: 34.89,
  /** Çeyrek altın = 1.75 g × 0.916 saflık × spot × ticari spread. */
  quarterGoldSpread: 1.075,
  quarterGoldWeight: 1.75,
} as const;

/** Kondisyonun gerçek değerden düşülen oranı (GDD 6.2 kondisyon kesintisi). */
export const CONDITION_DEDUCTION: Record<ConditionGrade, number> = {
  pristine: 0,
  good: 0.02,
  worn: 0.07,
  damaged: 0.16,
  broken: 0.3,
};

export const CONDITION_LABEL: Record<ConditionGrade, string> = {
  pristine: 'Kusursuz',
  good: 'İyi',
  worn: 'Yıpranmış',
  damaged: 'Hasarlı',
  broken: 'Kırık',
};

/** Kondisyon sıralaması — servis sonrası iyileşmeyi hesaplamak için. */
export const CONDITION_ORDER: ConditionGrade[] = ['broken', 'damaged', 'worn', 'good', 'pristine'];

/**
 * GDD 7.2 — Diminishing return.
 * Aynı bilgi alanında n'inci test, temel kazancın bu çarpanıyla çalışır.
 */
export const DIMINISHING_RETURN = [1.0, 0.45, 0.2, 0.08] as const;

/**
 * GDD 7 — hata payı "Çok düşük" olan araçlar bir çıkarım değil ÖLÇÜMdür
 * (hassas terazi, dijital spektrometre). Bu eşiğin üstündeki güvenilirlik,
 * aracın ilgilendiği bilgi alanını tam olarak kapatır: "Ayarı çok yüksek
 * doğrulukla çözer... İleri oyun kesinlik aracı."
 */
export const DEFINITIVE_RELIABILITY = 0.95;

/** Güven seviyesi eşikleri — bandın göreli genişliğine göre (GDD 6.3). */
export const CONFIDENCE_THRESHOLD = {
  /** Bu genişliğin altı = yüksek güven. */
  high: 0.06,
  /** Bu genişliğin altı = orta güven. */
  medium: 0.16,
} as const;

/**
 * GDD 11 — Pazarlık denge parametreleri.
 * GDD 35.1: "Yüksek güven her fiyatı kabul ettirmez; ilişki fiyat farkını
 * sınırlı ölçüde tolere eder." MAX_RESERVATION_FLEX bu sınırı kodlar.
 */
export const NEGOTIATION = {
  /** Rezervasyon fiyatı ilişki/gerekçe ile en fazla bu kadar esneyebilir. */
  maxReservationFlex: 0.08,

  /** Kapanış skoru bileşen ağırlıkları (GDD 11.3). */
  weights: {
    trust: 0.028,
    urgency: 0.022,
    reasoning: 0.02,
    reputation: 0.015,
    gesture: 0.012,
    waiting: -0.02,
    suspicion: -0.035,
  },

  /** Karşı teklif marjı: müşteri rezervasyonunun üstüne bu oranı koyar. */
  counterMarginByState: {
    OPEN: [0.14, 0.09] as [number, number],
    HARDENING: [0.06, 0.04] as [number, number],
    FINAL_OFFER: [0.02, 0.02] as [number, number],
  },

  /** Bu orandan düşük teklif "kötü teklif" sayılır ve sertleşmeyi tetikler. */
  insultThreshold: 0.82,
  /** Sertleşmeye geçiş için gereken kötü teklif sayısı. */
  hardeningTrigger: 2,
  /** FINAL_OFFER'a geçiş: sabır bu oranın altına düştüğünde. */
  finalOfferPatienceRatio: 0.28,

  /** Tur başına temel sabır maliyeti. */
  patiencePerRound: 1,
  /** Aynı teklifi tekrar etmenin sabır cezası (GDD 11.4). */
  repeatOfferPatiencePenalty: 2,
  repeatOfferTrustPenalty: 5,

  /** Karşı teklif isteme maliyeti. */
  requestCounterPatienceCost: 1,
  /** Jest: küçük marj kaybı oranı. */
  gestureCostRatio: 0.012,
  gestureTrustGain: 6,
  /** Bir oturumda anlamlı jest sayısı üst sınırı (exploit koruması, GDD 10.4). */
  maxEffectiveGestures: 2,
  /** Doğru gerekçenin güven kazancı. */
  reasonTrustGain: 5,
  /** Yanlış/şüpheli gerekçenin bilinçli müşteride güven cezası (GDD 11.5). */
  falseReasonTrustPenalty: 12,
  falseReasonKnowledgeThreshold: 55,
} as const;

/** Test aracı süresinin sabır maliyetine çevrimi. */
export const PATIENCE_PER_TEST_SECOND = 0.25;

/**
 * GDD 17 — Servis ve atölye denge parametreleri. Tümü PLAYTEST.
 *
 * DEĞİŞMEZ (GDD 17.4): burada pasif gelir üreten hiçbir parametre yoktur.
 * Her değer ya bir maliyeti, ya bir riski, ya da bir ilişki sonucunu ölçekler.
 */
/**
 * Ekspertiz / danışma akışı (GDD 23.23 beşinci akış, GDD 17.1 "Ekspertiz
 * Raporu — uzmanlığa bağlı risk, güven + ücret").
 *
 * Ücret tabanı, servis türleri tablosundaki `appraisalReport` işçilik oranıyla
 * (0.045) aynı büyüklüktedir — aynı iş, iki farklı kapıdan girer: biri stoktaki
 * ürüne atölye işi olarak, diğeri müşterinin ürününe danışmanlık olarak.
 */
export const APPRAISAL = {
  /** Ürün değerine oranla ekspertiz ücretinin tabanı. */
  baseFeeRatio: 0.045,
  /** Ücretin altına inemeyeceği taban — küçük üründe iş yine emek ister. */
  minFee: 60,
  /**
   * Oyuncunun önerilen ücretin kaç katına kadar çıkabileceği.
   * `ceilingSlack` ile birlikte okunmalı: tavanın ÜSTÜNE çıkabilmeli ki
   * açgözlülük gerçek bir risk olsun, ama tavanın tamamen dışında kalmamalı
   * ki üst yarı ölü bir bölge olmasın. Cömert müşteride üst sınır ödenir.
   */
  maxFeeOverAsk: 1.8,

  /** Duruşların band genişliği çarpanları. */
  cautiousBandScale: 1.6,
  assertiveBandScale: 0.45,

  /**
   * Raporlanan aralığın en dar hâli.
   *
   * NEDEN VAR: her alanı ölçmüş bir oyuncunun bandı sıfır genişliğe çöker ve
   * değerleme ile gerçek değer arasındaki 1 ₺'lik YUVARLAMA farkı bile raporu
   * "yanlış" yapardı — ölçmek oyuncuyu cezalandırırdı. Gerçek bir eksper de
   * kuruşu kuruşuna konuşmaz, "yaklaşık şu kadar" der.
   *
   * Bu bir değerleme düzeltmesi DEĞİLDİR: band olduğu gibi kalır, yalnız
   * müşteriye SÖYLENEN aralığın bir alt genişliği olur.
   */
  minReportHalfWidth: 25,
  minReportHalfWidthRatio: 0.005,

  /**
   * Müşterinin tavanındaki bolluk payı: önerilen ücret her zaman kabul
   * edilebilir olsun, oyuncu ancak açgözlülük ederse reddedilsin.
   */
  ceilingSlack: 1.45,
  /** Bilgili müşteri ücreti kısar. */
  knowledgeSqueeze: 0.22,
  /** Fiyata duyarlı müşteri ücreti kısar. */
  sensitivitySqueeze: 0.3,
  /** Statülü müşteri uzmanlığa daha çok öder. */
  statusStretch: 0.25,

  /** Doğru raporun taban itibar kazancı. */
  accurateTrust: 8,
  /** Yanlış raporun taban itibar kaybı. */
  inaccurateTrust: 12,
  /** Ücret reddedilirse ek itibar etkisi (zaman harcandı). */
  refusedTrustPenalty: -2,
  /** Tek ekspertizin itibarı en fazla ne kadar oynatabileceği (GDD 10.4). */
  maxTrustSwing: 16,
  /** Güven değişiminin semt itibarına yansıyan payı. */
  reputationShare: 0.5,

  /** Emek tam sayılsın diye beklenen test sayısı. */
  effortTests: 3,
  /** Hiç test yapmadan tutturmanın kazanç tabanı. */
  effortFloor: 0.35,
  /** Iskanın ceza tavanına ulaştığı oran (gerçek değerin %35'i). */
  missCap: 0.35,
} as const;

export const SERVICE = {
  /** GDD 14.1 — "Servis brüt marj %35–60". Ücret bu banttan türetilir. */
  grossMarginBand: [0.35, 0.6] as [number, number],

  /**
   * GDD 35 hata riski formülünün yoğunluk terimi ağırlığı.
   * GDD 17.3: "Aşırı iş almak bekleme süresini ve hata riskini artırır."
   */
  loadRiskWeight: 0.3,

  /** Personel başına beceri katkısı (riski düşürür). Personel sistemi post-MVP. */
  staffSkillPerMember: 0.06,

  /** Mağaza kademesine bağlı ekipman bonusu (GDD 17.2 "ekipman"). */
  equipmentBonusByTier: { 1: 0, 2: 0.04, 3: 0.08, 4: 0.13, 5: 0.18 } as Record<number, number>,

  /** GDD 17.2 — dış usta: marj düşer, süre uzar, kapasite tüketmez. */
  outsource: {
    /** Ücretin dış ustaya giden payı. */
    feeShare: 0.42,
    /** Kendi atölyeye göre ek gün. */
    extraDays: 2,
    /** Dış ustanın hata riski çarpanı — kontrol sende değildir. */
    riskFactor: 0.85,
  },

  /** GDD 17.3 — teslim sözü kişisel güvenin parçasıdır. */
  promise: {
    /** Varsayılan tampon: bir gün pay bırak. */
    defaultBufferDays: 1,
    /** Tamponsuz (sıkı) söz tutulursa ek güven. */
    tightBonus: 4,
    /** Aşırı geniş söz vermenin güven maliyeti. */
    loosePenalty: -2,
    /** Oyuncunun seçebileceği en geniş tampon. */
    maxBufferDays: 3,
  },

  /** Sözden her gün gecikmenin güven cezası. */
  latePenaltyPerDay: 6,

  /** GDD 21.2 — servis hatasında ödenen tazminin ücrete oranı. */
  compensationRatio: 1.25,

  /** Servis hatasının doğrudan güven cezası. */
  failureTrustPenalty: 18,

  /** Kişisel güven hareketinin semt itibarına yansıma oranı (GDD 10.4). */
  reputationTransfer: 0.25,

  /** Servis işi kabul edildiğinde kazanılan XP. */
  xpOnAccept: 18,
  /** Başarılı teslimde kazanılan ek XP. */
  xpOnDelivery: 26,
} as const;

/** XP kazanımı — GDD 18.1 "doğru ekspertiz, kârlı işlem, iyi risk kararı". */
export const XP = {
  dealClosed: 30,
  perTestUsed: 6,
  highConfidenceBonus: 25,
  goodMarginBonus: 40,
  /** Zararına kapanan işlem XP vermez ama cezalandırmaz. */
  lossFloor: 0,
  levelCurve: (level: number) => Math.round(400 + level * level * 180),
} as const;

/** Güven / itibar hareketleri (GDD 10). */
export const TRUST = {
  /** Adil fiyat algısı eşiği: teklif/rezervasyon oranı. */
  fairPriceRatio: 1.02,
  fairDealGain: 8,
  harshDealPenalty: 10,
  rejectPenalty: 4,
  /** Semt itibarına yansıma oranı — tek işlem itibarı uçurmaz (GDD 10.4). */
  reputationTransfer: 0.12,
} as const;

/**
 * GDD 10 — MÜŞTERİ HAFIZASI VE SADAKAT.
 *
 * DEĞİŞMEZ (10.4): güven tek jestle satın alınamaz, küçük işlem spam'i hızlı
 * VIP üretmez, ciddi olaylar daha ağır basar, referans yüksek güven VE
 * yeterli ziyaret ister.
 */
export const MEMORY = {
  /** Hafızanın çıpası — yeni müşterinin nötr güveni. */
  baseTrust: 50,
  /** Kaç ziyaret saklanır. */
  maxHistory: 12,
  /** Yaşlanan olayın ağırlık sönümü (ziyaret başına). */
  recencyDecay: 0.82,
  /** Bu büyüklüğün altındaki kazanç "küçük" sayılır ve spam korumasına girer. */
  smallGainThreshold: 8,
  /** Art arda gelen küçük kazançların azalan getirisi. */
  repeatGainFalloff: 0.55,
  /**
   * GDD 10.4 — tek bir ziyaretin güvene azami etkisi. Tavan olmadan büyük
   * tek bir jest istikrarlı geçmişi geçiyordu, yani güven satın alınabiliyordu.
   */
  maxSingleEventSwing: 12,

  /** Kaç ziyaretten sonra tam sadakat sayılır. */
  loyalVisits: 5,
  /**
   * Tek ziyaretin ilişkiye verdiği kesinlik payı. Ziyaret sayısı güvenin
   * YÖNÜNÜ pekiştirir; yönü tersine çevirmez.
   */
  singleVisitWeight: 0.5,
  /** Sadakatin sepete etkisi (± oran). */
  basketSwing: 0.28,
  /** Sadakatin şüpheye etkisi (puan). */
  suspicionRelief: 14,

  /** GDD 10.4 — referans için gereken güven ve ziyaret sayısı. */
  referralTrust: 72,
  referralVisits: 3,
  referralChance: 0.18,
  /** Bu güvenin altındaki müşteri "küsmüş" sayılır. */
  upsetTrust: 32,

  /** Dönüş olasılığı tabanı. */
  baseReturnWeight: 0.08,
  /** Güvenin dönüş olasılığına çarpan etkisi. */
  trustReturnSwing: 0.9,
  /** Aynı müşteri en erken bu kadar gün sonra döner. */
  minDaysBetweenVisits: 1,
  /** Bu kadar gün görülmeyen müşteri yavaşça unutulur. */
  forgetAfterDays: 30,
  /** Gelen müşterilerin en fazla bu payı tanıdık olabilir. */
  maxReturnShare: 0.45,
} as const;

/** Gün akışı (GDD 3.2). */
export const DAY = {
  openMinutes: 9 * 60,
  closeMinutes: 19 * 60,
  /** Gerçek saniye başına ilerleyen oyun dakikası (1x hızda). */
  minutesPerRealSecond: 1.2,
  /** Müşteri geliş aralığı (oyun dakikası). PLAYTEST. */
  customerIntervalMinutes: [12, 26] as [number, number],
} as const;

/** Hız kontrolü — 1x/2x temel, 4x rewarded (GDD 23.9.2 / 26.2). */
export const SPEED_STEPS = [1, 2, 4] as const;
export type SpeedStep = (typeof SPEED_STEPS)[number];
