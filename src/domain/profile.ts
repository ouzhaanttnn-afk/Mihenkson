/**
 * Oyuncu profili — GÖRSEL KİMLİK, oyun mekaniği DEĞİL.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KAPSAM SINIRI — bilerek dar tutulmuştur.
 *
 * Bu modül yalnız iki şey tutar: kuyumcunun adı ve seçtiği portre.
 * Karakterlerin seviyesi, XP'si, özelliği, yeteneği, test başarısı ya da
 * herhangi bir karar etkisi YOKTUR ve olmamalıdır. Avatar seçmek bir
 * oyun kararı değil, bir görünüm tercihidir.
 *
 * Pratik sonucu: bu dosya hiçbir ekonomi, değerleme, pazarlık veya
 * ilerleme fonksiyonunu import ETMEZ ve etmemelidir. Böyle bir import
 * belirse, profil sessizce bir mekaniğe dönüşmüş demektir.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Asetv2 paketindeki 11 portre. Sıra paketin manifest.json sırasıdır. */
export const AVATAR_IDS = [
  'male-01', 'male-02', 'male-03', 'male-04', 'male-05', 'male-06',
  'male-07', 'male-08', 'male-09', 'male-10', 'male-11',
  'female-01', 'female-02', 'female-03', 'female-04', 'female-05', 'female-06',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export const DEFAULT_AVATAR_ID: AvatarId = 'male-01';

/**
 * Varsayılan ad. Oyunda oyuncunun/kuyumcunun ADI diye bir alan yoktu —
 * `store.name` DÜKKÂNIN adıdır ("MIHENKAYNAK Kuyumculuk") ve İşletme
 * ekranında kademe/seviye ile birlikte o sıfatla gösteriliyor. Bir kişi
 * adını oraya yazmak dükkânın adını silerdi. Bu yüzden kuyumcu adı ayrı
 * bir alandır ve mevcut ad bulunmadığı için varsayılanı "Kuyumcu"dur.
 */
export const DEFAULT_JEWELER_NAME = 'Kuyumcu';

export interface PlayerProfile {
  jewelerName: string;
  avatarId: AvatarId;
}

export function defaultProfile(): PlayerProfile {
  return { jewelerName: DEFAULT_JEWELER_NAME, avatarId: DEFAULT_AVATAR_ID };
}

export const NAME_MIN = 2;
export const NAME_MAX = 24;
export const SHOP_SUFFIX = 'Kuyumculuk';

/** Profilde yalnız temel ad saklanır; sistem eki sondan temizlenir. */
export function normalizeShopBaseName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/(?:\s+kuyumculuk)+\s*$/giu, '')
    .trim();
}

export function shopDisplayName(baseName: string): string {
  const normalized = normalizeShopBaseName(baseName) || DEFAULT_JEWELER_NAME;
  return `${normalized} ${SHOP_SUFFIX}`;
}

export type NameCheck =
  | { ok: true; value: string }
  | { ok: false; error: string };

/**
 * Kuyumcu adını doğrular ve temizler.
 *
 * Kurallar tek yerde: baş/son boşluk kırpılır, araya sıkışmış tekrar eden
 * boşluklar teke iner, uzunluk 2–24 arasında olmalıdır.
 *
 * NEDEN İÇ BOŞLUK DA SADELEŞİYOR: "Ahmet      Usta" 24 karakter sınırını
 * boşlukla doldurup arayüzde tek kelimeymiş gibi uzayabiliyordu. Kırpma
 * yalnız uçlardan yapılsaydı sınır anlamını yitirirdi.
 */
export function checkJewelerName(raw: string): NameCheck {
  const value = normalizeShopBaseName(raw);

  if (value.length === 0) {
    return { ok: false, error: 'Kuyumcu adı boş bırakılamaz.' };
  }
  if (value.length < NAME_MIN) {
    return { ok: false, error: `Kuyumcu adı en az ${NAME_MIN} karakter olmalı.` };
  }
  if (value.length > NAME_MAX) {
    return { ok: false, error: `Kuyumcu adı en fazla ${NAME_MAX} karakter olabilir.` };
  }
  return { ok: true, value };
}

/** Bilinmeyen avatar kimliğini varsayılana çeker — bozuk kayıt çökertmez. */
export function normalizeAvatarId(id: unknown): AvatarId {
  return AVATAR_IDS.includes(id as AvatarId) ? (id as AvatarId) : DEFAULT_AVATAR_ID;
}

/**
 * Kaydedilmiş (veya eksik / bozuk) profili güvenli hâle getirir.
 * Eski kayıtlarda profil alanı hiç yoktur; o durumda varsayılanlar döner
 * ve kaydın geri kalanına dokunulmaz.
 */
export function normalizeProfile(raw: unknown): PlayerProfile {
  /*
    PARAMETRE `unknown`, `Partial<PlayerProfile>` DEĞİL — bilerek.
    Bu fonksiyonun girdisi diskten okunmuş JSON'dur; orada her şey olabilir
    (elle düzenlenmiş kayıt, eski sürüm, yarım yazılmış dosya). Girdiyi
    `Partial<PlayerProfile>` diye tiplemek, derleyiciye asla doğrulayamadığı
    bir söz verdirmek olurdu; nitekim testte 'yok' gibi geçersiz bir avatar
    kimliğini denemek derlemeyi kırdı — hata testte değil, imzadaydı.
  */
  const source = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const name = checkJewelerName(typeof source.jewelerName === 'string' ? source.jewelerName : '');
  return {
    jewelerName: name.ok ? name.value : DEFAULT_JEWELER_NAME,
    avatarId: normalizeAvatarId(source.avatarId),
  };
}
