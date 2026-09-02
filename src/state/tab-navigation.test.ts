/**
 * A2 — ALT NAVİGASYON: AYNI SEKMEYE TEKRAR DOKUNMAK KÖKE DÖNDÜRÜR
 *
 * Kök ekranlar alt rotalarını kendi state'lerinde tutar (İşletme'nin Piyasa,
 * Toptancı, Kayıt… sayfaları). Alt rotadayken alt navigasyonda aynı sekmeye
 * basmak `setTab`'i çağırıyor ama sekme zaten o değer olduğu için hiçbir şey
 * değişmiyordu; oyuncu alt rotada kilitli kalıyordu (tarayıcıda ölçüldü).
 *
 * `setTab` artık iki olayı ayırıyor:
 *   başka sekme  → `tab` değişir, sayaç sabit kalır
 *   aynı sekme   → `tab` sabit kalır, `tabHomeSignal` bir artar
 *
 * Kök ekranlar sayacı izleyip rotalarını köke çeker. Buradaki testler
 * sözleşmenin mağaza tarafını korur; React tarafı tarayıcıda doğrulandı.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useGame } from './gameStore';

const initial = useGame.getState();

beforeEach(() => {
  useGame.setState({ ...initial, tab: 'shop', tabHomeSignal: 0 }, true);
});
afterEach(() => {
  useGame.setState(initial, true);
});

describe('setTab', () => {
  it('başlangıçta köke dönüş sinyali sıfırdır', () => {
    expect(useGame.getState().tabHomeSignal).toBe(0);
  });

  it('başka bir sekmeye geçince sekme değişir, sinyal artmaz', () => {
    useGame.getState().setTab('business');

    expect(useGame.getState().tab).toBe('business');
    expect(useGame.getState().tabHomeSignal).toBe(0);
  });

  it('aynı sekmeye tekrar dokununca sinyal artar, sekme değişmez', () => {
    useGame.getState().setTab('business');
    useGame.getState().setTab('business');

    expect(useGame.getState().tab).toBe('business');
    expect(useGame.getState().tabHomeSignal).toBe(1);
  });

  it('her tekrar dokunuş sinyali bir artırır', () => {
    useGame.getState().setTab('business');
    for (let i = 0; i < 3; i += 1) useGame.getState().setTab('business');

    expect(useGame.getState().tabHomeSignal).toBe(3);
  });

  it('araya başka bir sekme girince sinyal artmaz ama sıfırlanmaz da', () => {
    useGame.getState().setTab('business');
    useGame.getState().setTab('business'); // sinyal 1
    useGame.getState().setTab('stock'); // sekme değişti
    useGame.getState().setTab('business'); // sekme yine değişti

    expect(useGame.getState().tab).toBe('business');
    expect(useGame.getState().tabHomeSignal).toBe(1);

    useGame.getState().setTab('business'); // aynı sekme → sinyal 2
    expect(useGame.getState().tabHomeSignal).toBe(2);
  });

  it('sinyal her kök sekme için aynı şekilde çalışır', () => {
    const tabs = ['shop', 'stock', 'workshop', 'market', 'business'] as const;

    for (const tab of tabs) {
      // Sekme zaten açıksa ilk dokunuş "köke dön" sayılır; testi tek bir
      // davranışa odaklamak için önce kesin olarak BAŞKA bir sekmeye geçiyoruz.
      const other = tabs.find((t) => t !== useGame.getState().tab && t !== tab)!;
      useGame.getState().setTab(other);

      useGame.getState().setTab(tab);
      expect(useGame.getState().tab).toBe(tab);

      const before = useGame.getState().tabHomeSignal;
      useGame.getState().setTab(tab);
      expect(useGame.getState().tabHomeSignal).toBe(before + 1);
    }
  });
});
