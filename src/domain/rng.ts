/**
 * MIHENKAYNAK — Determinizm katmanı
 * Kaynak: GDD 28.3 "Determinizm sözleşmesi", 5.4 "REROLL YOK", 34.1–34.2.
 *
 * Sözleşme:
 *  - Customer/Item hidden truth spawn anında seed ile sabitlenir.
 *  - Reservation price ve pazarlık tarzı sabittir.
 *  - Aynı save'i yeniden yüklemek ekonomik sonucu değiştirmez.
 *
 * Bunu garanti etmenin yolu global bir RNG akışına güvenmemektir. Her spawn
 * kendi *türetilmiş* seed'ini alır; seed = f(kökSeed, alan, sayaç). Aynı
 * girdiler her zaman aynı çıktıyı verir — yükleme sırasından bağımsız.
 */

/** 32-bit karışım — string alanı sayısal seed'e çevirir (FNV-1a türevi). */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** İki seed'i çakışmayacak biçimde birleştirir. */
export function deriveSeed(rootSeed: number, channel: string, counter = 0): number {
  const mixed = Math.imul(rootSeed ^ hashString(channel), 0x9e3779b1) >>> 0;
  return (Math.imul(mixed ^ (counter + 0x165667b1), 0x27d4eb2f) >>> 0) >>> 0;
}

/**
 * Deterministik akış. mulberry32 — hızlı, iyi dağılımlı, 32-bit durum.
 * Aynı seed ile oluşturulan iki Rng her zaman aynı diziyi üretir.
 */
export class Rng {
  private state: number;
  readonly seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.state = this.seed;
  }

  /** [0, 1) */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [min, max) sürekli. */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** [min, max] tam sayı. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Verilen olasılıkla true. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Diziden bir eleman. Boş dizi için hata fırlatır — sessiz undefined yok. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: boş dizi');
    return items[Math.floor(this.next() * items.length)] as T;
  }

  /** Ağırlıklı seçim. */
  pickWeighted<T>(items: readonly { value: T; weight: number }[]): T {
    if (items.length === 0) throw new Error('Rng.pickWeighted: boş dizi');
    const total = items.reduce((s, i) => s + i.weight, 0);
    let roll = this.next() * total;
    for (const item of items) {
      roll -= item.weight;
      if (roll <= 0) return item.value;
    }
    return items[items.length - 1]!.value;
  }

  /**
   * Merkeze eğilimli örnekleme — üç örneğin ortalaması.
   * Uç değerleri seyrekleştirir; "problem çeşitlendirir, çözümü belirlemez"
   * (GDD 34.17) ilkesine uygun dağılım verir.
   */
  centered(min: number, max: number): number {
    const a = (this.next() + this.next() + this.next()) / 3;
    return min + a * (max - min);
  }

  /** Bant tipindeki tasarım parametrelerini örneklemek için kısayol. */
  band([min, max]: readonly [number, number]): number {
    return this.range(min, max);
  }

  /** Determinstik dizi karıştırma (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const tmp = out[i] as T;
      out[i] = out[j] as T;
      out[j] = tmp;
    }
    return out;
  }
}

/**
 * Kimlik üreteci — deterministik ve çakışmasız.
 * Date.now()/Math.random() kullanılmaz; aksi hâlde aynı save iki kez
 * yüklendiğinde farklı ID'ler üretilir ve settlement idempotency'si bozulur.
 */
export function makeId(prefix: string, rootSeed: number, counter: number): string {
  const h = deriveSeed(rootSeed, prefix, counter).toString(36);
  return `${prefix}_${counter.toString(36)}_${h.slice(0, 6)}`;
}
