/**
 * MIHENKAYNAK — Test / tartım / ekspertiz araçları
 * Kaynak: GDD 7 tablosu ve EK D "Test Aracı Tasarım Şablonu".
 *
 * GDD 7: "Test araçları 'doğru cevabı açan buton' değil; zaman, sarf ve müşteri
 * sabrı karşılığında belirsizliği azaltan bilgi satın alma kararlarıdır."
 *
 * GDD 7.1 Bilgi alanı ilkesi — her araç farklı bir soruya cevap verir:
 *   terazi → weight, mihenk → purity, yoğunluk → coreIntegrity,
 *   lup → stone, mıknatıs → kaba eleme, spektrometre → kesinlik.
 */

import { t } from '@i18n/index';
import type { TestTool } from '@domain/types';

export const TEST_TOOLS: TestTool[] = [
  {
    id: 'scale',
    name: 'Hassas Terazi',
    shortLabel: 'Terazi',
    infoFields: ['weight'],
    durationSec: 1,
    cost: 0,
    reliability: 0.99,
    certaintyGain: 0.95,
    unlockLevel: 1,
    description: 'Brüt ve net gramajı doğrular. Ayarı çözmez.',
  },
  {
    id: 'magnet',
    name: 'Mıknatıs',
    shortLabel: 'Mıknatıs',
    // Kaba eleme: çekirdek bütünlüğüne dair zayıf sinyal verir.
    infoFields: ['coreIntegrity'],
    durationSec: 1,
    cost: 0,
    reliability: 0.45,
    certaintyGain: 0.22,
    unlockLevel: 1,
    description: 'Bariz alaşım/sahte şüphesini hızlı eler. Tek başına kesin değildir.',
  },
  {
    id: 'touchstone',
    name: 'Mihenk Taşı',
    shortLabel: 'Mihenk',
    infoFields: ['purity'],
    durationSec: 3,
    cost: 45,
    // Yetenek ağacı tabanı: yeni oyuncu yanlış ayar beyanını %60 doğrulukla
    // yakalar. Gelecekteki ayar uzmanlığı bunu en fazla %90'a çıkarır.
    reliability: 0.6,
    certaintyGain: 0.55,
    unlockLevel: 1,
    description: 'Ayar aralığını %60 temel doğrulukla daraltır. İç dolgu riskini kapatmaz.',
  },
  {
    id: 'density',
    name: 'Yoğunluk Ölçümü',
    shortLabel: 'Yoğunluk',
    infoFields: ['coreIntegrity', 'purity'],
    durationSec: 5,
    cost: 0,
    reliability: 0.88,
    certaintyGain: 0.7,
    unlockLevel: 2,
    description: 'Kaplama, dolgu ve içi boşluk riskinde güçlü doğrulama sağlar.',
  },
  {
    id: 'loupe',
    name: 'Lup / Taş Kontrol',
    shortLabel: 'Lup',
    infoFields: ['stone', 'condition'],
    durationSec: 3,
    cost: 0,
    reliability: 0.72,
    certaintyGain: 0.62,
    unlockLevel: 1,
    description: 'Taş kalitesi, taklit riski ve gizli kondisyon hasarını okur.',
  },
  {
    id: 'spectrometer',
    name: 'Dijital Spektrometre',
    shortLabel: 'Spektro',
    infoFields: ['purity', 'coreIntegrity'],
    durationSec: 2,
    cost: 220,
    reliability: 0.98,
    certaintyGain: 0.94,
    unlockLevel: 5,
    description: 'Ayarı çok yüksek doğrulukla çözer. İleri oyun kesinlik aracıdır.',
  },
];

export const TOOL_BY_ID = new Map(TEST_TOOLS.map((t) => [t.id, t]));

export function getTool(id: string): TestTool {
  const tool = TOOL_BY_ID.get(id);
  if (!tool) throw new Error(`Bilinmeyen test aracı: ${id}`);
  return tool;
}

/**
 * GDD 23.11 — "Araç sırası oyuncu seviyesine göre rastgele değişmez; yeni
 * açılan araç mevcut mantıklı sıranın sonuna eklenir."
 * Sıralama TEST_TOOLS dizisinin kendisidir; yalnız kilit durumu değişir.
 */
export function toolsForLevel(level: number): { tool: TestTool; locked: boolean; lockReason: string }[] {
  return TEST_TOOLS.filter(
    // GDD 23.11 — uzak gelecekteki araçlar rayı kalabalıklaştırmak için gösterilmez.
    (tool) => tool.unlockLevel <= level + 1,
  ).map((tool) => ({
    tool,
    locked: tool.unlockLevel > level,
    /*
      Kilit gerekçesi ARTIK ÇEVRİLEBİLİR bir şablon üretiyor. Eskiden burada
      cümle Türkçe olarak birleşiyordu ve arayüz onu olduğu gibi basıyordu;
      İngilizce oyunda ekranın ortasında tek başına Türkçe bir satır kalırdı.
    */
    lockReason: tool.unlockLevel > level ? t("Seviye {sv}'te açılır", { sv: tool.unlockLevel }) : '',
  }));
}
