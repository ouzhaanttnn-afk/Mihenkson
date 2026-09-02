import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGame, type GameState } from './gameStore';
import { clearSave, readSave, readSaveSummary, writeSave } from './save';

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
});
