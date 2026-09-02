/**
 * A8 — "KARŞI TEKLİF" SINIRSIZ BASILAMAZ
 *
 * Sabır zaten harcanıyordu (`requestCounterPatienceCost`) ve mağaza da
 * uyguluyordu; eksik olan, DURUM MAKİNESİNİN buna tepki vermemesiydi.
 * `handleRequestCounter` her çağrıda `state: session.state` döndürdüğü için
 * müşteri sabrı sıfırlansa bile sonsuza dek karşı teklif veriyordu.
 * Tarayıcıda ölçülmüştü: karşı teklif 74.744 → 74.638 ₺'ye indi, sonra üç
 * turda hiç kımıldamadı; düğme hâlâ aktifti, hiçbir geri bildirim yoktu.
 *
 * BÜTÇE SABİT BİR TUR SAYISI DEĞİL, MÜŞTERİNİN SABRI. Bu, "Tatlı Dil"
 * yeteneği `patienceMax`'i büyüttükçe pazarlık alanının kendiliğinden
 * genişlemesi demek — ayrı bir yetenek kancası gerekmiyor. Aşağıdaki son
 * test tam olarak bunu sabitler.
 */

import { describe, expect, it } from 'vitest';
import { applyMove, createSession, type NegotiationContext } from './negotiation';
import { NEGOTIATION } from './balance';
import { defaultSkillProgress, startingPatience } from './skill-tree';
import type { Customer, NegotiationSession } from './types';

function customerWith(patienceMax: number): Customer {
  return {
    id: 'c1',
    displayName: 'Test Bey',
    archetype: 'informedSeller',
    intent: 'sell',
    patience: patienceMax,
    patienceMax,
    priceSensitivity: 50,
    suspicion: 0,
    trust: 50,
    reservationPrice: 100_000,
  } as unknown as Customer;
}

function contextFor(customer: Customer): NegotiationContext {
  return {
    customer,
    direction: 'shopBuys',
    reputation: 50,
    buyCeiling: 120_000,
    knowledge: [],
    fairValue: 100_000,
    haggleRoom: 0.05,
  } as unknown as NegotiationContext;
}

/**
 * Sabır bitene kadar karşı teklif ister; her turda mağazanın yaptığı gibi
 * `patienceDelta`'yı müşteriye işler (gameStore · negotiationMove).
 */
function spamCounters(patienceMax: number, limit = 40) {
  let customer = customerWith(patienceMax);
  let session: NegotiationSession = createSession('l', 'i');
  const states: string[] = [];

  for (let i = 0; i < limit; i++) {
    const out = applyMove(session, contextFor(customer), {
      kind: 'requestCounter',
      atRound: session.round,
    });
    session = out.session;
    customer = {
      ...customer,
      patience: Math.max(0, Math.min(customer.patienceMax, customer.patience + out.response.patienceDelta)),
    };
    states.push(out.response.state);
    if (out.response.state === 'REJECTED' || out.response.state === 'ACCEPTED') break;
  }
  return { states, session, customer, rounds: states.length };
}

describe('A8 · karşı teklif bütçesi', () => {
  it('sonsuza dek sürmez — sabır bitince RED ile kapanır', () => {
    const { states, rounds } = spamCounters(6);

    expect(states[states.length - 1]).toBe('REJECTED');
    expect(rounds).toBeLessThan(40);
  });

  it('kapanmadan önce SON TEKLİF aşamasından geçer — oyuncu uyarısız kalmaz', () => {
    const { states } = spamCounters(6);
    expect(states).toContain('FINAL_OFFER');
    expect(states.indexOf('FINAL_OFFER')).toBeLessThan(states.lastIndexOf('REJECTED'));
  });

  /*
    Bu tek değerde değil, HER sabır değerinde geçerli olmalı. İlk hâlde kural
    `handleOffer` ile birebir aynıydı ve gerçek müşterilerle ölçünce 180
    satıcının 177'si SON TEKLİF'i hiç görmeden reddediyordu:
    `finalOfferPatienceRatio` 0,28 ve sabır 3–4 olan müşteride tam sayı sabır
    o pencereye hiç düşmüyor. Aralık taraması o sınıf hatayı yakalar.
  */
  it.each([2, 3, 4, 5, 6, 8, 10, 14])(
    'sabır %i olan müşteride de RED öncesi SON TEKLİF gelir',
    (patienceMax) => {
      const { states } = spamCounters(patienceMax);

      expect(states[states.length - 1]).toBe('REJECTED');
      expect(states).toContain('FINAL_OFFER');
      expect(states.indexOf('FINAL_OFFER')).toBeLessThan(states.length - 1);
    },
  );

  it('ilk dokunuş asla işlemi bitirmez — soru sormak hakaret değildir', () => {
    for (const patienceMax of [1, 2, 3, 4]) {
      const first = spamCounters(patienceMax).states[0];
      expect(first).not.toBe('REJECTED');
    }
  });

  it('SON TEKLİF turunda karşı teklif bağlayıcı olur (finalOffer dolar)', () => {
    let customer = customerWith(6);
    let session: NegotiationSession = createSession('l', 'i');
    for (let i = 0; i < 40; i++) {
      const out = applyMove(session, contextFor(customer), { kind: 'requestCounter', atRound: session.round });
      session = out.session;
      customer = { ...customer, patience: Math.max(0, customer.patience + out.response.patienceDelta) };
      if (out.response.state === 'FINAL_OFFER') {
        expect(session.finalOffer).not.toBeNull();
        expect(session.finalOffer).toBe(out.response.counterOffer);
        return;
      }
    }
    throw new Error('SON TEKLİF aşamasına hiç geçilmedi');
  });

  it('terminal durumda ikinci dokunuş yeni sonuç üretmez — GDD 22.1', () => {
    const { session, customer } = spamCounters(6);
    const again = applyMove(session, contextFor(customer), {
      kind: 'requestCounter',
      atRound: session.round,
    });

    expect(again.session.state).toBe(session.state);
    expect(again.response.patienceDelta).toBe(0);
  });

  it('BÜTÇE SABİT DEĞİL — sabrı yüksek müşteride daha çok tur var', () => {
    const dar = spamCounters(4).rounds;
    const genis = spamCounters(10).rounds;

    expect(genis).toBeGreaterThan(dar);
  });

  it('YETENEK BÜTÇEYİ GENİŞLETİR — Tatlı Dil patienceMax üstünden çalışır', () => {
    // "Tatlı Dil" başlangıç sabrını artırır (skill-tree · startingPatience).
    // Bütçe sabır üstünden türediği için pazarlık alanı da onunla büyür.
    const base = 5;
    const yeteneksiz = startingPatience(base, defaultSkillProgress());
    const yetenekli = startingPatience(base, { ...defaultSkillProgress(), tatliDilLevel: 2 });

    expect(yetenekli).toBeGreaterThan(yeteneksiz);
    expect(spamCounters(yetenekli).rounds).toBeGreaterThan(spamCounters(yeteneksiz).rounds);
  });

  it('her tur sabırdan tam olarak sabit bedeli düşer', () => {
    let customer = customerWith(8);
    const session = createSession('l', 'i');
    const out = applyMove(session, contextFor(customer), { kind: 'requestCounter', atRound: 0 });

    expect(out.response.patienceDelta).toBe(-NEGOTIATION.requestCounterPatienceCost);
    customer = { ...customer, patience: customer.patience + out.response.patienceDelta };
    expect(customer.patience).toBe(8 - NEGOTIATION.requestCounterPatienceCost);
  });
});
