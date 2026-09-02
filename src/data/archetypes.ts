/**
 * MIHENKAYNAK — Müşteri arketipleri
 * Kaynak: GDD 9.2 tablosu + EK C "Müşteri Arketipi Tasarım Şablonu".
 *
 * closeThreshold (GDD 11.3): kapanış eşiği müşteri profiline göre değişir.
 * Bu değer, teklifin rezervasyon fiyatına oranıdır — 1.0 = rezervasyonun tam
 * üstü kabul edilir. Değeri < 1.0 olan arketip, ilişki/aciliyet katkısıyla
 * rezervasyonun bir miktar altını da kabul edebilir (üst sınır: GDD 35.1
 * gereği NEGOTIATION.maxReservationFlex).
 */

import type { Archetype } from '@domain/types';

export const ARCHETYPES: Archetype[] = [
  {
    id: 'urgentCash',
    name: 'Acil Nakit Arayan',
    demeanor: 'Aceleci',
    patienceBand: [22, 42],
    knowledgeBand: [20, 45],
    urgencyBand: [72, 95],
    priceSensitivityBand: [30, 55],
    statusBand: [15, 40],
    reservationRatioBand: [0.8, 0.9],
    closeThreshold: 0.965,
    reasonResponsiveness: 0.7,
    gestureResponsiveness: 1.2,
    goodStrategy: 'Net ve hızlı teklif ver; aşırı bastırma güveni yok eder.',
    badStrategy: 'Uzun ekspertiz ve düşük teklif tekrarı.',
    preferredFamilies: ['bullion', 'classic'],
  },
  {
    id: 'investor',
    name: 'Yatırımcı',
    demeanor: 'Hesaplı',
    patienceBand: [55, 80],
    knowledgeBand: [72, 95],
    urgencyBand: [20, 45],
    priceSensitivityBand: [70, 92],
    statusBand: [45, 70],
    reservationRatioBand: [0.955, 0.99],
    closeThreshold: 1.0,
    reasonResponsiveness: 1.35,
    gestureResponsiveness: 0.5,
    goodStrategy: 'Şeffaf fiyat, hacim mantığı, küçük marj.',
    badStrategy: 'Piyasa referansının belirgin altında teklif.',
    preferredFamilies: ['bullion'],
  },
  {
    id: 'giftBuyer',
    name: 'Hediye Alıcısı',
    demeanor: 'Kararsız',
    patienceBand: [45, 70],
    knowledgeBand: [12, 35],
    urgencyBand: [40, 65],
    priceSensitivityBand: [45, 70],
    statusBand: [30, 55],
    reservationRatioBand: [0.82, 0.93],
    closeThreshold: 0.975,
    reasonResponsiveness: 0.85,
    gestureResponsiveness: 1.45,
    goodStrategy: 'Bütçeye uygun iyi seçenek, paket ve jest.',
    badStrategy: 'Teknik veri yığmak; karar felci yaratmak.',
    preferredFamilies: ['classic', 'silver', 'stoneSet'],
  },
  {
    id: 'weddingShopper',
    name: 'Düğün Müşterisi',
    demeanor: 'Karşılaştırmacı',
    patienceBand: [50, 78],
    knowledgeBand: [35, 60],
    urgencyBand: [50, 75],
    priceSensitivityBand: [55, 78],
    statusBand: [45, 72],
    reservationRatioBand: [0.87, 0.95],
    closeThreshold: 0.985,
    reasonResponsiveness: 1.0,
    gestureResponsiveness: 1.25,
    goodStrategy: 'Set/paket, teslim sözü, güven.',
    badStrategy: 'Kalem kalem sertleşmek; sepeti dağıtmak.',
    preferredFamilies: ['classic', 'bullion'],
  },
  {
    id: 'collector',
    name: 'Koleksiyoncu',
    demeanor: 'Meraklı',
    patienceBand: [65, 92],
    knowledgeBand: [65, 90],
    urgencyBand: [12, 32],
    priceSensitivityBand: [35, 60],
    statusBand: [55, 85],
    reservationRatioBand: [0.93, 1.02],
    closeThreshold: 1.005,
    reasonResponsiveness: 1.5,
    gestureResponsiveness: 0.7,
    goodStrategy: 'Uzman ekspertiz, hikâye ve güvenilirlik.',
    badStrategy: 'Nadir parçayı hurda gibi fiyatlamak.',
    preferredFamilies: ['collectible', 'stoneSet'],
  },
  {
    id: 'vip',
    name: 'VIP Müşteri',
    demeanor: 'Talepkâr',
    patienceBand: [30, 55],
    knowledgeBand: [50, 75],
    urgencyBand: [45, 70],
    priceSensitivityBand: [25, 50],
    statusBand: [80, 98],
    reservationRatioBand: [0.9, 0.98],
    closeThreshold: 0.99,
    reasonResponsiveness: 1.15,
    gestureResponsiveness: 1.1,
    goodStrategy: 'Hız, yüksek hizmet standardı, randevu ve rezervasyon.',
    badStrategy: 'Bekletmek; sıradan müşteri gibi davranmak.',
    preferredFamilies: ['stoneSet', 'collectible', 'classic'],
  },
  {
    id: 'informedSeller',
    name: 'Bilinçli Satıcı',
    demeanor: 'Kararlı',
    patienceBand: [50, 75],
    knowledgeBand: [78, 96],
    urgencyBand: [25, 50],
    priceSensitivityBand: [72, 94],
    statusBand: [40, 65],
    reservationRatioBand: [0.94, 0.99],
    closeThreshold: 1.0,
    reasonResponsiveness: 1.4,
    gestureResponsiveness: 0.55,
    goodStrategy: 'Veriyle gerekçelendirme ve makul marj.',
    badStrategy: 'Doğrulanmamış veriyi kesin gibi sunmak.',
    preferredFamilies: ['classic', 'bullion', 'stoneSet'],
  },
  {
    id: 'opportunist',
    name: 'Fırsatçı',
    demeanor: 'Temkinli',
    patienceBand: [60, 88],
    knowledgeBand: [55, 80],
    urgencyBand: [15, 38],
    priceSensitivityBand: [78, 96],
    statusBand: [30, 55],
    reservationRatioBand: [0.97, 1.04],
    closeThreshold: 1.015,
    reasonResponsiveness: 0.9,
    gestureResponsiveness: 0.6,
    goodStrategy: 'Sabır, final-offer disiplini ve fiyat disiplini.',
    badStrategy: 'Aceleyi belli etmek; ardışık yükselen teklif vermek.',
    preferredFamilies: ['bullion', 'classic', 'collectible'],
  },
];

export const ARCHETYPE_BY_ID = new Map(ARCHETYPES.map((a) => [a.id, a]));

export function getArchetype(id: Archetype['id']): Archetype {
  const a = ARCHETYPE_BY_ID.get(id);
  if (!a) throw new Error(`Bilinmeyen arketip: ${id}`);
  return a;
}

/** Türkçe isim havuzu — müşteri kimliği için. Deterministik seçilir. */
export const FIRST_NAMES_F = [
  'Nermin', 'Sevgi', 'Ayşe', 'Hatice', 'Zeynep', 'Fatma', 'Meryem', 'Gülten',
  'Nurten', 'Sibel', 'Elif', 'Derya', 'Hülya', 'Şermin', 'Pınar',
];

export const FIRST_NAMES_M = [
  'Kemal', 'Necati', 'Orhan', 'Mustafa', 'Serkan', 'Hakan', 'Yusuf', 'Cemil',
  'Ergün', 'Tolga', 'Bülent', 'Selim', 'Ferhat', 'Adnan', 'Uğur',
];

export const HONORIFIC_F = 'Hanım';
export const HONORIFIC_M = 'Bey';
