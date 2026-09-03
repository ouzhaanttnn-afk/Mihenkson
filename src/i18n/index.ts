/**
 * ÇEVİRİ VE PARA BİRİMİ — sunum katmanı, oyun katmanı değil.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KAPSAM SINIRI — profil ve tercih modülleriyle aynı disiplin.
 *
 * Burası yalnız GÖSTERİMİ değiştirir. Ekonomi, mutabakat, pazarlık
 * matematiği, gizli gerçek ve determinizm dile ve para birimine BAKMAZ.
 * Bu dosya hiçbir ekonomi veya değerleme modülü import ETMEZ ve etmemelidir.
 *
 * DEĞİŞMEZ (testle korunuyor · `src/i18n/invariance.test.ts`):
 *   Aynı tohumla oynanan iki oyun, dili ve para birimi farklı olsa bile
 *   BİRE BİR aynı sayıları üretir. Dil bir oyun kararı değildir.
 *
 * Ekonomi kodunda dile göre DALLANMA YASAK. `t()` yalnız ekrana çıkan
 * metni seçer; bir fiyatı, bir olasılığı veya bir zar çekilişini
 * etkileyemez. Böyle bir kullanım belirse çeviri sessizce bir mekaniğe
 * dönüşmüş demektir.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ANAHTAR = TÜRKÇE METNİN KENDİSİ. Ayrı bir anahtar şeması (`shop.title`
 * gibi) KURULMADI ve bu bilinçli bir seçim:
 *
 *   · Geri dönüşü kendiliğinden mümkün. Sözlükte karşılığı olmayan her
 *     metin Türkçe kalır — yani bugünkü davranışın aynısı. Çeviri katmanı
 *     tamamen kaldırılsa bile ekranda tek harf değişmez.
 *   · Retrofit güvenli. 1100'den fazla metni anahtarlara bağlamak, her
 *     birinde yanlış anahtar yazma riski demekti; burada metnin kendisi
 *     anahtar olduğu için yanlış eşleşme mümkün değil.
 *   · Eksikler görünür. `missingKeys()` hangi metnin çevrilmediğini
 *     söyler; "çevrildi" diye rapor edip yarısını Türkçe bırakmak mümkün
 *     olmasın diye.
 *
 * Bedeli: Türkçe metin değişirse sözlükteki karşılığı düşer ve o satır
 * Türkçeye geri döner. Sessiz bir bozulma değil — gözle görülür ve
 * `npm run i18n:report` ile listelenir.
 */

import { EN } from './en';

export type LanguageId = 'tr' | 'en';

/**
 * Etkin dil MODÜL DÜZEYİNDE tutulur, her çağrıya parametre olarak
 * geçilmez. Gerekçe: metin üreten fonksiyonlar arayüzün her katmanına
 * yayılmış durumda (alan katmanındaki müşteri cümleleri dahil) ve hepsine
 * `lang` parametresi eklemek, çeviriyi ekonomi imzalarına bulaştırırdı.
 *
 * Bu bir tarayıcı API'si değil, saf veridir: testte de sunucuda da çalışır
 * ve determinizme dokunmaz.
 */
let activeLanguage: LanguageId = 'tr';

export function setLanguage(id: LanguageId): void {
  activeLanguage = id === 'en' ? 'en' : 'tr';
}

export function getLanguage(): LanguageId {
  return activeLanguage;
}

/**
 * Metni etkin dile çevirir.
 *
 * @param tr     Türkçe metin — aynı zamanda sözlük anahtarı.
 * @param params `{ad}` biçimindeki yer tutucular için değerler.
 *
 * Yer tutucu biçimi `{ad}`: hem Türkçe hem İngilizce karşılıkta aynı adla
 * geçer, böylece iki dilde kelime SIRASI serbestçe değişebilir. Şablon
 * dizesiyle ("`${x} adet`") çeviri mümkün olmazdı — cümle zaten birleşmiş
 * hâlde gelirdi.
 */
export function t(tr: string, params?: Record<string, string | number>): string {
  const base = activeLanguage === 'en' ? (EN[tr] ?? tr) : tr;
  if (!params) return base;
  return base.replace(/\{(\w+)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : whole,
  );
}

/**
 * Sözlükte karşılığı olmayan metinleri bildirir — dürüstlük aracı.
 * Testler bunu kullanarak "çevrildi" iddiasını ölçüyle karşılaştırır.
 */
export function missingKeys(keys: readonly string[]): string[] {
  return keys.filter((k) => !(k in EN));
}

export { EN };
