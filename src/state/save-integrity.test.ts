import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGame, type GameState } from './gameStore';
import { clearSave, persistPreferences, persistProfile, readSave, readSaveSummary, resumeSaves, serialize, writeSave } from './save';

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

class FaultStorage extends MemoryStorage {
  blocked = false;
  failReadback = false;
  private pendingReadback = false;

  override getItem(key: string) {
    if (key === PRIMARY_KEY && this.pendingReadback) {
      this.pendingReadback = false;
      this.failReadback = false;
      return '{mismatched-readback';
    }
    return super.getItem(key);
  }

  override setItem(key: string, value: string) {
    if (this.blocked) throw new Error('Storage unavailable');
    super.setItem(key, value);
    if (key === PRIMARY_KEY && this.failReadback) this.pendingReadback = true;
  }
}

function stateAt(day: number, cash: number): GameState {
  const current = useGame.getState();
  return {
    ...current,
    market: { ...current.market, day, clockMinutes: 540 },
    store: { ...current.store, cash },
    ledger: {
      ...current.ledger,
      appliedTxIds: [...current.ledger.appliedTxIds],
      transactions: [...current.ledger.transactions],
      deals: [...current.ledger.deals],
    },
  };
}

describe('yedekli ve doğrulanabilir kayıt', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    resumeSaves();
    clearSave();
  });

  afterEach(() => {
    resumeSaves();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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

  it('aynı checkpointi tekrar yazmaz; zamanı ve önceki sağlam yedeği korur', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    expect(writeSave(stateAt(11, 350_000))).toBe(true);
    const state = stateAt(12, 345_678);
    expect(writeSave(state)).toBe(true);
    const primary = localStorage.getItem(PRIMARY_KEY);
    const backup = localStorage.getItem(BACKUP_KEY);
    const setItem = vi.spyOn(localStorage, 'setItem');
    now.mockReturnValue(1_800_000_072_000);

    expect(writeSave(state)).toBe(true);
    expect(writeSave({ ...state })).toBe(true);

    expect(setItem).not.toHaveBeenCalled();
    expect(localStorage.getItem(PRIMARY_KEY)).toBe(primary);
    expect(localStorage.getItem(BACKUP_KEY)).toBe(backup);
    expect(readSaveSummary()?.savedAt).toBe(1_800_000_000_000);
  });

  it('aynı durum nesnesindeki nakit değişimini saklar', () => {
    const state = stateAt(12, 345_678);
    expect(writeSave(state)).toBe(true);
    state.store.cash += 123;

    expect(writeSave(state)).toBe(true);

    expect(readSave()?.store.cash).toBe(345_801);
  });

  it('aynı defter nesnesine eklenen işlem ve tekrar koruma anahtarını saklar', () => {
    const state = stateAt(12, 345_678);
    expect(writeSave(state)).toBe(true);
    const txId = 'in-place-save-integrity';
    state.ledger.appliedTxIds.push(txId);
    state.ledger.transactions.push({
      txId, dealId: txId, day: 12, cashDelta: 0, itemsIn: [], itemsOut: [],
      trustDelta: 0, reputationDelta: 0, xpDelta: 0, label: 'Synthetic save integrity fixture',
    });

    expect(writeSave(state)).toBe(true);

    expect(readSave()?.ledger.appliedTxIds).toContain(txId);
    expect(readSave()?.ledger.transactions.at(-1)?.txId).toBe(txId);
  });

  it.each(['deleted', 'corrupted', 'replaced'] as const)(
    'ana kayıt dışarıdan %s olduğunda aynı checkpointi yeniden doğrular',
    change => {
      expect(writeSave(stateAt(11, 350_000))).toBe(true);
      const state = stateAt(12, 345_678);
      expect(writeSave(state)).toBe(true);
      const validBackup = localStorage.getItem(BACKUP_KEY);
      const replacement = JSON.stringify(serialize(stateAt(33, 999_999)));
      if (change === 'deleted') localStorage.removeItem(PRIMARY_KEY);
      if (change === 'corrupted') localStorage.setItem(PRIMARY_KEY, '{external-corruption');
      if (change === 'replaced') localStorage.setItem(PRIMARY_KEY, replacement);
      const setItem = vi.spyOn(localStorage, 'setItem');

      expect(writeSave(state)).toBe(true);

      expect(setItem).toHaveBeenCalledWith(PRIMARY_KEY, expect.stringMatching(/^mihenk-gzip-v1:/));
      expect(readSaveSummary()).toMatchObject({ day: 12, cash: 345_678 });
      expect(localStorage.getItem(BACKUP_KEY)).toBe(change === 'replaced' ? replacement : validBackup);
    },
  );

  it('başarısız yazımı başarı saymaz; aynı checkpoint güvenle yeniden denenir', () => {
    const storage = new FaultStorage();
    vi.stubGlobal('localStorage', storage);
    const state = stateAt(12, 345_678);
    storage.blocked = true;

    expect(writeSave(state)).toBe(false);
    expect(writeSave(state)).toBe(false);
    expect(storage.getItem(PRIMARY_KEY)).toBeNull();

    storage.blocked = false;
    expect(writeSave(state)).toBe(true);
    expect(readSaveSummary()).toMatchObject({ day: 12, cash: 345_678 });
  });

  it('geri okuma doğrulanmadığında depodaki byte eşleşmesi başarı önbelleği oluşturmaz', () => {
    const storage = new FaultStorage();
    vi.stubGlobal('localStorage', storage);
    const state = stateAt(12, 345_678);
    storage.failReadback = true;

    expect(writeSave(state)).toBe(false);
    expect(storage.getItem(PRIMARY_KEY)).toMatch(/^mihenk-gzip-v1:/);
    storage.blocked = true;
    expect(writeSave(state)).toBe(false);

    storage.blocked = false;
    expect(writeSave(state)).toBe(true);
    expect(readSaveSummary()).toMatchObject({ day: 12, cash: 345_678 });
  });

  it('profil yaması checkpoint ekonomisini korur ve tam kayıt denetimini atlatamaz', () => {
    const state: GameState = { ...stateAt(12, 345_678), profile: { jewelerName: 'İlk Profil', avatarId: 'male-01' } };
    expect(writeSave(state)).toBe(true);
    expect(persistProfile({
      ...stateAt(13, 100), profile: { jewelerName: 'Yeni Profil', avatarId: 'male-02' },
    })).toBe(true);
    expect(readSaveSummary()).toMatchObject({ day: 12, cash: 345_678 });
    expect(readSave()?.profile.jewelerName).toBe('Yeni Profil');

    expect(writeSave(state)).toBe(true);

    expect(readSave()?.profile).toEqual(state.profile);
  });

  it('tercih yaması checkpoint ekonomisini korur ve tam kayıt denetimini atlatamaz', () => {
    const state = stateAt(12, 345_678);
    expect(writeSave(state)).toBe(true);
    const preferences = { ...state.preferences, soundEnabled: !state.preferences.soundEnabled };
    expect(persistPreferences({ ...stateAt(13, 100), preferences })).toBe(true);
    expect(readSaveSummary()).toMatchObject({ day: 12, cash: 345_678 });
    expect(readSave()?.preferences).toEqual(preferences);

    expect(writeSave(state)).toBe(true);

    expect(readSave()?.preferences).toEqual(state.preferences);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    'JSON içinde null olan %s gününü sağlam yedeğin yerine geçirmez',
    day => {
      expect(writeSave(stateAt(12, 345_678))).toBe(true);
      const validPrimary = localStorage.getItem(PRIMARY_KEY);
      expect(writeSave(stateAt(day, 300_000))).toBe(true);
      expect(localStorage.getItem(BACKUP_KEY)).toBe(validPrimary);
      expect(readSaveSummary()).toMatchObject({ day: 12, cash: 345_678 });

      expect(writeSave(stateAt(14, 280_000))).toBe(true);

      expect(localStorage.getItem(BACKUP_KEY)).toBe(validPrimary);
      localStorage.setItem(PRIMARY_KEY, '{external-corruption');
      expect(readSaveSummary()).toMatchObject({ day: 12, cash: 345_678 });
    },
  );
});
