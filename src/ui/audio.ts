/**
 * SES OYNATICI — sunum katmanı.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KAPSAM: bu modül yalnız SES ÇALAR. Hiçbir ekonomi, değerleme veya
 * ilerleme modülü import etmez ve oyun durumunu DEĞİŞTİRMEZ. Ses bir geri
 * bildirimdir; kararı etkileyen hiçbir şey buradan geçmez.
 *
 * ÜÇ GERÇEK KISITA GÖRE YAZILDI — üçü de sessiz çökme sebebiydi:
 *
 * 1. TARAYICI OTOMATİK OYNATMAYI ENGELLER. Kullanıcı sayfaya dokunmadan
 *    `AudioContext` "suspended" başlar. Bu yüzden ilk dokunuşta açılır
 *    (`unlock`); o ana kadar gelen istekler sessizce yutulur, kuyruğa
 *    alınmaz — üç dakika sonra topluca çalan sesler hata gibi duyulurdu.
 *
 * 2. DOSYA OLMAYABİLİR. Ses dosyaları ürüne sonradan giren varlıklardır;
 *    biri eksikse ya da çözülemezse oyun ÇALIŞMAYA DEVAM ETMELİ. Her yükleme
 *    tek tek denenir, başarısız olan bir daha denenmez ve sessiz kalır.
 *
 * 3. TEST ORTAMINDA `window` YOK. Vitest node ortamında koşuyor; `AudioContext`
 *    tanımlı değil. Modül import edilebilir olmalı ve çağrıldığında çökmemeli.
 *
 * SES AÇMA/KAPAMA VE DÜZEY tercihlerden okunur (`preferences`), ama bu modül
 * mağazayı import ETMEZ — çağıran taraf değerleri geçirir. Böylece oynatıcı
 * tek başına test edilebilir kalır.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type SoundId =
  | 'tap'
  | 'coins'
  | 'deal'
  | 'deny'
  | 'chime'
  | 'customer'
  | 'test'
  | 'levelup';

/**
 * Dosya adları tek yerde. Uzantı burada durduğu için ileride aynı sesler
 * `.ogg` olarak konursa yalnız bu tablo değişir.
 */
export const AUDIO_FILES: Record<SoundId, string> = {
  tap: 'tap.wav',
  coins: 'coins.wav',
  deal: 'deal.wav',
  deny: 'deny.wav',
  chime: 'chime.wav',
  customer: 'customer.wav',
  test: 'test.wav',
  levelup: 'levelup.wav',
};

const BASE = 'assets/audio/';

/** Aynı ses üst üste binerse kulakta cızırtı olur; bu aralıkta tekrarı yut. */
const MIN_REPEAT_MS = 60;

type Ctx = AudioContext & { state: AudioContextState };

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let unlocked = false;
const buffers = new Map<SoundId, AudioBuffer>();
const failed = new Set<SoundId>();
const lastPlayed = new Map<SoundId, number>();

function audioSupported(): boolean {
  return typeof window !== 'undefined'
    && typeof (window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext) === 'function';
}

function ensureContext(): Ctx | null {
  if (ctx) return ctx;
  if (!audioSupported()) return null;
  try {
    const Ctor = window.AudioContext
      ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor() as Ctx;
    master = ctx.createGain();
    master.connect(ctx.destination);
    return ctx;
  } catch {
    return null;
  }
}

/**
 * İlk kullanıcı hareketinde çağrılır. Tarayıcı politikası gereği
 * `AudioContext` ancak bir jestten sonra çalışmaya başlar.
 */
export function unlockAudio(): void {
  const c = ensureContext();
  if (!c) return;
  unlocked = true;
  if (c.state === 'suspended') void c.resume().catch(() => undefined);
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

async function loadBuffer(id: SoundId): Promise<AudioBuffer | null> {
  const cached = buffers.get(id);
  if (cached) return cached;
  if (failed.has(id)) return null;
  const c = ensureContext();
  if (!c) return null;
  try {
    const response = await fetch(BASE + AUDIO_FILES[id]);
    if (!response.ok) throw new Error(String(response.status));
    const buffer = await c.decodeAudioData(await response.arrayBuffer());
    buffers.set(id, buffer);
    return buffer;
  } catch {
    // Eksik ya da bozuk dosya oyunu durdurmaz; bu ses sessiz kalır.
    failed.add(id);
    return null;
  }
}

/** Sesleri önceden çöz — ilk çalışta gecikme olmasın. */
export function preloadAudio(ids: readonly SoundId[] = Object.keys(AUDIO_FILES) as SoundId[]): void {
  if (!audioSupported()) return;
  for (const id of ids) void loadBuffer(id);
}

/**
 * Sesi çalar. Kapalıysa, kilitliyse, dosya yoksa ya da ortam desteklemiyorsa
 * SESSİZCE hiçbir şey yapmaz — çağıran tarafın kontrol etmesi gerekmez.
 *
 * @param volume 0–100 arası tam sayı (tercihlerdeki `soundVolume`).
 */
export function playSound(id: SoundId, enabled: boolean, volume: number): void {
  if (!enabled || !unlocked) return;
  const gain = Math.min(100, Math.max(0, volume)) / 100;
  if (gain <= 0) return;

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const previous = lastPlayed.get(id);
  if (previous !== undefined && now - previous < MIN_REPEAT_MS) return;
  lastPlayed.set(id, now);

  void loadBuffer(id).then((buffer) => {
    const c = ctx;
    if (!buffer || !c || !master || c.state !== 'running') return;
    try {
      const source = c.createBufferSource();
      source.buffer = buffer;
      const node = c.createGain();
      node.gain.value = gain;
      source.connect(node);
      node.connect(master);
      source.start();
    } catch {
      // Oynatma başarısızsa ses yok; oyun akışı etkilenmez.
    }
  });
}

/** Testler için: modül durumunu sıfırlar. */
export function resetAudioForTests(): void {
  ctx = null;
  master = null;
  unlocked = false;
  buffers.clear();
  failed.clear();
  lastPlayed.clear();
}
