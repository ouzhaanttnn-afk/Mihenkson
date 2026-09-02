/**
 * Profil sözleşmesi.
 *
 * İKİ YÖNLÜ: profil DEĞİŞEBİLMELİ, ama profil değişmek OYUNU
 * DEĞİŞTİRMEMELİ. Yalnız birincisini test etmek, avatara gizlice bir bonus
 * iliştiren bir değişikliği yeşil geçirirdi.
 */

import { describe, expect, it } from 'vitest';

import {
  AVATAR_IDS,
  DEFAULT_AVATAR_ID,
  DEFAULT_JEWELER_NAME,
  NAME_MAX,
  NAME_MIN,
  checkJewelerName,
  defaultProfile,
  normalizeAvatarId,
  normalizeProfile,
  normalizeShopBaseName,
  shopDisplayName,
} from './profile';

describe('kuyumcu adı doğrulaması', () => {
  it('geçerli adı kabul eder', () => {
    const r = checkJewelerName('Ahmet Usta');
    expect(r.ok && r.value).toBe('Ahmet Usta');
  });

  it('baş ve sondaki boşlukları temizler', () => {
    const r = checkJewelerName('   Ahmet Usta   ');
    expect(r.ok && r.value).toBe('Ahmet Usta');
  });

  it('araya sıkışmış tekrar eden boşlukları teke indirir', () => {
    const r = checkJewelerName('Ahmet     Usta');
    expect(r.ok && r.value).toBe('Ahmet Usta');
  });

  it('Kuyumculuk ekini yalnız temel ad olarak saklar ve gösterimde bir kez ekler', () => {
    expect(normalizeShopBaseName('  Alvera Kuyumculuk  ')).toBe('Alvera');
    expect(checkJewelerName('Alvera Kuyumculuk')).toEqual({ ok: true, value: 'Alvera' });
    expect(shopDisplayName('Alvera')).toBe('Alvera Kuyumculuk');
    expect(shopDisplayName('Alvera Kuyumculuk')).toBe('Alvera Kuyumculuk');
  });

  it('boş ad kaydedilemez', () => {
    for (const raw of ['', '   ', '\t\n ']) {
      const r = checkJewelerName(raw);
      expect(r.ok, JSON.stringify(raw)).toBe(false);
      expect(!r.ok && r.error).toContain('boş');
    }
  });

  it(`${NAME_MIN} karakterin altını reddeder, tam ${NAME_MIN} karakteri kabul eder`, () => {
    expect(checkJewelerName('A').ok).toBe(false);
    expect(checkJewelerName('Al').ok).toBe(true);
  });

  it(`${NAME_MAX} karakteri kabul eder, üstünü reddeder`, () => {
    expect(checkJewelerName('A'.repeat(NAME_MAX)).ok).toBe(true);
    const over = checkJewelerName('A'.repeat(NAME_MAX + 1));
    expect(over.ok).toBe(false);
    expect(!over.ok && over.error).toContain(String(NAME_MAX));
  });

  it('boşlukla şişirilmiş uzun ad sınırı deleMEZ', () => {
    // Kırpma yalnız uçlardan yapılsaydı bu 24 sınırını geçerdi.
    const r = checkJewelerName('A'.repeat(20) + '     ' + 'B'.repeat(20));
    expect(r.ok).toBe(false);
  });

  it('hata mesajları Türkçedir', () => {
    for (const raw of ['', 'A', 'A'.repeat(99)]) {
      const r = checkJewelerName(raw);
      expect(r.ok).toBe(false);
      expect(!r.ok && /[çğıöşü]|Kuyumcu/i.test(r.error), r.ok ? '' : r.error).toBe(true);
    }
  });
});

describe('avatar kimliği', () => {
  it('iki portre paketi toplam 17 karakter içerir ve varsayılan male-01’dir', () => {
    expect(AVATAR_IDS).toHaveLength(17);
    expect(AVATAR_IDS.filter((id) => id.startsWith('male-'))).toHaveLength(11);
    expect(AVATAR_IDS.filter((id) => id.startsWith('female-'))).toHaveLength(6);
    expect(AVATAR_IDS[0]).toBe('male-01');
    expect(DEFAULT_AVATAR_ID).toBe('male-01');
  });

  it('avatar kimlikleri benzersizdir ve her kimliğin asset dosyası vardır', async () => {
    const { existsSync } = await import('node:fs');
    expect(new Set(AVATAR_IDS).size).toBe(AVATAR_IDS.length);
    for (const id of AVATAR_IDS) {
      expect(existsSync(`public/assets/characters/${id}.webp`), `${id}.webp yok`).toBe(true);
    }
  });

  it('bilinen kimlikleri korur', () => {
    for (const id of AVATAR_IDS) expect(normalizeAvatarId(id)).toBe(id);
  });

  it('bilinmeyen / bozuk kimliği varsayılana çeker — çökmez', () => {
    for (const bad of ['female-99', 'male-99', '', null, undefined, 42, {}]) {
      expect(normalizeAvatarId(bad)).toBe(DEFAULT_AVATAR_ID);
    }
  });
});

describe('kayıttan gelen profil', () => {
  it('varsayılan profil geçerlidir', () => {
    const p = defaultProfile();
    expect(p.jewelerName).toBe(DEFAULT_JEWELER_NAME);
    expect(p.avatarId).toBe(DEFAULT_AVATAR_ID);
    expect(checkJewelerName(p.jewelerName).ok).toBe(true);
  });

  it('profil alanı OLMAYAN eski kayıt varsayılana düşer', () => {
    expect(normalizeProfile(undefined)).toEqual(defaultProfile());
    expect(normalizeProfile(null)).toEqual(defaultProfile());
    expect(normalizeProfile({})).toEqual(defaultProfile());
  });

  it('yarım veya bozuk profil güvenle tamamlanır', () => {
    expect(normalizeProfile({ jewelerName: 'Ahmet Usta' }).avatarId).toBe(DEFAULT_AVATAR_ID);
    expect(normalizeProfile({ avatarId: 'male-07' }).jewelerName).toBe(DEFAULT_JEWELER_NAME);
    expect(normalizeProfile({ jewelerName: '  ', avatarId: 'yok' })).toEqual(defaultProfile());
  });

  it('geçerli profili olduğu gibi korur', () => {
    expect(normalizeProfile({ jewelerName: 'Ahmet Usta', avatarId: 'male-07' })).toEqual({
      jewelerName: 'Ahmet Usta',
      avatarId: 'male-07',
    });
  });
});

describe('profil bir OYUN MEKANİĞİ DEĞİLDİR', () => {
  it('profil modülü hiçbir ekonomi/ilerleme modülünü import etmez', async () => {
    const fs = await import('node:fs');
    const url = await import('node:url');
    const src = fs.readFileSync(
      url.fileURLToPath(new URL('./profile.ts', import.meta.url)),
      'utf8',
    );
    const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1]!);
    // Hiç import yok: profil kendi başına duran saf bir veri modülü.
    expect(imports, `beklenmedik import: ${imports.join(', ')}`).toEqual([]);
  });

  it('avatarlar arasında hiçbir sayısal fark yoktur — hepsi eşdeğerdir', () => {
    // Avatar kimliği düz bir dizedir; taşıdığı tek bilgi hangi görselin
    // çizileceğidir. Bir gün buraya {bonus} gibi bir alan eklenirse bu
    // test kırılır ve niyet ihlali görünür olur.
    for (const id of AVATAR_IDS) {
      expect(typeof id).toBe('string');
      expect(normalizeProfile({ jewelerName: 'Test Adı', avatarId: id })).toEqual({
        jewelerName: 'Test Adı',
        avatarId: id,
      });
    }
  });
});
