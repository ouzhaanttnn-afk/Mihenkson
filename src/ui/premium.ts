import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { create } from 'zustand';

export const PREMIUM_PRODUCT_ID = 'com.mihenkaynak.app.premium.lifetime';
interface Entitlement { active: boolean }
interface Product { id: string; displayPrice: string; canPurchase: boolean }
interface PremiumBridge {
  getStatus(): Promise<Entitlement>;
  getProduct(): Promise<Product>;
  purchase(): Promise<{ status: 'purchased' | 'pending' | 'cancelled'; active?: boolean }>;
  restore(): Promise<Entitlement>;
  addListener(event: 'entitlementChanged', callback: (value: Entitlement) => void): Promise<PluginListenerHandle>;
}
const native = registerPlugin<PremiumBridge>('MihenkPremium');
export const premiumSupported = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
type Message = 'idle' | 'loading' | 'purchased' | 'pending' | 'cancelled' | 'restored' | 'notFound' | 'failed';
// Deliberately NOT persisted: a game save or localStorage cannot confer ownership.
export const usePremium = create<{
  active: boolean; known: boolean; product: Product | null; busy: boolean; message: Message;
}>(() => ({ active: false, known: false, product: null, busy: false, message: 'idle' }));

function accept(value: Entitlement) {
  if (typeof value.active !== 'boolean') throw new Error('Invalid entitlement');
  usePremium.setState((state) => ({ active: value.active, known: true,
    message: !value.active && (state.message === 'purchased' || state.message === 'restored') ? 'idle' : state.message,
  }));
  return value.active;
}

function bounded<T>(operation: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Store timeout')), 8000);
    operation.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

/** null means unknown: don't serve a paying player an ad on bridge failure. */
export async function premiumEntitlement(): Promise<boolean | null> {
  if (!premiumSupported()) return false;
  try { return accept(await bounded(native.getStatus())); }
  catch { usePremium.setState({ known: false }); return null; }
}

export async function loadPremiumProduct(): Promise<void> {
  if (!premiumSupported()) return;
  try {
    const product = await bounded(native.getProduct());
    if (product.id !== PREMIUM_PRODUCT_ID || !product.displayPrice) throw new Error('Invalid product');
    usePremium.setState({ product });
  } catch { usePremium.setState({ product: null }); }
}

let initialized = false;
let visibilityRegistered = false;
export function initializePremium(): void {
  if (!premiumSupported()) return;
  void premiumEntitlement();
  if (initialized) return;
  initialized = true;
  void native.addListener('entitlementChanged', (value) => {
    if (typeof value.active !== 'boolean') { usePremium.setState({ known: false }); return; }
    accept(value);
    if (value.active) usePremium.setState({ message: 'purchased' });
  }).catch(() => { initialized = false; });
  if (!visibilityRegistered) {
    visibilityRegistered = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void premiumEntitlement();
    });
  }
}

export async function buyPremium(): Promise<void> {
  const state = usePremium.getState();
  if (!premiumSupported() || state.busy || state.active || !state.product?.canPurchase) return;
  usePremium.setState({ busy: true, message: 'loading' });
  try {
    const result = await native.purchase();
    if (result.status === 'purchased') {
      const active = await premiumEntitlement();
      usePremium.setState({ message: active === true ? 'purchased' : 'failed' });
    } else usePremium.setState({ message: result.status });
  } catch { usePremium.setState({ message: 'failed' }); }
  finally { usePremium.setState({ busy: false }); }
}

export async function restorePremium(): Promise<void> {
  if (!premiumSupported() || usePremium.getState().busy) return;
  usePremium.setState({ busy: true, message: 'loading' });
  try {
    const active = accept(await native.restore());
    usePremium.setState({ message: active ? 'restored' : 'notFound' });
  } catch { usePremium.setState({ message: 'failed' }); }
  finally { usePremium.setState({ busy: false }); }
}
