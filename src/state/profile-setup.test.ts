/**
 * İLK AÇILIŞ EKRANI — "adını ve portreni seç".
 *
 * Bu testlerin asıl işi tek bir sözleşmeyi korumak:
 *
 *   ekran YALNIZ hiç kaydı olmayan oyuncuya çıkar.
 *
 * Alan `SaveFile`'a sonradan eklendi. Eski kayıtlarda YOKTUR ve orada
 * varsayılanı **true** olmalıdır — aksi halde yıllardır oynayan bir
 * oyuncuya, dükkânı kurulmuşken, "adın ne?" diye sorulurdu. `?? true`
 * bilerek seçilmiş bir varsayılandır; `?? false` olsaydı sessiz bir
 * regresyon olurdu. Aşağıdaki ilk iki test o varsayılanın bekçisidir.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGame } from './gameStore';
import { deserialize, readSave, resumeSaves, serialize, type SaveFile } from './save';
import { DEFAULT_AVATAR_ID, defaultProfile } from '@domain/profile';

const initial = useGame.getState();

/** Karşılama ekranı açıkmış gibi: yeni oyun hâli. */
function asFirstLaunch() {
  useGame.setState(
    { ...initial, profile: defaultProfile(), profileSetupDone: false, toasts: [] },
    true,
  );
}

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
  });
  /*
    Yazma kilidi MODÜL ömürlüdür ve tarayıcıda sayfa yenilendiğinde
    kendiliğinden kalkar. Testlerde modül bir kez yüklenir, o yüzden bir
    testin `resetGame`i sonrakilere sızardı — her testi yeni bir açılış
    gibi başlatmak için kilit burada açılır.
  */
  resumeSaves();
  asFirstLaunch();
});

afterEach(() => {
  useGame.setState(initial, true);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
describe('eski kayıtlar', () => {
  it('ALANI OLMAYAN KAYITTA VARSAYILAN TRUE — oynamış oyuncuya ekran çıkmaz', () => {
    const file = serialize(useGame.getState());
    // Alanı, hiç eklenmemiş gibi sil.
    delete (file as Partial<SaveFile>).profileSetupDone;

    expect(deserialize(file).profileSetupDone).toBe(true);
  });

  it('alan açıkça false ise korunur — ekranda kapatılan oyun ekranla açılır', () => {
    const file = serialize(useGame.getState());
    file.profileSetupDone = false;

    expect(deserialize(file).profileSetupDone).toBe(false);
  });

  it('alan true ise korunur', () => {
    const file = serialize(useGame.getState());
    file.profileSetupDone = true;

    expect(deserialize(file).profileSetupDone).toBe(true);
  });

  it('kayıtta yazılıp okunur — gidiş dönüş kaybetmez', () => {
    useGame.setState({ profileSetupDone: true });
    expect(serialize(useGame.getState()).profileSetupDone).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('karşılama ekranını tamamlamak', () => {
  it('adı ve portreyi birlikte yazar, bayrağı kaldırır', () => {
    const ok = useGame.getState().completeProfileSetup({
      jewelerName: 'Alvera',
      avatarId: 'female-02',
    });

    expect(ok).toBe(true);
    expect(useGame.getState().profile).toEqual({
      jewelerName: 'Alvera',
      avatarId: 'female-02',
    });
    expect(useGame.getState().profileSetupDone).toBe(true);
  });

  it('GEÇERSİZ AD EKRANI KAPATMAZ — bayrak da ad da olduğu gibi kalır', () => {
    const ok = useGame.getState().completeProfileSetup({ jewelerName: 'A', avatarId: 'male-03' });

    expect(ok).toBe(false);
    expect(useGame.getState().profileSetupDone).toBe(false);
    expect(useGame.getState().profile).toEqual(defaultProfile());
  });

  it('adı normalize eder — sistem eki ve fazla boşluk kayda girmez', () => {
    useGame.getState().completeProfileSetup({
      jewelerName: '  Hacı   Bekir  Kuyumculuk ',
      avatarId: 'male-05',
    });

    expect(useGame.getState().profile.jewelerName).toBe('Hacı Bekir');
  });

  it('tanınmayan portre kimliği varsayılana düşer', () => {
    useGame.getState().completeProfileSetup({ jewelerName: 'Alvera', avatarId: 'yok-böyle-biri' });

    expect(useGame.getState().profile.avatarId).toBe(DEFAULT_AVATAR_ID);
  });

  it('YALNIZ profile dokunur — para, seviye, XP ve stok aynı kalır', () => {
    const before = useGame.getState();
    const fingerprint = {
      cash: before.store.cash,
      level: before.store.level,
      xp: before.store.xp,
      reputation: before.store.reputation,
      inventory: before.inventory.length,
      day: before.market.day,
      seed: before.seed,
    };

    useGame.getState().completeProfileSetup({ jewelerName: 'Alvera', avatarId: 'female-01' });

    const after = useGame.getState();
    expect({
      cash: after.store.cash,
      level: after.store.level,
      xp: after.store.xp,
      reputation: after.store.reputation,
      inventory: after.inventory.length,
      day: after.market.day,
      seed: after.seed,
    }).toEqual(fingerprint);
  });

  it('BALON ÇIKARMAZ — oyuncu daha oyuna girmeden "güncellendi" bildirimi görmemeli', () => {
    useGame.getState().completeProfileSetup({ jewelerName: 'Alvera', avatarId: 'male-02' });

    expect(useGame.getState().toasts).toEqual([]);
  });

  it('kaydı anında yazar — checkpoint beklemez', () => {
    useGame.getState().completeProfileSetup({ jewelerName: 'Alvera', avatarId: 'male-04' });

    const saved = readSave();
    expect(saved?.profile).toEqual({ jewelerName: 'Alvera', avatarId: 'male-04' });
    expect(saved?.profileSetupDone).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('oyun zamanı', () => {
  it('EKRAN AÇIKKEN DURUR — oyuncu adını yazarken müşteri kaçmaz (§4)', () => {
    const before = useGame.getState().market.clockMinutes;

    useGame.getState().tick(60);
    expect(useGame.getState().market.clockMinutes).toBe(before);
  });

  it('tamamlanınca kaldığı yerden akar — kalıcı donma olmaz', () => {
    const before = useGame.getState().market.clockMinutes;

    useGame.getState().completeProfileSetup({ jewelerName: 'Alvera', avatarId: 'male-01' });
    useGame.getState().tick(60);

    expect(useGame.getState().market.clockMinutes).toBeGreaterThan(before);
  });
});

// ---------------------------------------------------------------------------
/*
  "Kaydı sil" gerçekten siliyor mu?

  Bu blok karşılama ekranının EŞİ: ekran yalnız kaydı olmayana çıktığına
  göre, kaydı silmenin gerçekten kayıtsız bir açılış bırakması gerekir.
  Tarayıcıda ölçülene kadar bırakmıyordu — silme ile sayfa kapanışı arasında
  çalışan otomatik kayıt dosyayı geri yazıyordu.
*/
describe('kaydı silmek', () => {
  it('iki anahtarı da siler', () => {
    useGame.getState().saveGame();
    expect(localStorage.getItem('mihenkaynak.save.v1')).not.toBeNull();

    useGame.getState().resetGame();
    expect(localStorage.getItem('mihenkaynak.save.v1')).toBeNull();
    expect(localStorage.getItem('mihenkaynak.save.v1.backup')).toBeNull();
  });

  it('SİLDİKTEN SONRA OTOMATİK KAYIT DOSYAYI GERİ YAZAMAZ', () => {
    useGame.getState().saveGame();
    useGame.getState().resetGame();

    // Sayfa kapanırken çalışan flush'ın yaptığı şey birebir budur.
    expect(useGame.getState().saveGame()).toBe(true);
    expect(localStorage.getItem('mihenkaynak.save.v1')).toBeNull();
  });

  it('profil ve tercih yamaları da dosyayı diriltemez', () => {
    useGame.getState().saveGame();
    useGame.getState().resetGame();

    useGame.getState().updateProfile({ jewelerName: 'Alvera', avatarId: 'male-02' });
    useGame.getState().setPreference('soundEnabled', false);

    expect(localStorage.getItem('mihenkaynak.save.v1')).toBeNull();
  });

  it('YAZMAMAK HATA SAYILMAZ — arayüz yanlış uyarı göstermemeli', () => {
    useGame.getState().resetGame();
    // `false` dönseydi App.tsx "Kayıt yazılamadı" balonunu gösterirdi.
    expect(useGame.getState().saveGame()).toBe(true);
  });

  it('kayıt yüklemek kilidi kaldırır — devam eden oyun yine yazılır', () => {
    useGame.getState().saveGame();
    const raw = localStorage.getItem('mihenkaynak.save.v1')!;
    useGame.getState().resetGame();

    // Oyuncu fikrini değiştirdi: eski dosya yerine kondu ve yüklendi.
    localStorage.setItem('mihenkaynak.save.v1', raw);
    expect(useGame.getState().loadGame()).toBe(true);

    localStorage.removeItem('mihenkaynak.save.v1');
    useGame.getState().saveGame();
    expect(localStorage.getItem('mihenkaynak.save.v1')).not.toBeNull();
  });
});
