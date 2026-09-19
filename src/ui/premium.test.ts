import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  platform: vi.fn(), isNative: vi.fn(),
  bridge: { getStatus: vi.fn(), getProduct: vi.fn(), purchase: vi.fn(), restore: vi.fn(), addListener: vi.fn() },
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: mocks.platform, isNativePlatform: mocks.isNative },
  registerPlugin: () => mocks.bridge,
}));
const product = { id: 'com.mihenkaynak.app.premium.lifetime', displayPrice: '₺299,00', canPurchase: true };
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  mocks.platform.mockReturnValue('ios'); mocks.isNative.mockReturnValue(true);
  mocks.bridge.getStatus.mockResolvedValue({ active: false });
  mocks.bridge.getProduct.mockResolvedValue(product);
});

describe('Premium: Apple entitlement only', () => {
  it('never enables purchases on web or Android', async () => {
    const p = await import('./premium');
    for (const platform of ['web', 'android']) {
      mocks.platform.mockReturnValue(platform);
      await p.loadPremiumProduct(); await p.buyPremium(); await p.restorePremium();
      expect(await p.premiumEntitlement()).toBe(false);
    }
    expect(mocks.bridge.purchase).not.toHaveBeenCalled();
    expect(mocks.bridge.restore).not.toHaveBeenCalled();
  });
  it('uses store-localized price; rejects wrong product', async () => {
    const p = await import('./premium'); await p.loadPremiumProduct();
    expect(p.usePremium.getState().product?.displayPrice).toBe('₺299,00');
    mocks.bridge.getProduct.mockResolvedValue({ ...product, id: 'wrong' });
    await p.loadPremiumProduct(); expect(p.usePremium.getState().product).toBeNull();
  });
  it.each(['pending', 'cancelled'] as const)('%s does not unlock', async (status) => {
    const p = await import('./premium'); await p.loadPremiumProduct();
    mocks.bridge.purchase.mockResolvedValue({ status }); await p.buyPremium();
    expect(p.usePremium.getState()).toMatchObject({ active: false, busy: false, message: status });
  });
  it('successful payment still requires current verified ownership', async () => {
    const p = await import('./premium'); await p.loadPremiumProduct();
    mocks.bridge.purchase.mockResolvedValue({ status: 'purchased', active: true });
    await p.buyPremium(); expect(p.usePremium.getState().active).toBe(false);
    mocks.bridge.getStatus.mockResolvedValue({ active: true });
    await p.buyPremium(); expect(p.usePremium.getState()).toMatchObject({ active: true, message: 'purchased' });
  });
  it('restores ownership and removes it on refund refresh', async () => {
    const p = await import('./premium');
    mocks.bridge.restore.mockResolvedValue({ active: true }); await p.restorePremium();
    expect(p.usePremium.getState()).toMatchObject({ active: true, message: 'restored' });
    expect(await p.premiumEntitlement()).toBe(false);
    expect(p.usePremium.getState().active).toBe(false);
  });
  it('unknown bridge state is not a free entitlement or permission for an ad', async () => {
    const p = await import('./premium');
    mocks.bridge.getStatus.mockRejectedValue(new Error('bridge failed'));
    expect(await p.premiumEntitlement()).toBeNull();
    expect(p.usePremium.getState()).toMatchObject({ active: false, known: false });
  });
  it('does not start a second transaction during a pending payment sheet', async () => {
    const p = await import('./premium'); await p.loadPremiumProduct();
    let finish!: (value: { status: string }) => void;
    mocks.bridge.purchase.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const first = p.buyPremium(); await p.buyPremium(); await p.restorePremium();
    expect(mocks.bridge.purchase).toHaveBeenCalledOnce();
    expect(mocks.bridge.restore).not.toHaveBeenCalled();
    finish({ status: 'cancelled' }); await first;
    expect(p.usePremium.getState().busy).toBe(false);
  });
  it('purchase failures release the UI lock', async () => {
    const p = await import('./premium'); await p.loadPremiumProduct();
    mocks.bridge.purchase.mockRejectedValue(new Error('verification failed')); await p.buyPremium();
    expect(p.usePremium.getState()).toMatchObject({ busy: false, active: false, message: 'failed' });
  });
  it('tracks productLoading and productError flags accurately on failure', async () => {
    const p = await import('./premium');
    mocks.bridge.getProduct.mockRejectedValue(new Error('Store down'));
    await p.loadPremiumProduct();
    expect(p.usePremium.getState()).toMatchObject({
      product: null,
      productLoading: false,
      productError: true,
    });
    // Purchase cannot be triggered without a valid product
    await p.buyPremium();
    expect(mocks.bridge.purchase).not.toHaveBeenCalled();
  });
});

describe('PremiumOffer review-safe UI contract', () => {
  it('enforces all App Store review requirements on PremiumOffer and Market', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const premiumOfferCode = fs.readFileSync(path.resolve(__dirname, 'screens/PremiumOffer.tsx'), 'utf-8');
    const marketScreenCode = fs.readFileSync(path.resolve(__dirname, 'screens/MarketPlaceholderScreen.tsx'), 'utf-8');

    // 1. product null iken sabit fallback fiyat (örn. '299,00 ₺') görünmemeli
    expect(premiumOfferCode).not.toContain("'299,00 ₺'");
    expect(premiumOfferCode).not.toContain('"299,00 ₺"');
    expect(premiumOfferCode).not.toContain("product?.displayPrice ??");

    // 2. product null iken purchase CTA disabled olmalı
    expect(premiumOfferCode).toContain('!product?.canPurchase');
    expect(premiumOfferCode).toContain('cta--disabled');

    // 3. product geldiyse App Store fiyatı görünmeli
    expect(premiumOfferCode).toContain('product.displayPrice');
    expect(premiumOfferCode).toContain('{fiyat} ile Satın Al');

    // 4. ürün yükleme hatasında tek retry mesajı görünmeli
    expect(premiumOfferCode).toContain('App Store bağlantısı kurulamadı.');
    expect(premiumOfferCode).toContain('Tekrar Dene');

    // 5. restore butonu görünmeye devam etmeli
    expect(premiumOfferCode).toContain('Satın Alımları Geri Yükle');
    expect(premiumOfferCode).toContain('premiumOffer__restore');

    // 6. "Günün Fırsatını Dene" Premium kartında / offers sekmesinde görünmemeli
    const offersBlock = marketScreenCode.match(/category === 'offers'\s*\?\s*\([\s\S]*?\)\s*:\s*\(/)?.[0] ?? '';
    expect(offersBlock).not.toContain('Günün Fırsatını Dene');
    expect(offersBlock).not.toContain('requestDailyCosmetic');
  });
});
