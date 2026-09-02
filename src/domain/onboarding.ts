/**
 * MIHENKAYNAK — Onboarding (GDD 25)
 * MVP kapsamı: GDD 30.2 listesinde "5–7 dakikalık öğretim akışı".
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * NE YAPAR, NE YAPMAZ
 *
 * Bu dosya SAHTE BİR OYUN KURMAZ. Senaryolu müşteri, betimlenmiş ürün,
 * "şimdi şuraya bas" zorlaması yoktur. Oyuncu ilk günden gerçek oyunu oynar;
 * onboarding yalnız o anda ekranda olan şeyi ADLANDIRIR.
 *
 * Sebebi ilkesel: bu oyunun öğretme biçimi zaten deal-review'dur — GDD 20'nin
 * "işlem sonrası öğretici geri bildirim" döngüsü. Ayrı bir tutorial oyunu
 * kurmak, oyuncuya oynayacağı oyundan başka bir şey öğretmek olurdu.
 *
 * DEĞİŞMEZ: hiçbir ders yeni mekanik getirmez, hiçbir ders akışı
 * DEĞİŞTİRMEZ. Ders gösterilmese de oyun birebir aynı çalışır — bu yüzden
 * tamamı atlanabilir ve atlanınca hiçbir şey eksik kalmaz.
 *
 * DEĞİŞMEZ (GDD 6.6): hiçbir ders gizli gerçeği söylemez. Dersler kuralı
 * anlatır, o kalemin cevabını değil.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { TransactionClass } from './transaction-class';
import type { DealFlow, GameDay, WorkbenchStage } from './types';

/** Bir dersin tetiklenip tetiklenmeyeceğine karar vermek için gereken her şey. */
export interface CoachContext {
  day: GameDay;
  /** Tezgâhta müşteri var mı. */
  hasCustomer: boolean;
  /** Kuyrukta bekleyen müşteri sayısı. */
  queueLength: number;
  /** Aktif işlemin akışı; müşteri yoksa null. */
  flow: DealFlow | null;
  /** Aktif aşama; müşteri yoksa null. */
  stage: WorkbenchStage | null;
  /** Aktif kalemin işlem sınıfı (§2); yoksa null. */
  transactionClass: TransactionClass | null;
  /** Bu kalemde kaç test yapıldı. */
  testsRun: number;
  /** Değerleme bandı oluştu mu. */
  hasBand: boolean;
  /** Stokta kaç adet var. */
  stockUnits: number;
}

export interface Lesson {
  id: string;
  /** Kısa başlık — tek satır. */
  title: string;
  /** Bir–iki cümle. Uzun metin telefonda okunmaz. */
  body: string;
  /**
   * Ders bu bağlamda gösterilmeli mi.
   *
   * Saf fonksiyon: aynı bağlam her zaman aynı cevabı verir. Yan etkisi yok,
   * bu yüzden sırayı bozmadan test edilebilir.
   */
  when: (ctx: CoachContext) => boolean;
}

/**
 * Dersler ÖĞRETİM SIRASINDA durur; ilk eşleşen gösterilir.
 *
 * Sıra önemlidir çünkü bir oyuncu aynı anda birden çok koşulu sağlayabilir
 * (ilk müşteri + ilk inceleme). Önce gelen kazanır ve diğeri sıradaki uygun
 * ana kadar bekler — aynı anda iki ders göstermek öğretmek değil, boğmaktır.
 */
export const LESSONS: Lesson[] = [
  {
    id: 'welcome',
    title: 'Dükkân senin',
    body:
      'Kasandaki parayla mal alır, aldığından pahalıya satarsın. Her gün kira ve gider işler; ' +
      'günü kârla kapatmak senin işin.',
    when: (c) => c.day === 1 && !c.hasCustomer,
  },
  {
    id: 'greet',
    title: 'Müşteri kapıda',
    body: 'Karşıla ve ne istediğine bak. Satan da var, alan da, tamir isteyen de.',
    when: (c) => !c.hasCustomer && c.queueLength > 0,
  },
  {
    id: 'fastFlow',
    title: 'Sarrafiyede test şart değil',
    body:
      'Standart sarrafiyenin gramajı ve ayarı bellidir. Şüpheli bir hâli yoksa doğrudan ' +
      'fiyata geçebilirsin.',
    when: (c) => c.stage === 'inspect' && c.transactionClass === 'fast',
  },
  {
    id: 'inspect',
    title: 'Gördüğün beyandır',
    body:
      'Müşterinin söylediği ağırlık ve ayar doğrulanmış değil. Raydaki araçlar bu belirsizliği ' +
      'para ve müşteri sabrı karşılığında azaltır.',
    when: (c) =>
      c.stage === 'inspect' &&
      c.flow === 'trade' &&
      c.transactionClass !== 'fast' &&
      c.testsRun === 0,
  },
  {
    id: 'appraise',
    title: 'Aralık ne kadar dar, o kadar iyi',
    body:
      'Test yaptıkça tahmini değer aralığı daralır. Dar aralık, daha yüksek fiyat verebilmen ' +
      'demektir — belirsizliğin bedelini sen ödersin.',
    when: (c) => c.stage === 'appraise' && c.hasBand,
  },
  {
    id: 'thesis',
    title: 'Önce nereye satacağını seç',
    body:
      'Çıkış planın alış tavanını belirler: tezgâhta beklemek pahalıya satar ama yavaştır, ' +
      'toptancı hemen öder ama ucuza alır.',
    when: (c) => c.stage === 'thesis',
  },
  {
    id: 'negotiate',
    title: 'Tavanın üstü zarardır',
    body:
      'Alış tavanı, bu plandan kâr edebileceğin en yüksek fiyat. Müşteri kabul etmezse karşı ' +
      'teklif verir; aynı rakamı tekrar göndermek yeni bir cevap getirmez.',
    when: (c) => c.stage === 'negotiate',
  },
  {
    id: 'stock',
    title: 'Aldığın mal stoğa düşer',
    body:
      'Stok ekranından ne tuttuğunu, maliyetini ve bugünkü değerini görürsün. Nakit ile altın ' +
      'arasındaki denge de orada.',
    when: (c) => c.stockUnits > 0 && !c.hasCustomer,
  },
];

export const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.id, l]));

/**
 * Şu an gösterilecek ders — yoksa null.
 *
 * `seen` görülmüş ders kimlikleri. Bir ders bir kez gösterilir; kapatıldıktan
 * sonra bir daha çıkmaz. Kayıtla birlikte taşınır, yoksa her yüklemede
 * baştan anlatılırdı.
 */
export function nextLesson(ctx: CoachContext, seen: readonly string[]): Lesson | null {
  return LESSONS.find((l) => !seen.includes(l.id) && l.when(ctx)) ?? null;
}

/** Öğretim tamamlandı mı — tüm dersler görüldüyse. */
export function onboardingComplete(seen: readonly string[]): boolean {
  return LESSONS.every((l) => seen.includes(l.id));
}

/** "Tümünü atla" — kalan tüm dersleri görülmüş sayar. */
export function skipAll(seen: readonly string[]): string[] {
  return [...new Set([...seen, ...LESSONS.map((l) => l.id)])];
}
