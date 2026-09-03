/**
 * FON MÜZİĞİ — sunum katmanı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KAPSAM: yalnız müzik çalar. Oyun durumunu DEĞİŞTİRMEZ, ekonomi/değerleme
 * modülü import ETMEZ. Ses efektleriyle aynı sözleşme: çalamadığı her durumda
 * sessizce ve zararsızca geçer.
 *
 * NEDEN `<audio>` ÖĞESİ, EFEKTLER GİBİ WEB AUDIO TAMPONU DEĞİL:
 * efektler yarım saniyelik; müzik 40 saniyelik ve sürekli. `decodeAudioData`
 * bütün parçayı sıkıştırılmamış olarak belleğe açardı (40 s × 16 kHz × 4 bayt
 * ≈ 2,5 MB float) ve döngüyü elle dikmek gerekirdi. `<audio loop>` parçayı
 * akıtır, döngüyü tarayıcı örnek düzeyinde kapatır — dosya zaten dikişsiz
 * üretildiği için ek bir çapraz geçiş de gerekmiyor.
 *
 * KİLİT AYNI KURALA TABİ: tarayıcı, kullanıcı sayfaya dokunmadan çalmaya izin
 * vermez. `play()` reddedilirse istek YUTULMAZ, "istendi" olarak saklanır ve
 * ilk jestte tekrar denenir; aksi hâlde oyuncu müziği açar, hiçbir şey olmaz
 * ve bir daha da olmazdı.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const KAYNAK = 'assets/audio/music/tezgah.wav';

/**
 * Müzik, efektlerin ALTINDA durur. Ses düzeyi kaydırıcısı ikisini birden
 * yönetiyor; müziğe aynı değeri vermek onu öne çıkarır ve efektleri örterdi.
 * 0,42 ölçüyle değil kararla seçildi: fon, dikkat çekmemesi gereken katman.
 */
const MUZIK_ORANI = 0.42;

let el: HTMLAudioElement | null = null;
/** Oyuncu müziği istedi mi — `play()` reddedilse bile bu bilgi korunur. */
let istendi = false;
let sonSes = 0;

function destekli(): boolean {
  return typeof document !== 'undefined' && typeof Audio === 'function';
}

function ogeyiKur(): HTMLAudioElement | null {
  if (el) return el;
  if (!destekli()) return null;
  try {
    const a = new Audio(KAYNAK);
    a.loop = true;
    a.preload = 'auto';
    // iOS'ta ses öğesinin tam ekrana geçmeye çalışmasını engeller.
    a.setAttribute('playsinline', '');
    a.volume = sonSes;
    el = a;
    return a;
  } catch {
    return null;
  }
}

/**
 * Müziği tercihlere göre çalar ya da durdurur. Her tercih değişiminde ve her
 * kilit açma jestinde çağrılabilir; gereksiz çağrı zararsızdır.
 *
 * @param enabled `preferences.musicEnabled`
 * @param volume  `preferences.soundVolume` (0–100)
 */
export function applyMusic(enabled: boolean, volume: number): void {
  istendi = enabled;
  const oran = Math.min(100, Math.max(0, volume)) / 100;
  sonSes = oran * MUZIK_ORANI;

  const a = enabled ? ogeyiKur() : el;
  if (!a) return;

  a.volume = sonSes;
  if (!enabled || sonSes <= 0) {
    a.pause();
    return;
  }
  if (a.paused) {
    // Reddedilirse sessiz kalınır; `istendi` true kaldığı için ilk jestte
    // `resumeMusic` yeniden dener.
    void a.play().catch(() => undefined);
  }
}

/**
 * Kullanıcı jestinde ve ekran geri geldiğinde çağrılır.
 *
 * Ses efektlerindeki `AudioContext` ile aynı dert: iOS uygulamayı arka plana
 * atınca çalmayı durduruyor ve kendiliğinden geri gelmiyor. Oyuncunun gördüğü
 * "müzik bir süre sonra kesildi" olurdu.
 */
export function resumeMusic(): void {
  if (!istendi || !el || sonSes <= 0) return;
  if (el.paused) void el.play().catch(() => undefined);
}

/** Arayüzün dürüst konuşabilmesi için: müzik gerçekten çalıyor mu? */
export function musicStatus(): { supported: boolean; requested: boolean; playing: boolean } {
  return {
    supported: destekli(),
    requested: istendi,
    playing: !!el && !el.paused && !el.ended,
  };
}

/** Testler için: modül durumunu sıfırlar. */
export function resetMusicForTests(): void {
  if (el) {
    try {
      el.pause();
    } catch {
      // yok sayılır
    }
  }
  el = null;
  istendi = false;
  sonSes = 0;
}
