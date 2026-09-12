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
});
