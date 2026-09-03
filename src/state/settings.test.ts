/**
 * AYARLAR — mağaza sözleşmesi.
 *
 * Pencerenin kendisi React; buradaki testler onun dayandığı mağaza
 * davranışını korur:
 *
 *   · açık/kapalı bayrağı,
 *   · pencere açıkken oyun zamanının DURMASI (§4),
 *   · öğreticinin İKİ YÖNE de çalışması,
 *   · bayrağın kayda sızmaması.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from './gameStore';
import { deserialize, readSave, serialize } from './save';
import {
  DEFAULT_VOLUME,
  defaultPreferences,
  LANGUAGES,
  normalizePreferences,
  normalizeVolume,
  VOLUME_MAX,
  VOLUME_MIN,
} from '@domain/preferences';

const initial = useGame.getState();

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  });
  useGame.setState(
    {
      ...initial,
      settingsOpen: false,
      seenLessons: [],
      preferences: defaultPreferences(),
      /*
        Testte hiç kayıt yok, o yüzden mağaza "ilk açılış" hâlinde doğar ve
        karşılama ekranı da saati durdurur (§4). Buradaki konu ayarlar
        penceresi olduğundan o ekran geçilmiş sayılır; aksi halde test,
        ölçmek istediği donmayı yanlış sebeple ölçerdi.
      */
      profileSetupDone: true,
    },
    true,
  );
});
afterEach(() => {
  useGame.setState(initial, true);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ayarlar penceresi', () => {
  it('kapalı başlar', () => {
    expect(useGame.getState().settingsOpen).toBe(false);
  });

  it('açılır ve kapanır', () => {
    useGame.getState().openSettings();
    expect(useGame.getState().settingsOpen).toBe(true);
    useGame.getState().closeSettings();
    expect(useGame.getState().settingsOpen).toBe(false);
  });

  it('AÇIKKEN OYUN ZAMANI DURUR — §4', () => {
    const before = useGame.getState().market.clockMinutes;

    useGame.getState().openSettings();
    useGame.getState().tick(60);
    expect(useGame.getState().market.clockMinutes).toBe(before);

    // Kapatınca zaman kaldığı yerden akmalı; kalıcı donma bir hata olurdu.
    useGame.getState().closeSettings();
    useGame.getState().tick(60);
    expect(useGame.getState().market.clockMinutes).toBeGreaterThan(before);
  });

  it('profil penceresiyle aynı kuralı paylaşır ama ondan bağımsızdır', () => {
    useGame.getState().openSettings();
    expect(useGame.getState().profileOpen).toBe(false);
    useGame.getState().closeSettings();
    expect(useGame.getState().settingsOpen).toBe(false);
  });
});

describe('öğretici ipuçları anahtarı', () => {
  it('kapatmak tüm dersleri görülmüş sayar', () => {
    useGame.getState().skipOnboarding();
    expect(useGame.getState().seenLessons.length).toBeGreaterThan(0);
  });

  it('GERİ AÇILABİLİR — kapatma tek yönlü kalmaz', () => {
    useGame.getState().skipOnboarding();
    expect(useGame.getState().seenLessons.length).toBeGreaterThan(0);

    useGame.getState().restoreOnboarding();
    expect(useGame.getState().seenLessons).toEqual([]);
  });

  it('aç–kapa–aç aynı noktaya döner', () => {
    const start = useGame.getState().seenLessons;
    useGame.getState().skipOnboarding();
    useGame.getState().restoreOnboarding();
    expect(useGame.getState().seenLessons).toEqual(start);
  });
});

describe('kayıt uyumu', () => {
  it('settingsOpen kayda yazılmaz — eski kayıtlar etkilenmez', () => {
    useGame.getState().openSettings();
    // `serialize` nesne döndürür, metin değil — SaveFile alanlarını tek tek
    // sayar; bayrağın oraya sızmadığını doğrudan o nesnede kontrol ediyoruz.
    const file = serialize(useGame.getState()) as unknown as Record<string, unknown>;
    expect('settingsOpen' in file).toBe(false);
    expect('profileOpen' in file).toBe(false);
  });
});

/**
 * SES · TİTREŞİM · DİL
 *
 * Davranışları henüz bağlı değil; bu testlerin işi TERCİHİN GERÇEKTEN
 * SAKLANDIĞINI ve eski kayıtları bozmadığını sabitlemek. Ayarlar ekranının
 * güvenilirliği buradan gelir: anahtar bir şey yapmıyor olabilir, ama
 * unutmuyorsa oyuncu yalan söylenmiş olmaz.
 */
describe('sunum tercihleri', () => {
  it('varsayılanlar: ses ve titreşim açık, düzey %70, dil Türkçe', () => {
    const p = defaultPreferences();

    expect(p).toEqual({
      soundEnabled: true,
      soundVolume: DEFAULT_VOLUME,
      vibrationEnabled: true,
      language: 'tr',
      currency: 'try',
    });
  });

  it('ses TEK anahtar — müzik/efekt diye ayrı bir alan yok', () => {
    expect(Object.keys(defaultPreferences()).filter((k) => /sound|music|effect/i.test(k)))
      .toEqual(['soundEnabled', 'soundVolume']);
  });

  it('değiştirilen tercih durumda ve kayıtta durur', () => {
    useGame.getState().setPreference('soundEnabled', false);
    useGame.getState().setPreference('language', 'en');

    expect(useGame.getState().preferences.soundEnabled).toBe(false);
    expect(useGame.getState().preferences.language).toBe('en');
    expect(readSave()?.preferences).toEqual({
      soundEnabled: false,
      soundVolume: DEFAULT_VOLUME,
      vibrationEnabled: true,
      language: 'en',
      currency: 'try',
    });
  });

  it('tercih değiştirmek diğer tercihlere dokunmaz', () => {
    useGame.getState().setPreference('vibrationEnabled', false);

    expect(useGame.getState().preferences.soundEnabled).toBe(true);
    expect(useGame.getState().preferences.language).toBe('tr');
  });

  it('kaydedilip yüklenince aynen geri gelir', () => {
    useGame.getState().setPreference('vibrationEnabled', false);
    const geri = deserialize(serialize(useGame.getState()));

    expect(geri.preferences).toEqual({
      soundEnabled: true,
      soundVolume: DEFAULT_VOLUME,
      vibrationEnabled: false,
      language: 'tr',
      currency: 'try',
    });
  });

  /*
    ASIL RİSK BURASI. Alan eklenmeden önce yazılmış kayıtlarda `preferences`
    hiç yoktur; orada çökmek ya da `undefined` taşımak oyuncunun kaydını
    bozardı. `profile` ile aynı desen: eksik alan varsayılana düşer.
  */
  it('ESKİ KAYITTA alan hiç yok — varsayılana düşer, kayıt bozulmaz', () => {
    const eski = serialize(useGame.getState());
    delete eski.preferences;

    const geri = deserialize(eski);

    expect(geri.preferences).toEqual(defaultPreferences());
    expect(geri.store.cash).toBe(useGame.getState().store.cash);
  });

  it.each([
    ['bilinmeyen dil', { language: 'de' }],
    ['dil sayı', { language: 7 }],
    ['boolean yerine metin', { soundEnabled: 'hayır' }],
    ['boolean yerine sıfır', { vibrationEnabled: 0 }],
    ['nesne değil', 'bozuk'],
    ['null', null],
  ])('BOZUK kayıt (%s) çökertmez, varsayılana düşer', (_ad, bozuk) => {
    const p = normalizePreferences(bozuk);

    expect(LANGUAGES.some((l) => l.id === p.language)).toBe(true);
    expect(typeof p.soundEnabled).toBe('boolean');
    expect(typeof p.vibrationEnabled).toBe('boolean');
  });

  it('geçerli bir tercih bozuk komşusu yüzünden kaybolmaz', () => {
    const p = normalizePreferences({ soundEnabled: false, language: 'zzz' });

    expect(p.soundEnabled).toBe(false);
    expect(p.language).toBe('tr');
  });

  it('arayüzden gelen bozuk dil kimliği kayda sızmaz', () => {
    useGame.getState().setPreference('language', 'klingon' as never);

    expect(useGame.getState().preferences.language).toBe('tr');
  });

  it('tercihler oyun gücü vermez — nakit, stok ve seviye değişmez', () => {
    const once = useGame.getState();
    const nakit = once.store.cash, seviye = once.store.level, stok = once.inventory.length;

    useGame.getState().setPreference('soundEnabled', false);
    useGame.getState().setPreference('vibrationEnabled', false);
    useGame.getState().setPreference('language', 'en');

    expect(useGame.getState().store.cash).toBe(nakit);
    expect(useGame.getState().store.level).toBe(seviye);
    expect(useGame.getState().inventory).toHaveLength(stok);
  });
});

describe('ses düzeyi', () => {
  it('değiştirilen düzey durumda ve kayıtta durur', () => {
    useGame.getState().setPreference('soundVolume', 35);

    expect(useGame.getState().preferences.soundVolume).toBe(35);
    expect(readSave()?.preferences?.soundVolume).toBe(35);
  });

  it('sınırlar kabul edilir: sessiz ve tam açık', () => {
    useGame.getState().setPreference('soundVolume', VOLUME_MIN);
    expect(useGame.getState().preferences.soundVolume).toBe(0);

    useGame.getState().setPreference('soundVolume', VOLUME_MAX);
    expect(useGame.getState().preferences.soundVolume).toBe(100);
  });

  it.each([
    [-40, 0],
    [999, 100],
    [70.4, 70],
    [70.6, 71],
  ])('aralık dışı / ondalık değer %s → %s', (giren, beklenen) => {
    expect(normalizeVolume(giren)).toBe(beklenen);
  });

  it.each([
    ['metin', '70'],
    ['NaN', NaN],
    ['sonsuz', Infinity],
    ['null', null],
    ['tanımsız', undefined],
    ['nesne', {}],
  ])('geçersiz düzey (%s) varsayılana düşer', (_ad, giren) => {
    expect(normalizeVolume(giren)).toBe(DEFAULT_VOLUME);
  });

  /*
    ADIMA YUVARLANMAZ. `VOLUME_STEP` yalnız kaydırıcının davranışıdır;
    başka bir yoldan gelen 73 geçerli kalmalı, sessizce 75'e oynatılmamalı.
  */
  it('adımın katı olmayan geçerli değer korunur', () => {
    expect(normalizeVolume(73)).toBe(73);
  });

  it('ESKİ KAYITTA düzey yok — varsayılana düşer, komşu tercihler korunur', () => {
    const p = normalizePreferences({ soundEnabled: false, language: 'en' });

    expect(p.soundVolume).toBe(DEFAULT_VOLUME);
    expect(p.soundEnabled).toBe(false);
    expect(p.language).toBe('en');
  });

  it('sesi kapatmak düzeyi SİLMEZ — tekrar açınca eski düzey yerinde', () => {
    useGame.getState().setPreference('soundVolume', 25);
    useGame.getState().setPreference('soundEnabled', false);
    useGame.getState().setPreference('soundEnabled', true);

    expect(useGame.getState().preferences.soundVolume).toBe(25);
  });

  it('düzey oyun gücü vermez — nakit ve stok değişmez', () => {
    const nakit = useGame.getState().store.cash;
    const stok = useGame.getState().inventory.length;

    useGame.getState().setPreference('soundVolume', 10);

    expect(useGame.getState().store.cash).toBe(nakit);
    expect(useGame.getState().inventory).toHaveLength(stok);
  });
});

/**
 * SES İŞARETİ — mağaza sözleşmesi.
 *
 * Mağaza ses ÇALMAZ, yalnız "şu oldu" der. Kritik olan iki şey: işaret kayda
 * SIZMAMALI (arayüz durumudur) ve sayaç sayesinde aynı ses arka arkaya iki
 * kez istenebilmeli.
 */
describe('ses işareti', () => {
  it('başlangıçta işaret yoktur', () => {
    expect(useGame.getState().soundCue).toBeNull();
  });

  it('KAYDA SIZMAZ — arayüz durumu, oyun durumu değil', () => {
    useGame.setState({ soundCue: { id: 'deal', n: 3 } });

    expect('soundCue' in serialize(useGame.getState())).toBe(false);
  });

  it('gün kapanışı işaret bırakır', () => {
    useGame.getState().advanceDay();

    expect(useGame.getState().soundCue?.id).toBe('chime');
  });

  /*
    SAYAÇ ŞART. Aynı ses arka arkaya gerekebilir; yalnız `id` izlenseydi
    ikincisi kaçardı — art arda iki gün kapatan oyuncu ikinci çanı duymazdı.
  */
  it('aynı ses tekrar istendiğinde SAYAÇ artar', () => {
    useGame.getState().advanceDay();
    const ilk = useGame.getState().soundCue!;
    useGame.getState().startNewDay();
    useGame.getState().advanceDay();
    const ikinci = useGame.getState().soundCue!;

    expect(ikinci.id).toBe(ilk.id);
    expect(ikinci.n).toBeGreaterThan(ilk.n);
  });

  it('işaret oyun gücü vermez — nakit ve stok değişmez', () => {
    const nakit = useGame.getState().store.cash;
    useGame.setState({ soundCue: { id: 'levelup', n: 99 } });

    expect(useGame.getState().store.cash).toBe(nakit);
  });
});
