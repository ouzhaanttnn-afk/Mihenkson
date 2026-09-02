/**
 * MIHENKAYNAK — Servis türleri
 * Kaynak: GDD 17.1 "Servis türleri" tablosu.
 *
 * GDD 28.1: içerik koddan ayrık veri tanımıdır — bu dosya mantık içermez.
 * GDD 29.1 içerik matrisi: Vertical Slice 1–2, MVP 3, 1.0 6+ servis türü.
 * Yedi tür tanımlıdır; `unlockLevel` ile kademelenir, erken oyunda üçü açıktır.
 *
 * GDD 17.4 DEĞİŞMEZ: Hiçbir tür pasif gelir üretmez. Her tür kapasite, süre,
 * parça maliyeti ve hata riski taşır.
 */

import type { ConditionGrade } from '@domain/types';

export interface ServiceTypeDef {
  id: string;
  label: string;
  /** Araç Rayı etiketi — kısa metin zorunlu (GDD 23.24). */
  shortLabel: string;
  description: string;

  /** GDD 17.1 "Süre" sütunu — oyun günü. */
  durationDays: number;

  /**
   * GDD 35 "Servis Hata Riski = İş zorluğu + yoğunluk − personel becerisi
   * − ekipman bonusu" formülündeki iş zorluğu terimi (0–1).
   */
  difficulty: number;

  /**
   * İşçilik ücretinin, ürünün bugünkü değerine oranı. Servis ücreti bundan
   * ve parça maliyetinden türer.
   */
  laborRatio: number;

  /** Parça maliyetinin ürün değerine oranı. 0 = parça gerekmiyor. */
  partsRatio: number;

  /**
   * Bu servis kondisyonu kaç kademe iyileştirir.
   * 0 = kondisyona dokunmaz (gravür, ekspertiz gibi).
   */
  conditionSteps: number;

  /** Bu servisin uygulanabilmesi için gereken kondisyon durumu. */
  appliesTo: ConditionGrade[];

  /** Yalnız taşlı üründe anlamlı mı. */
  requiresStone: boolean;

  /** Bu türün açıldığı oyuncu seviyesi. */
  unlockLevel: number;

  /** Müşteri memnuniyetine ek katkı — premium/uzmanlık servisleri (GDD 17.1). */
  trustBonus: number;

  /** Tasarım notu — türün oyundaki rolü. */
  designNote: string;
}

export const SERVICE_TYPES: ServiceTypeDef[] = [
  {
    id: 'clean',
    label: 'Temizlik / Parlatma',
    shortLabel: 'Temizlik',
    description: 'Yüzey kiri ve matlık giderilir; kondisyon bir kademe iyileşir.',
    durationDays: 1,
    difficulty: 0.05,
    laborRatio: 0.035,
    partsRatio: 0,
    conditionSteps: 1,
    appliesTo: ['worn', 'good'],
    requiresStone: false,
    unlockLevel: 1,
    trustBonus: 2,
    designNote:
      'GDD 17.1 "Kısa süre, çok düşük risk, hızlı nakit". Servis sisteminin güvenli giriş kapısı.',
  },
  {
    id: 'ringSize',
    label: 'Yüzük Ölçüsü',
    shortLabel: 'Ölçü',
    description: 'Yüzük ölçüsü müşteriye göre ayarlanır. Saf işçilik geliri.',
    durationDays: 2,
    difficulty: 0.18,
    laborRatio: 0.07,
    partsRatio: 0.01,
    conditionSteps: 0,
    appliesTo: ['pristine', 'good', 'worn'],
    requiresStone: false,
    unlockLevel: 1,
    trustBonus: 3,
    designNote: 'GDD 17.1 "Orta süre, düşük risk, işçilik". Kondisyona dokunmaz.',
  },
  {
    id: 'chainRepair',
    label: 'Zincir / Kilit Tamiri',
    shortLabel: 'Tamir',
    description: 'Kopan halka veya bozuk kilit onarılır; parça maliyeti vardır.',
    durationDays: 2,
    difficulty: 0.34,
    laborRatio: 0.08,
    partsRatio: 0.035,
    conditionSteps: 2,
    appliesTo: ['damaged', 'broken', 'worn'],
    requiresStone: false,
    unlockLevel: 1,
    trustBonus: 4,
    designNote:
      'GDD 17.1 "Orta süre, orta risk, işçilik + parça". MVP üçlüsünün üçüncüsü; kondisyon kurtarmanın ana aracı.',
  },
  {
    id: 'stoneSet',
    label: 'Taş Sıkıştırma',
    shortLabel: 'Taş',
    description: 'Gevşemiş taş yuvasına sabitlenir. Uzmanlık ister, güven kazandırır.',
    durationDays: 2,
    difficulty: 0.42,
    laborRatio: 0.09,
    partsRatio: 0.015,
    conditionSteps: 1,
    appliesTo: ['worn', 'damaged', 'good'],
    requiresStone: true,
    unlockLevel: 3,
    trustBonus: 7,
    designNote: 'GDD 17.1 "Uzmanlık + müşteri güveni". Yalnız taşlı üründe görünür.',
  },
  {
    id: 'engraving',
    label: 'Özel Gravür',
    shortLabel: 'Gravür',
    description: 'Kişiye özel gravür işlenir. Premium servis, düşük risk.',
    durationDays: 1,
    difficulty: 0.2,
    laborRatio: 0.1,
    partsRatio: 0,
    conditionSteps: 0,
    appliesTo: ['pristine', 'good'],
    requiresStone: false,
    unlockLevel: 4,
    trustBonus: 6,
    designNote: 'GDD 17.1 "Kısa/Orta süre, düşük risk, premium servis".',
  },
  {
    id: 'appraisalReport',
    label: 'Ekspertiz Raporu',
    shortLabel: 'Rapor',
    description: 'Ürünün ayarı ve taşı belgelenir. Güven kazandırır, stok değişmez.',
    durationDays: 1,
    difficulty: 0.3,
    laborRatio: 0.045,
    partsRatio: 0,
    conditionSteps: 0,
    appliesTo: ['pristine', 'good', 'worn', 'damaged', 'broken'],
    requiresStone: false,
    unlockLevel: 5,
    trustBonus: 9,
    designNote:
      'GDD 17.1 "Uzmanlığa bağlı risk, güven + ücret". GDD 23.23 ekspertiz akışının servis karşılığı.',
  },
  {
    id: 'restoration',
    label: 'Restorasyon',
    shortLabel: 'Restore',
    description: 'Kapsamlı onarım. Uzun sürer, riski yüksektir, değeri belirgin artırır.',
    durationDays: 4,
    difficulty: 0.6,
    laborRatio: 0.16,
    partsRatio: 0.06,
    conditionSteps: 3,
    appliesTo: ['damaged', 'broken'],
    requiresStone: false,
    unlockLevel: 6,
    trustBonus: 8,
    designNote:
      'GDD 17.1 "Uzun süre, orta/yüksek risk, kondisyon ve yeniden satış değeri artışı".',
  },
];

export const SERVICE_TYPE_BY_ID = new Map(SERVICE_TYPES.map((t) => [t.id, t]));

export function getServiceType(id: string): ServiceTypeDef {
  const t = SERVICE_TYPE_BY_ID.get(id);
  if (!t) throw new Error(`Bilinmeyen servis türü: ${id}`);
  return t;
}
