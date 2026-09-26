import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGame, type GameState } from './gameStore';
import { clearSave, readSave, readSaveSummary, serialize, writeSave } from './save';

const PRIMARY_KEY = 'mihenkaynak.save.v1';
const BACKUP_KEY = 'mihenkaynak.save.v1.backup';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

class QuotaStorage extends MemoryStorage {
  constructor(private readonly maxChars: number) { super(); }

  override setItem(key: string, value: string) {
    let total = value.length;
    for (let index = 0; index < this.length; index += 1) {
      const storedKey = this.key(index);
      if (storedKey && storedKey !== key) total += this.getItem(storedKey)?.length ?? 0;
    }
    if (total > this.maxChars) throw new DOMException('Quota exceeded', 'QuotaExceededError');
    super.setItem(key, value);
  }
}

function stateAt(day: number, cash: number): GameState {
  const current = useGame.getState();
  return {
    ...current,
    market: { ...current.market, day, clockMinutes: 540 },
    store: { ...current.store, cash },
  };
}

describe('yedekli ve doğrulanabilir kayıt', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('yazdığı checkpointi geri okuyup özetler', () => {
    expect(writeSave(stateAt(12, 345_678))).toBe(true);
    expect(readSaveSummary()).toMatchObject({ day: 12, cash: 345_678 });
    expect(readSave()?.market.day).toBe(12);
  });

  it('ana kayıt bozulursa son sağlam yedeğe döner', () => {
    expect(writeSave(stateAt(12, 345_678))).toBe(true);
    expect(writeSave(stateAt(13, 300_000))).toBe(true);

    localStorage.setItem(PRIMARY_KEY, '{yarim-json');

    expect(readSaveSummary()).toMatchObject({ day: 12, cash: 345_678 });
    expect(readSave()?.market.day).toBe(12);
  });

  it('kayıt silme hem ana kaydı hem yedeği temizler', () => {
    writeSave(stateAt(12, 345_678));
    writeSave(stateAt(13, 300_000));
    expect(localStorage.getItem(BACKUP_KEY)).not.toBeNull();

    clearSave();

    expect(localStorage.getItem(PRIMARY_KEY)).toBeNull();
    expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('eski düz JSON kaydı okuyup sıkıştırılmış biçime güvenle geçirir', () => {
    const old = stateAt(15, 410_000);
    const serialized = JSON.stringify(serialize(old));
    localStorage.setItem(PRIMARY_KEY, serialized);
    expect(readSave()?.market.day).toBe(15);
    expect(writeSave(stateAt(16, 420_000))).toBe(true);
    expect(localStorage.getItem(PRIMARY_KEY)).toMatch(/^mihenk-gzip-v1:/);
    expect(readSaveSummary()).toMatchObject({ day: 16, cash: 420_000 });
  });

  it('yedek sığmadığında işlemi durdurmaz; sıkıştırılmış ana kaydı doğrular', () => {
    const old = stateAt(15, 410_000);
    const raw = JSON.stringify(serialize(old));
    const storage = new QuotaStorage(raw.length + 1);
    vi.stubGlobal('localStorage', storage);
    storage.setItem(PRIMARY_KEY, raw);

    expect(writeSave(stateAt(16, 420_000))).toBe(true);
    expect(readSaveSummary()).toMatchObject({ day: 16, cash: 420_000 });
    expect(storage.getItem(PRIMARY_KEY)).toMatch(/^mihenk-gzip-v1:/);
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('yedek yer doldurursa yalnız yedeği atıp ana kaydı yeniden dener', () => {
    const first = stateAt(15, 410_000);
    const storage = new QuotaStorage(18_000);
    vi.stubGlobal('localStorage', storage);
    expect(writeSave(first)).toBe(true);
    const primary = storage.getItem(PRIMARY_KEY)!;
    storage.setItem(BACKUP_KEY, 'x'.repeat(18_000 - primary.length - 100));

    expect(writeSave(stateAt(16, 420_000))).toBe(true);
    expect(readSaveSummary()).toMatchObject({ day: 16, cash: 420_000 });
  });
});
