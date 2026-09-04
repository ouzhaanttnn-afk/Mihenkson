import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

import { localizedMessage } from '@domain/localized-message';
import { applyMove, createSession, type NegotiationContext } from '@domain/negotiation';
import type { Customer } from '@domain/types';
import { defaultPreferences } from '@domain/preferences';
import { setCurrency } from '@i18n/currency';
import { setLanguage, t } from '@i18n/index';
import { tl } from '@i18n/money';
import { deserialize, serialize } from '@state/save';
import { useGame } from '@state/gameStore';
import { renderCustomerMessage } from './customer-message';

const initial = useGame.getState();

function context(): NegotiationContext {
  const customer = {
    id: 'localization-customer',
    displayName: 'Test Bey',
    archetype: 'informedSeller',
    intent: 'sell',
    patience: 10,
    patienceMax: 10,
    priceSensitivity: 50,
    suspicion: 0,
    trust: 50,
    urgency: 50,
    knowledge: 50,
    reservationPrice: 100_000,
  } as unknown as Customer;

  return {
    customer,
    direction: 'shopBuys',
    reputation: 50,
    buyCeiling: 120_000,
    knowledge: [],
    fairValue: 100_000,
    haggleRoom: 1,
  };
}

afterEach(() => {
  setLanguage('tr');
  setCurrency('try');
  useGame.setState(initial, true);
});

describe('aktif müşteri mesajı yerelleştirmesi', () => {
  it('aynı pazarlık yanıtını dil ve para birimi değişince yeniden çizer', () => {
    setLanguage('tr');
    setCurrency('try');
    const { response } = applyMove(createSession('line', 'item'), context(), {
      kind: 'requestCounter',
      atRound: 0,
    });
    const amount = response.counterOffer!;

    expect(response.message).toEqual({
      key: 'Benim beklentim {tutar} civarı.',
      params: { tutar: { kind: 'money', value: amount } },
    });
    expect(renderCustomerMessage(response.message)).toBe(
      `Benim beklentim ${tl(amount)} civarı.`,
    );

    setLanguage('en');
    setCurrency('usd');

    expect(renderCustomerMessage(response.message)).toBe(
      `What I'm after is around ${tl(amount)}.`,
    );
  });

  it('yapısal mesaj JSON kaydından aynen döner; eski string kaydı da okunur', () => {
    const structured = localizedMessage('Anlaştık. Sağ olun.');
    const file = serialize({ ...useGame.getState(), customerMessage: structured });
    const restored = deserialize(JSON.parse(JSON.stringify(file)));

    expect(restored.customerMessage).toEqual(structured);

    setLanguage('en');
    expect(renderCustomerMessage(restored.customerMessage)).toBe('We have a deal. Thank you.');

    const legacy = deserialize({ ...file, customerMessage: 'Anlaştık. Sağ olun.' });
    expect(renderCustomerMessage(legacy.customerMessage)).toBe('We have a deal. Thank you.');
  });

  it('gameStore ilk alış talebini de kayıtlı Türkçe özete kilitlemez', () => {
    const customer = {
      ...context().customer,
      id: 'buyer',
      intent: 'buy',
      lineIds: [],
      demand: {
        families: ['bullion'],
        wantsBullion: true,
        templateId: 'quarter_gold',
        quantity: 3,
        isBulk: false,
        acceptsPartial: true,
        minQuantity: 1,
        summary: '3 adet Çeyrek Altın',
        alternativesLabel: '',
      },
    } as Customer;
    useGame.setState({
      ...initial,
      profileSetupDone: true,
      preferences: defaultPreferences(),
      queue: [{ customer, items: [] }],
      activeCustomer: null,
      activeDeal: null,
    }, true);

    useGame.getState().greetCustomer();
    const message = useGame.getState().customerMessage;

    expect(typeof message).toBe('object');
    expect(renderCustomerMessage(message)).toBe('3 adet Çeyrek Altın için geldim.');

    setLanguage('en');
    expect(renderCustomerMessage(message)).toBe("I've come about 3 × Quarter Coin.");
  });

  it('Zustand abonelerine yeni tercih bildirilmeden önce i18n dili kurulur', () => {
    let observed = '';
    const unsubscribe = useGame.subscribe((next, previous) => {
      if (next.preferences.language !== previous.preferences.language) observed = t('Dükkan');
    });

    try {
      useGame.getState().setPreference('language', 'en');
    } finally {
      unsubscribe();
    }

    expect(observed).toBe('Shop');
  });
});

describe('sunum tercihi React durumu sıfırlamaz', () => {
  it('cihaz ağacını dil/para anahtarıyla remount etmez', () => {
    const app = readFileSync(fileURLToPath(new URL('./App.tsx', import.meta.url)), 'utf8');

    expect(app).toContain('useGame((s) => s.preferences.currency)');
    expect(app).not.toMatch(/<div className="device"[^>]*\bkey=/);
    expect(app).not.toContain('key={`${language}-${currency}`}');
  });
});
