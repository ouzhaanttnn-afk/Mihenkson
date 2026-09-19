import { beforeEach, describe, expect, it, vi } from 'vitest';
const native = vi.hoisted(() => ({ notification: vi.fn(), impact: vi.fn(), selectionStart: vi.fn(), selectionChanged: vi.fn(), selectionEnd: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/haptics', () => ({ Haptics: native, ImpactStyle: { Light: 'LIGHT' }, NotificationType: { Success: 'SUCCESS', Warning: 'WARNING' } }));
import { playHaptic, selectionHaptic, resetHapticsForTests } from './haptics';
beforeEach(() => { resetHapticsForTests(); Object.values(native).forEach(fn => fn.mockReset().mockResolvedValue(undefined)); });
describe('native iOS haptic', () => {
 it('kapalı ayar hiçbir native çağrı yapmaz', () => { playHaptic('deal', false); selectionHaptic(false); Object.values(native).forEach(fn => expect(fn).not.toHaveBeenCalled()); });
 it('anlaşma success notification gönderir', () => { playHaptic('deal', true); expect(native.notification).toHaveBeenCalledWith({type:'SUCCESS'}); });
 it('ret warning gönderir', () => { playHaptic('deny', true); expect(native.notification).toHaveBeenCalledWith({type:'WARNING'}); });
 it('selection bir kez ve hafif gönderilir', async () => { selectionHaptic(true); selectionHaptic(true); await vi.waitFor(() => expect(native.selectionEnd).toHaveBeenCalledOnce()); expect(native.selectionChanged).toHaveBeenCalledOnce(); });
});
