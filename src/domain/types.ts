/**
 * MIHENKAYNAK — Çekirdek veri modelleri
 * Kaynak: GDD v2.3 · Bölüm 28.2 "Temel veri nesneleri".
 *
 * Bu katman saf TypeScript'tir: React, DOM veya store bağımlılığı içermez.
 * Amaç GDD 28.1 "sistemler veri güdümlü olmalı; içerik koddan ayrılmalı"
 * kuralını yapısal olarak zorlamaktır.
 */

// ---------------------------------------------------------------------------
// Temel birimler
// ---------------------------------------------------------------------------

/** Oyun içi para birimi (TL). Kuruş yok; tam sayı olarak tutulur. */
export type Money = number;

/** Gram. Ondalıklı. */
export type Grams = number;

/** 0–1 aralığında saflık katsayısı (GDD 6.1). */
export type Purity = number;

/** 0–100 aralığında normalize edilmiş davranış/ilişki parametresi. */
export type Scale100 = number;

/** Oyun günü sayacı (1'den başlar). */
export type GameDay = number;

// ---------------------------------------------------------------------------
// Ürün taksonomisi (GDD 5.1)
// ---------------------------------------------------------------------------

export type ItemFamily =
  | 'bullion' // Yatırım altını
  | 'classic' // Klasik takı
  | 'stoneSet' // Taşlı ürün
  | 'silver' // Gümüş
  | 'collectible' // Koleksiyon / vintage
  | 'service'; // Servis ürünü

export type MetalKind = 'gold' | 'silver';

/** GDD 6.1 saflık / ayar modeli. */
export type Karat = '8K' | '14K' | '18K' | '22K' | '24K' | 'AG925' | 'AG800';

/** GDD 5.2 · condition — aşınma, kırık, eksik parça, çizik, deformasyon. */
export type ConditionGrade = 'pristine' | 'good' | 'worn' | 'damaged' | 'broken';

/** GDD 5.2 · hiddenFlaw — kaplama, dolgu, içi boşluk, sahte damga, kırık mekanizma. */
export type HiddenFlawKind =
  | 'plated' // Kaplama
  | 'filled' // Dolgu / içi boşluk
  | 'hollow' // İçi boş gövde
  | 'fakeHallmark' // Sahte damga
  | 'brokenMechanism' // Kırık kilit/mekanizma
  | 'solderRepair'; // Gizlenmiş lehim onarımı

export interface HiddenFlaw {
  kind: HiddenFlawKind;
  /** Gerçek değerden düşülen oran (0–1). */
  severity: number;
  /**
   * GDD 7.3 — "tamamen görünmez risk çekirdeğin parçası olmaz".
   * Her kusur en az bir okunabilir sinyal taşımak zorundadır.
   */
  readableSignal: SuspicionSignal;
}

/** İşleme girmeden oyuncunun görebileceği şüphe sinyali (GDD 7.3). */
export interface SuspicionSignal {
  id: string;
  /** Oyuncuya gösterilen kısa metin. Kesin sahte alarmı değildir. */
  label: string;
  /** Sinyalin ne kadar dikkat çektiği; UI yoğunluğunu belirler. */
  strength: 'faint' | 'noticeable' | 'strong';
}

/** GDD 5.2 · stoneData. */
export interface StoneData {
  kind: 'none' | 'diamond' | 'zircon' | 'ruby' | 'sapphire' | 'emerald' | 'unknown';
  /** Taşın gerçek olup olmadığı — lup/taş tester ile çözülür. */
  genuine: boolean;
  /** Kalite bandı 0–1. */
  qualityBand: number;
  /** Taşın kendi başına çıkarılabilir değeri. */
  extractableValue: Money;
  count: number;
}

/** GDD 5.2 — spawn anında sabitlenen gerçek durum katmanı. */
export interface HiddenTruth {
  grossWeight: Grams;
  netMetalWeight: Grams;
  actualPurity: Purity;
  actualKarat: Karat;
  condition: ConditionGrade;
  stoneData: StoneData;
  /** Yeniden satışta korunabilecek işçilik/tasarım değeri. */
  craftsmanship: Money;
  hiddenFlaws: HiddenFlaw[];
  /** 0–1; geç oyun nadirlik. */
  rarity: number;
  /** Kanıtlanmış hikâye/köken. */
  provenance: string | null;
  demandTags: string[];
}

/** Oyuncunun test yapmadan gördüğü beyan/gözlem katmanı (GDD 5.3). */
export interface DeclaredInfo {
  /** Müşterinin beyan ettiği ayar. Gerçekten farklı olabilir. */
  claimedKarat: Karat;
  claimedWeight: Grams | null;
  itemTypeLabel: string;
  /** Gözle görülebilen kondisyon. Gerçek kondisyondan daha iyimser olabilir. */
  visibleCondition: ConditionGrade;
  /** Damga/renk/biçim gibi doğrulanmamış ipuçları + kusur sinyalleri. */
  observableSignals: SuspicionSignal[];
}

/** GDD 28.2 · ItemInstance. */
export interface ItemInstance {
  id: string;
  templateId: string;
  family: ItemFamily;
  metal: MetalKind;
  displayName: string;

  /** Spawn anında sabitlenir; reload/reroll ile değişmez (GDD 5.4 / 34.1). */
  truth: HiddenTruth;
  declared: DeclaredInfo;

  /** Stoğa girdiyse dolar. */
  buyCost: Money | null;
  acquiredDay: GameDay | null;
  thesis: ExitChannel | null;
  location: 'customer' | 'display' | 'backStock' | 'workshop' | 'sold' | 'melted';
  flags: string[];
}

// ---------------------------------------------------------------------------
// Değerleme (GDD 6)
// ---------------------------------------------------------------------------

/**
 * Testlerin cevapladığı bilgi alanları (GDD 7.1 "Bilgi alanı ilkesi").
 * Her test farklı bir soruya cevap verir; hepsini basmak rasyonel değildir.
 */
export type InfoField = 'weight' | 'purity' | 'coreIntegrity' | 'stone' | 'condition';

/** Tek bir bilgi alanının bilinme durumu. */
export interface FieldKnowledge {
  field: InfoField;
  /** 0 = hiç bilinmiyor, 1 = kesin. Testlerle artar, diminishing return uygulanır. */
  certainty: number;
  /** Bu alanda çalışmış testlerin id listesi (diminishing return için). */
  testsApplied: string[];
  /** Oyuncuya gösterilecek durum metni. GDD 23.3 — "?" değil anlamlı durum. */
  status: 'unverified' | 'partial' | 'verified' | 'conflicting';
}

export type ConfidenceLevel = 'low' | 'medium' | 'high';

/** GDD 6.3 — değerleme motorunun resmi çıktısı. */
export interface ValuationBand {
  min: Money;
  max: Money;
  /** Bandın orta noktası; "adil fiyat" değil, karar referansıdır. */
  mid: Money;
  confidence: ConfidenceLevel;
  /** 0–1; bandın gerçek değere göre normalize genişliği. */
  relativeWidth: number;
  breakdown: ValuationBreakdown;
}

/** GDD 23.7 "Değerle" — metal / taş / işçilik / risk / piyasa satırları. */
export interface ValuationBreakdown {
  metal: Money;
  stone: Money;
  craftsmanship: Money;
  rarityPremium: Money;
  /** Negatif değer: kondisyon + kusur riski kesintisi. */
  riskDeduction: Money;
  /** Bilgilendirici: piyasa rejiminin bandı ne kadar genişlettiği. */
  marketInfluence: Money;
}

// ---------------------------------------------------------------------------
// Test araçları (GDD 7 / EK D)
// ---------------------------------------------------------------------------

export interface TestTool {
  id: string;
  name: string;
  /** GDD 23.11 — ikon tek başına anlam taşımaz, kısa metin etiketi zorunlu. */
  shortLabel: string;
  /** Hangi belirsizliği azaltır. */
  infoFields: InfoField[];
  /** Saniye cinsinden süre; müşteri sabrına maliyet. */
  durationSec: number;
  /** Sarf/bakım maliyeti. */
  cost: Money;
  /** 0–1; tek başına ne kadar güvenilir (yüksek = az hata). */
  reliability: number;
  /** Bu test tek seferde ilgili alanın belirsizliğini ne kadar kapatır (0–1). */
  certaintyGain: number;
  /** Hangi oyuncu seviyesinde açılır. */
  unlockLevel: number;
  description: string;
}

/** Bir testin çalıştırılmış sonucu. */
export interface TestResult {
  toolId: string;
  itemId: string;
  /** Testin oyuncuya söylediği okunabilir çıktı. */
  readout: string;
  /** Sonuç şüphe uyandırıyor mu (çelişkili sinyal). */
  raisesSuspicion: boolean;
  fields: InfoField[];
  /** GDD 7.2 — bu çağrıda gerçekte kazanılan kesinlik (azalan getiri sonrası). */
  effectiveGain: number;
  /** Müşteri sabrından düşülen miktar. */
  patienceCost: number;
  runAtSec: number;
}

// ---------------------------------------------------------------------------
// İşlem Tezi ve çıkış kanalları (GDD 8.1)
// ---------------------------------------------------------------------------

export type ExitChannel =
  | 'wholesale' // Toptan Likidite
  | 'retail' // Vitrin / Perakende
  | 'melt' // Eritme / HAS
  | 'serviceResale' // Servis + Satış
  | 'collection'; // Koleksiyon Bekletme

export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Ekonomi Ara Düzeltmesi §2.4 — "Toplu müşteri, toptancı ve esnaf ağı
 * birbirinden farklı hacim, fiyat, hız, risk ve ilişki davranışına sahip AYRI
 * ticari kanallardır."
 *
 * §8: "Toptancı ve esnaf ağı aynı fiyat/limit algoritmasının yalnızca farklı
 * isimleri olarak uygulanmaz." Her kanalın kendi profili vardır (channels.ts).
 */
export type TradeChannel =
  | 'retailCustomer' // Tekil müşteri — tezgâh
  | 'bulkCustomer' // Toplu sarrafiye müşterisi (§4.1)
  | 'wholesaler' // Toptancı — yüksek hacim, hızlı likidite (§4.2)
  | 'tradeNetwork'; // Esnaf ağı — yerel ilişki sermayesi (§8)

/** İşlemin yönü. §3 terminolojisi: "alış" = oyuncu satar, "satış" = oyuncu alır. */
export type TradeSide =
  | 'shopSells' // Müşteri alış intenti: oyuncu müşteriye sarrafiye satar
  | 'shopBuys'; // Müşteri satış intenti: müşteri oyuncuya sarrafiye satar
export type LiquidityLevel = 'low' | 'medium' | 'high';

/** GDD EK E — İşlem Tezi tasarım şablonu. */
export interface ThesisOption {
  channel: ExitChannel;
  label: string;
  /** Masraf ve iskontolar sonrası beklenen net gelir. */
  expectedNet: Money;
  /** Nakit ne zaman geri döner (oyun günü). */
  daysToCash: [number, number];
  marketRisk: RiskLevel;
  demandRisk: RiskLevel;
  /** Kapasite tüketimi: vitrin slotu / servis slotu. */
  capacityCost: { display: number; workshop: number };
  liquidity: LiquidityLevel;
  /** Bu kanalı baz alan alış tavanı (GDD 6.4). */
  buyCeiling: Money;
  /** Neden bu kanal rasyonel / değil. */
  rationale: string;
}

// ---------------------------------------------------------------------------
// Müşteri (GDD 9)
// ---------------------------------------------------------------------------

export type CustomerIntent =
  | 'sell' // Dükkana ürün satıyor / bozduruyor
  | 'buy' // Dükkandan ürün alıyor
  | 'service' // Servis istiyor
  | 'appraisal'; // Ekspertiz / danışma

/**
 * Ekonomi Ara Düzeltmesi §3 / GDD 23.23 — müşteri alış intentinde müşterinin
 * NE ARADIĞI. Ürünü müşteri getirmez, oyuncu stoktan seçer; bu yüzden alış
 * akışının girdisi kalem değil TALEPTİR.
 */
export interface CustomerDemand {
  /** UPDATEv5: one physical showcase object, never a substitutable template. */
  targetInventoryItemId?: string;
  fallbackDemand?: CustomerDemand;
  poolId?: '24K_GRAM_GOLD_POOL' | '22K_INVESTMENT_BANGLE_POOL' | 'QUARTER_GOLD_POOL';
  /** Aradığı ürün aileleri. Boşsa esnek müşteri. */
  families: string[];
  /** Sarrafiye mi arıyor, işçilikli mi. */
  wantsBullion: boolean;
  /** Doğrudan istediği ürün şablonu (sarrafiyede sık). */
  templateId: string | null;
  /** Kaç adet istiyor (§4.1 toplu müşteride bandın üstü). */
  quantity: number;
  /**
   * §4.1 toplu müşteri mi. "Toplu müşteri, normal tekil müşterinin sadece
   * yüksek adetli kopyası DEĞİLDİR" — bu bayrak yalnız adedi değil, bütçe,
   * fiyat hassasiyeti, sabır ve güven davranışını da değiştirir.
   */
  isBulk: boolean;
  /** §4.1 "kısmi karşılama": bu adedin altını kabul eder mi. */
  acceptsPartial: boolean;
  /** En az kaç adet kabul eder. acceptsPartial false ise quantity'ye eşittir. */
  minQuantity: number;
  /** Talebin okunabilir özeti — müşteri şeridinde gösterilir. */
  summary: string;
  /**
   * Somut ürün adı dışında NELERİN kabul edildiği, oyuncunun dilinde
   * ("klasik takı / gümüş"). Talep tam o ürünle sınırlı değildir; bunu
   * söylemezsek oyuncu yakın bir ürünü sunabileceğini bilemez.
   * Sarrafiyede boştur — orada zaten her sarrafiye kabul edilir.
   */
  alternativesLabel: string;
}

export type ArchetypeId =
  | 'urgentCash' // Acil nakit arayan
  | 'investor' // Yatırımcı
  | 'giftBuyer' // Hediye alıcısı
  | 'weddingShopper' // Düğün müşterisi
  | 'collector' // Koleksiyoncu
  | 'vip' // VIP
  | 'informedSeller' // Bilinçli satıcı
  | 'opportunist'; // Fırsatçı

/** GDD EK C — müşteri arketipi tasarım şablonu. */
export interface Archetype {
  id: ArchetypeId;
  name: string;
  /** Davranış etiketi — UI'da müşteri şeridinde görünür. */
  demeanor: string;
  patienceBand: [Scale100, Scale100];
  knowledgeBand: [Scale100, Scale100];
  urgencyBand: [Scale100, Scale100];
  priceSensitivityBand: [Scale100, Scale100];
  statusBand: [Scale100, Scale100];
  /** Rezervasyon fiyatının adil değere oranı bandı (satarken). */
  reservationRatioBand: [number, number];
  /** Kapanış skoru eşiği — profile göre değişir (GDD 11.3). */
  closeThreshold: number;
  /** Gerekçe hamlesine tepki çarpanı. */
  reasonResponsiveness: number;
  /** Jest hamlesine tepki çarpanı. */
  gestureResponsiveness: number;
  goodStrategy: string;
  badStrategy: string;
  preferredFamilies: ItemFamily[];
}

/** GDD 28.2 · Customer. */
export interface Customer {
  id: string;
  displayName: string;
  archetype: ArchetypeId;
  intent: CustomerIntent;

  // --- Spawn anında sabitlenenler (GDD 9.3) ---
  patienceMax: Scale100;
  knowledge: Scale100;
  urgency: Scale100;
  priceSensitivity: Scale100;
  status: Scale100;
  budget: Money;
  /** Gerçek kabul sınırı. Oyuncuya asla doğrudan gösterilmez (GDD 6.6). */
  reservationPrice: Money;
  /**
   * Müşteri alış intentinde ÖDEME TAVANI oranı — adil değerin kaç katına
   * kadar çıkar. GDD 34.2 gereği spawn anında sabitlenir; tavarın kendisi
   * seçilen pakete göre türer çünkü paketi oyuncu belirler.
   */
  purchaseCeilingRatio: number;
  /** Müşteri alış intentinde ne aradığı; diğer niyetlerde null. */
  demand: CustomerDemand | null;

  // --- İşlem sırasında değişenler (GDD 9.4) ---
  patience: Scale100;
  /** Mağaza güveni — kişisel hafızadan gelir, işlem içinde de değişir. */
  trust: Scale100;
  suspicion: Scale100;

  visitHistory: VisitRecord[];
  preferences: string[];
  referralSource: string | null;

  /** Bu ziyarette getirdiği kalemler. Çoklu ürün müşterisinde 2–4 (GDD 12). */
  lineIds: string[];
}

export interface VisitRecord {
  day: GameDay;
  dealId: string | null;
  outcome: 'accepted' | 'rejected' | 'walkedOut' | 'serviceBooked';
  /** Bu ziyaretin kişisel güvene etkisi. */
  trustDelta: number;
  note: string;
}

// ---------------------------------------------------------------------------
// Pazarlık (GDD 11)
// ---------------------------------------------------------------------------

/** GDD 11.1 durum makinesi. */
export type NegotiationState = 'OPEN' | 'HARDENING' | 'FINAL_OFFER' | 'ACCEPTED' | 'REJECTED';

export type NegotiationMoveKind =
  | 'offer' // Net teklif
  | 'reason' // Gerekçe göster
  | 'gesture' // Jest yap
  | 'package' // Paket teklif
  | 'requestCounter' // Karşı teklif iste
  | 'reject' // İşlemi reddet
  | 'acceptCounter'; // Müşterinin karşı teklifini kabul et

export interface NegotiationMove {
  kind: NegotiationMoveKind;
  amount?: Money;
  /** 'reason' hamlesi için: hangi doğrulanmış veriye dayanıyor (GDD 11.5). */
  reasonEvidence?: { field: InfoField; toolId: string; claim: string };
  atRound: number;
}

/** Müşterinin bir hamleye verdiği deterministik yanıt. */
export interface NegotiationResponse {
  state: NegotiationState;
  /** Müşteri mesajı — aynı yüzeyde gösterilir, yeni ekran açmaz (GDD 23.24). */
  message: string;
  counterOffer: Money | null;
  patienceDelta: number;
  trustDelta: number;
  suspicionDelta: number;
  /** Anti-spam: aynı/çok yakın teklif tekrarlandı mı (GDD 11.4). */
  wasRepeatOffer: boolean;
  /** Terminal durumda anlaşılan fiyat. */
  settledPrice: Money | null;
}

/** Bir kalem için pazarlık oturumu. Çoklu üründe kalem başına ayrıdır (GDD 12.1). */
export interface NegotiationSession {
  lineId: string;
  itemId: string;
  state: NegotiationState;
  round: number;
  offerHistory: Money[];
  moveHistory: NegotiationMove[];
  /** Müşterinin masadaki son karşı teklifi. */
  activeCounter: Money | null;
  /** FINAL_OFFER durumundaki geri dönülmez fiyat. */
  finalOffer: Money | null;
  settledPrice: Money | null;
  /** Kullanılmış gerekçe kanıtları — aynı gerekçe iki kez değer üretmez. */
  usedReasons: string[];
  gesturesUsed: number;
}

// ---------------------------------------------------------------------------
// Piyasa (GDD 13)
// ---------------------------------------------------------------------------

export type MarketRegime = 'calm' | 'normal' | 'volatile' | 'shock';

export interface MarketAsset {
  id: 'goldGram' | 'silverGram' | 'usd' | 'eur' | 'quarterGold';
  label: string;
  price: number;
  /** Gün açılışına göre yüzde değişim. */
  changePct: number;
  /** Kısa trend serisi — mini grafik için. */
  history: number[];
  unit: string;
}

export interface MarketEvent {
  id: string;
  label: string;
  description: string;
  /** Etkilediği sistemler — GDD 20.2 "en az iki sistem". */
  affects: string[];
  counterplay: string[];
  startedDay: GameDay;
  durationDays: number;
}

/** GDD 28.2 · MarketState. */
export interface MarketState {
  day: GameDay;
  /** Dakika cinsinden gün içi saat (açılış 09:00 = 540). */
  clockMinutes: number;
  goldSpot: number;
  silverSpot: number;
  fxIndex: number;
  regime: MarketRegime;
  /** Günün ana yönü: -1 düşüş, 0 yatay, +1 yükseliş. */
  trend: -1 | 0 | 1;
  volatility: number;
  activeEvent: MarketEvent | null;
  assets: MarketAsset[];
  /** Gün içi ±%3 bandının sabit açılış çapası. */
  dayOpen?: { goldSpot: number; silverSpot: number; fxIndex: number };
  /**
   * Yaklaşık 100 açık günlük hafızayla fiyatı izleyen makro çapa. Eski
   * kayıtlarda yoksa başlangıç referanslarından geriye uyumlu kurulur.
   */
  macroAnchor?: { goldSpot: number; silverSpot: number; fxIndex: number };
  /** Cumartesi–pazar false; kotasyon ve gün içi hareket donar. */
  marketOpen?: boolean;
  /** Pazartesi açılışında biriken kapalı gün sayısı (normalde 2). */
  gapDays?: number;
  /** Son uygulanmış 15 dakikalık kova; aynı hareketin tekrar bileşikleşmesini engeller. */
  lastIntradayStepIndex?: number;
  /** QA aynı günü tekrar oynayabilsin diye (GDD 28.3). */
  seed: number;
}

// ---------------------------------------------------------------------------
// Mağaza / işletme (GDD 14, 28.2)
// ---------------------------------------------------------------------------

/** GDD 28.2 · InventoryPosition. */
export interface InventoryPosition {
  poolId?: CustomerDemand['poolId'];
  quantityMg?: number;
  averageCostPerUnit?: number;
  itemId: string;
  /**
   * Bu pozisyondaki ADET.
   *
   * GDD 22.1: "Maliyet tabanı aynı stok birleştiğinde ağırlıklı/gerçek
   * maliyetle güncellenir." Sarrafiye standart üründür ve yığılır; işçilikli
   * ürün ayrılabilir kalemdir ve her zaman 1 adet kalır.
   *
   * Addendum §4.1 toplu müşterisi bu alan olmadan yalanmış olurdu: 40 çeyrek
   * isteyen müşteriyi 40 ayrı pozisyonla karşılamak, sarrafiyeyi adetle değil
   * kalemle ticaret yapmak demekti.
   */
  quantity: number;
  /** TOPLAM maliyet tabanı (adet dahil). Birim maliyet = costBasis / quantity. */
  costBasis: Money;
  /** TOPLAM güncel değer (adet dahil). */
  currentValue: Money;
  /** Stokta bekleme günü. */
  age: number;
  demand: 'cold' | 'steady' | 'hot';
  thesis: ExitChannel | null;
  location: 'display' | 'backStock' | 'workshop';
  expectedExitValues: Partial<Record<ExitChannel, Money>>;
}

/**
 * Ekonomi Ara Düzeltmesi §8 — ESNAF AĞI ÜYESİ.
 *
 * DEĞİŞMEZ (§8): "Esnaf ağı, toptancının yerine geçen SINIRSIZ İKİNCİ BANKA
 * DEĞİLDİR. Yerel ilişki sermayesine dayanan, daha küçük ölçekli ve KOŞULLU
 * bir ticari dayanışma kanalıdır."
 *
 * Bu yüzden ağ tek bir hesap değil, her biri kendi kasası, kendi iştahı ve
 * kendi ilişkisi olan ÜYELERDEN oluşur. Tek hesap olsaydı toptancının küçük
 * boy kopyası olurdu — §8'in son cümlesinin yasakladığı şey.
 */
export interface TradeNetworkMember {
  id: string;
  displayName: string;
  /** Esnafın işi — kimin sarrafiye aldığını belirler (§8 "uygun esnafta"). */
  craft: 'kuyumcu' | 'sarraf' | 'saatci' | 'tefeci' | 'manifaturaci';
  /** Yerel ilişki sermayesi (0–100). */
  trust: Scale100;
  /**
   * Elindeki nakit. §8 "Ağ kapasitesi SONLUDUR" — bir esnafın kasası
   * bittiğinde daha fazla bozdurma yapılamaz, fiyat ne olursa olsun.
   */
  cashOnHand: Money;
  /** Sarrafiye alma iştahı (0–1). Düşükse bu esnaf altın bozmaz. */
  bullionAppetite: number;
  /** Açık kısa vadeli borç; üye başına en fazla bir tane. */
  loan: NetworkLoan | null;
  /** Geçmiş davranış — §8 "güven, GEÇMİŞ DAVRANIŞ, açık borç ve vade sınırı". */
  history: { repaidOnTime: number; repaidLate: number };
}

/** §8 "Kısa vadeli ticari borç". */
export interface NetworkLoan {
  id: string;
  memberId: string;
  principal: Money;
  /** Anapara + ücret; kapanışta ödenecek toplam. */
  totalDue: Money;
  dueDay: GameDay;
  takenDay: GameDay;
}

/** GDD 28.2 · SupplierAccount. */
export interface SupplierAccount {
  trust: Scale100;
  limit: Money;
  /** Vade gün sayısı. */
  terms: number;
  openInvoices: { id: string; amount: Money; dueDay: GameDay }[];
  priceBand: number;
  specialLotEligibility: boolean;
}

/** İşi kimin yaptığı — GDD 17.2 "Dış usta → kendi atölyesi". */
export type ServiceVenue = 'inHouse' | 'outsourced';

/** GDD 28.2 · ServiceJob. */
export interface ServiceJob {
  jobId: string;
  type: string;
  itemId: string;
  customerId: string | null;
  /** Müşteri adı — kuyrukta kimin işi olduğu görünür (GDD 23.18). */
  customerName: string;
  itemName: string;
  /** Toplam süre (oyun günü). */
  duration: number;
  /** Kalan süre (oyun günü). */
  remainingDays: number;
  /** 0–1 hata olasılığı (GDD 35 formülü). Oyuncuya işlem öncesi gösterilir. */
  risk: number;
  partsCost: Money;
  assignedStaff: string | null;
  /** Kendi atölye mi dış usta mı (GDD 17.2). */
  venue: ServiceVenue;
  /** Dış ustaya ödenen pay. */
  outsourceCost: Money;
  /** Müşteriye verilen teslim günü — kişisel güvenin parçası (GDD 17.3). */
  promisedDay: GameDay;
  /** Sistemin beklediği bitiş günü; sözden erken/geç olabilir. */
  expectedDay: GameDay;
  fee: Money;
  /**
   * Sonuç SPAWN ANINDA sabitlenir (GDD 28.3 determinizm sözleşmesi).
   * Oyuncuya risk yüzdesi gösterilir, sonuç gösterilmez — reload ile
   * yeniden zar atılamaz.
   */
  predeterminedOutcome: 'success' | 'failed';
  result: 'pending' | 'success' | 'failed' | 'delivered';
  /** Hata durumunda ödenen tazmin (GDD 21.2). */
  compensation: Money;
  acceptedDay: GameDay;
}

/** Tanılama sonucu — Servis Kabul akışının ilk adımı (GDD 23.14 "Tanıla"). */
export interface ServiceDiagnosis {
  /** Üründe okunabilir biçimde tespit edilen sorun. */
  problemLabel: string;
  /** Bu üründe rasyonel olan servis türleri. */
  availableTypeIds: string[];
  /** Servis sonrası ulaşılabilecek kondisyon. */
  targetCondition: ConditionGrade;
}

/** Bir servis türü için hesaplanmış teklif (GDD 23.14 "Teklif"). */
export interface ServiceQuote {
  typeId: string;
  label: string;
  venue: ServiceVenue;
  /** Müşteriden alınacak ücret. */
  fee: Money;
  /** İşçilik maliyeti — kendi zamanın; nakit çıkışı değildir ama marjın parçasıdır. */
  laborCost: Money;
  partsCost: Money;
  outsourceCost: Money;
  /** Ücret − parça − dış usta (GDD 22.4 "Servis net katkısı"). */
  netContribution: Money;
  durationDays: number;
  /** 0–1 hata olasılığı. */
  risk: number;
  /** Kapasite slotu tüketir mi. */
  usesCapacity: boolean;
  /** Neden bu seçenek — kısa gerekçe satırı. */
  rationale: string;
  /** Kapasite doluysa veya seviye yetmiyorsa neden seçilemez. */
  blockedReason: string | null;
}

/** Servis Kabul akışının çalışma durumu. */
export interface ServiceSession {
  diagnosis: ServiceDiagnosis | null;
  quotes: ServiceQuote[];
  selectedTypeId: string | null;
  selectedVenue: ServiceVenue;
  /** Söz verilen teslim gününe eklenen tampon (0 = en sıkı söz). */
  promiseBufferDays: number;
  /** Kabul edildiyse oluşan iş. */
  createdJobId: string | null;
  outcome: 'pending' | 'accepted' | 'declined';
}

// ---------------------------------------------------------------------------
// Ekspertiz / danışma akışı (GDD 23.23 · beşinci akış)
// ---------------------------------------------------------------------------

/**
 * Oyuncunun raporda ne kadar kesin konuştuğu. Ölçümü değil, ölçümün
 * SUNUMUNU seçer — bkz. appraisal.ts.
 */
export type AppraisalStance = 'cautious' | 'measured' | 'assertive';

/** GDD 23.23 "İncele → Test → Rapor/Ücret → Sonuç" oturum durumu. */
export interface AppraisalSession {
  /** Rapor duruşu; seçilmeden rapor verilemez. */
  stance: AppraisalStance | null;
  /** Oyuncunun istediği ücret. */
  fee: Money;
  /** Rapor verildiyse sonucu; verilmediyse null. */
  verdict: AppraisalOutcome | null;
  outcome: 'pending' | 'reported' | 'declined';
}

/**
 * `AppraisalVerdict`in types katmanındaki karşılığı. Domain tarafı bu şekli
 * üretir; save ve UI bu şekli okur.
 */
export interface AppraisalOutcome {
  paid: boolean;
  fee: Money;
  reported: { min: Money; max: Money };
  actualValue: Money;
  accurate: boolean;
  missRatio: number;
  trustDelta: number;
  reputationDelta: number;
  summary: string;
}

/** GDD 28.2 · StoreState. */
export interface StoreState {
  /** Queue personnel are distinct from workshop staff/masters. */
  personnelCount?: number;
  hasBalanceMg?: number;
  hasCostBasis?: number;
  name: string;
  cash: Money;
  reputation: Scale100;
  level: number;
  xp: number;
  xpToNext: number;
  storeTier: 1 | 2 | 3 | 4 | 5;
  displaySlots: number;
  backStockSlots: number;
  workshopCapacity: number;
  staff: string[];
  supplier: SupplierAccount;
  payables: { id: string; amount: Money; dueDay: GameDay; label: string }[];
  /** Günlük kira + sabit gider (GDD 14.1). */
  dailyOverhead: Money;
}

// ---------------------------------------------------------------------------
// İşlem kaydı ve settlement (GDD 22)
// ---------------------------------------------------------------------------

/** GDD 28.2 · DealRecord. */
export interface DealRecord {
  dealId: string;
  customerId: string;
  lineIds: string[];
  itemIds: string[];
  side: 'buy' | 'sell' | 'service' | 'appraisal';
  day: GameDay;
  clockMinutes: number;

  // Değerleme
  testsUsed: string[];
  estimateBand: { min: Money; max: Money };
  confidence: ConfidenceLevel;
  /** Sonradan açılan rapor için gerçek değer. */
  actualValue: Money;

  // Pazarlık
  offerHistory: Money[];
  finalState: NegotiationState;
  movesUsed: NegotiationMoveKind[];

  // Ekonomi
  thesisAtDeal: ExitChannel | null;
  price: Money;
  costBasis: Money;

  /**
   * Addendum §4.1 TELEMETRİSİ: "Toplu işlemler tekil müşteri metriğini
   * ŞİŞİRMEMELİ; adet, gram karşılığı, ciro, brüt marj ve KANAL BAZINDA
   * ayrıca ölçülmelidir."
   *
   * Bu üç alan olmadan 40 çeyreklik tek işlem, defterde tek çeyreklik bir
   * işlemle aynı satırda görünürdü ve ortalama marj yalan söylerdi.
   */
  units: number;
  grams: number;
  channel: TradeChannel | null;
  isBulk: boolean;
  /** Yalnız tamamlanmış satışta dolar; stok potansiyeli buraya yazılmaz (GDD 34.5). */
  realizedProfit: Money | null;

  // İlişki
  trustDelta: number;
  reputationDelta: number;

  // Öğrenme (GDD 22.3)
  reviewData: {
    missedSignals: string[];
    keyDecisionPoint: string;
    alternativeChannelNote: string;
  };
}

/**
 * Tek settlement kuralı (GDD 22.1 / 34.4).
 * Her ekonomik olay benzersiz transaction ID taşır; uygulanmış ID ikinci kez işlenmez.
 */
/** Stoktan çıkan adet — kısmi satış için (Addendum §4.1). */
export interface StockOut {
  itemId: string;
  quantity: number;
}

export interface SettlementTransaction {
  /** Canonical pool intake: grams, quarters or 10g bangle units. */
  poolPurchase?: { quantity: number };
  hasDeltaMg?: number;
  hasCostDelta?: number;
  hasOperation?: 'buy' | 'sell' | 'melt';
  targetInventoryItemId?: string;
  txId: string;
  dealId: string;
  day: GameDay;
  cashDelta: Money;
  /** Stoğa giren kalemler. Her biri 1 adettir; yığılabilir ürün birleşir. */
  itemsIn: ItemInstance[];
  /** Stoktan çıkan adetler. Kısmi çıkış için adet taşır (§4.1). */
  itemsOut: StockOut[];
  trustDelta: number;
  reputationDelta: number;
  xpDelta: number;
  label: string;
}

// ---------------------------------------------------------------------------
// İşlem Masası aşamaları (GDD 23.6 / 23.10.2)
// ---------------------------------------------------------------------------

/**
 * İşlem Masası aşamaları.
 *
 * İlk dördü çekirdek ticaret akışıdır (GDD 23.6). Son üçü Servis Kabul
 * akışıdır — GDD 23.10.3: "Servis müşterisinde standart dört aşama yerine
 * Servis Kabul akışı kullanılır: Tanıla → Süre/Risk/Fiyat → Teslim Sözü →
 * Atölye Kuyruğu." İki akış aynı Workbench yüzeyini paylaşır; ayrı tam ekran
 * açılmaz (GDD 23.24).
 */
export type WorkbenchStage =
  | 'inspect'
  | 'appraise'
  | 'thesis'
  | 'negotiate'
  | 'result'
  // --- Servis Kabul akışı (GDD 23.14) ---
  | 'diagnose' // Tanıla
  | 'quote' // Süre / Risk / Fiyat
  | 'promise' // Teslim Sözü
  | 'jobQueue' // Atölye Kuyruğu
  // --- Müşteri alış akışı (GDD 23.23 · Addendum §3) ---
  | 'stockPick' // Stok seçimi
  | 'package' // Değer / Paket
  // --- Ekspertiz / danışma akışı (GDD 23.23 · beşinci akış) ---
  | 'test' // Test
  | 'report'; // Rapor / Ücret

/** Bir akışın hangi aşama dizisini kullandığı. */
export type DealFlow = 'trade' | 'service' | 'purchase' | 'appraisal';

/**
 * Müşteri alış akışının oturum durumu (GDD 23.23:
 * Stok seçimi → Değer/Paket → Pazarlık).
 */
/** Pakete konan bir stok satırı (Addendum §4.1). */
export interface PackageLine {
  itemId: string;
  quantity: number;
}

export interface PurchaseSession {
  demand: CustomerDemand;
  /**
   * Oyuncunun pakete koyduğu stok satırları. Sarrafiyede bir satır birden
   * çok ADET taşıyabilir (§4.1); işçilikli üründe adet 1'dir.
   */
  lines: PackageLine[];
  /** Paketin adil değeri (GDD 6.2 çıktısı; kanal katmanı öncesi). */
  packageFairValue: Money;
  /** Kanal fiyatlamasının önerdiği satış fiyatı (Addendum §6). */
  suggestedPrice: Money;
  /** Hangi kanal profiliyle fiyatlandı — adet talebe göre değişir (§4.1). */
  channel: TradeChannel;
  /** Paketin maliyet toplamı — kâr hesabı için (GDD 22.1 tek settlement). */
  packageCost: Money;
  /** Pakete konan toplam adet (§4.1 telemetrisi). */
  units: number;
  /** Talep tam mı karşılandı, kısmi mi (§4.1). */
  fulfilment: 'none' | 'partial' | 'full';
  /** Paketin fiyat gerekçesi — oyuncuya gösterilir. */
  rationale: string;
}

/** Aktif müşteri işleminin, bir kaleme ait çalışma durumu. */
export interface DealLine {
  lineId: string;
  itemId: string;
  knowledge: FieldKnowledge[];
  testResults: TestResult[];
  band: ValuationBand | null;
  thesisOptions: ThesisOption[];
  selectedThesis: ExitChannel | null;
  negotiation: NegotiationSession;
  /** Kalem şeridi status dot'u (GDD 23.13). */
  status: 'untouched' | 'appraised' | 'offered' | 'accepted' | 'rejected';
}

/** Aktif müşteri oturumu. Sabır ve güven ortak, kalem state'leri ayrı (GDD 12.1). */
export interface ActiveDeal {
  dealId: string;
  customerId: string;
  /** Hangi aşama dizisi kullanılıyor (GDD 23.23 intent matrisi). */
  flow: DealFlow;
  stage: WorkbenchStage;
  activeLineId: string;
  lines: DealLine[];
  /** Servis akışında dolu; diğer akışlarda null. */
  service: ServiceSession | null;
  /** Müşteri alış akışında dolu; diğer akışlarda null. */
  purchase: PurchaseSession | null;
  /** Ekspertiz akışında dolu; diğer akışlarda null. */
  appraisal: AppraisalSession | null;
  startedAtSec: number;
  /** Terminal settlement uygulandı mı — çift tap koruması (GDD 22.1). */
  settled: boolean;
}
