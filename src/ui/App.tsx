/**
 * MIHENKAYNAK — Uygulama kökü
 *
 * GDD 23.9.2 global kabuğu burada birleşir. Dört kök ekran (Dükkan / Stok /
 * Atölye / Market / İşletme) aynı cihaz çerçevesini paylaşır; alt navigasyon aktif
 * işlemde de yerini korur (GDD 23.9.2).
 *
 * GDD 23.22: Aktif Dükkan dikey scroll kullanmaz → cihaz gövdesi
 * `overflow: hidden`; ikincil ekranlar kendi scroll'unu yönetir.
 */

import { useEffect, useRef } from 'react';

import { useGame } from '@state/gameStore';
import { BottomNav } from '@ui/shell/BottomNav';
import { BusinessScreen } from '@ui/screens/BusinessScreen';
import { ShopScreen } from '@ui/screens/ShopScreen';
import { StockScreen } from '@ui/screens/StockScreen';
import { WorkshopScreen } from '@ui/screens/WorkshopScreen';
import { MarketPlaceholderScreen } from '@ui/screens/MarketPlaceholderScreen';
import { ProfileDialog } from '@ui/shell/ProfileDialog';
import { DayCloseDialog } from '@ui/shell/DayCloseDialog';
import { overdueJobs, readyJobs } from '@domain/service';

import '@ui/tokens.css';
import '@ui/shell/AppShell.css';
import '@ui/workbench/Workbench.css';
import '@ui/screens/Screens.css';

/** Bir bildirim balonunun ekranda kalma süresi. */
const TOAST_LIFETIME_MS = 4000;

export function App() {
  const tab = useGame((s) => s.tab);
  const setTab = useGame((s) => s.setTab);
  const toasts = useGame((s) => s.toasts);
  const dismissToast = useGame((s) => s.dismissToast);
  const profile = useGame((s) => s.profile);
  const profileOpen = useGame((s) => s.profileOpen);
  const closeProfile = useGame((s) => s.closeProfile);
  const updateProfile = useGame((s) => s.updateProfile);
  const workshopAttention = useGame((s) => {
    const ids = new Set([
      ...readyJobs(s.jobs).map((job) => job.jobId),
      ...overdueJobs(s.jobs, s.market.day).map((job) => job.jobId),
    ]);
    return ids.size;
  });

  // v5 resumes active negotiations and deterministic queue state, not just a day checkpoint.
  useEffect(() => {
    let scheduled = false;
    let disposed = false;
    const flush = () => { if (!useGame.getState().saveGame()) useGame.getState().notify('Kayıt yazılamadı; depolama alanını kontrol edin.', 'negative'); };
    const unsubscribe = useGame.subscribe((next, prev) => {
      if (next.ledger === prev.ledger && next.activeDeal === prev.activeDeal && next.activeCustomer === prev.activeCustomer &&
          next.queue === prev.queue && next.missedGuestCountToday === prev.missedGuestCountToday) return;
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => { scheduled = false; if (!disposed) flush(); });
    });
    const onHide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHide);
    return () => { disposed = true; unsubscribe(); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', onHide); };
  }, []);

  /*
    TOAST ÖMRÜ — HER BALON KENDİ SÜRESİNİ SAYAR.

    Eskiden tek bir zamanlayıcı vardı ve `toasts` her değiştiğinde effect yeniden
    kurulduğu için o zamanlayıcı SIFIRLANIYORDU. Sonuç: balonlar 4 saniyeden sık
    geldiğinde hiçbiri kapanmıyordu. Tarayıcıda ölçüldü — 7. günde ekranda hâlâ
    "Gün 5 kapandı" duruyor ve balon dükkân kartının başlığını örtüyordu.

    Zamanlayıcılar artık balon kimliğine göre bir ref'te tutuluyor: yeni bir balon
    gelmesi öncekinin ömrünü uzatmaz, her balon kurulduğu andan TOAST_LIFETIME_MS
    sonra düşer.
  */
  const toastTimers = useRef(new Map<string, number>());

  useEffect(() => {
    const live = new Set(toasts.map((t) => t.id));

    // Ekrandan düşmüş balonların zamanlayıcılarını bırak (sızıntı olmasın).
    for (const [id, handle] of toastTimers.current) {
      if (live.has(id)) continue;
      window.clearTimeout(handle);
      toastTimers.current.delete(id);
    }

    // Yeni gelenlere kendi zamanlayıcısını kur; var olanlara DOKUNMA.
    for (const toast of toasts) {
      if (toastTimers.current.has(toast.id)) continue;
      const handle = window.setTimeout(() => {
        toastTimers.current.delete(toast.id);
        dismissToast(toast.id);
      }, TOAST_LIFETIME_MS);
      toastTimers.current.set(toast.id, handle);
    }
  }, [toasts, dismissToast]);

  // Bileşen sökülürken bekleyen zamanlayıcı kalmasın.
  useEffect(() => {
    const timers = toastTimers.current;
    return () => {
      for (const handle of timers.values()) window.clearTimeout(handle);
      timers.clear();
    };
  }, []);

  return (
    <div className="deviceFrame">
      <div className="device">
        <div className={`screen ${tab === 'shop' ? 'screen--noScroll' : ''}`}>
          {tab === 'shop' && <ShopScreen />}
          {tab === 'stock' && <StockScreen />}
          {tab === 'workshop' && <WorkshopScreen />}
          {tab === 'market' && <MarketPlaceholderScreen />}
          {tab === 'business' && <BusinessScreen />}
        </div>

        <BottomNav active={tab} onSelect={setTab} workshopBadge={workshopAttention} />
        <DayCloseDialog />

        {/*
          Profil penceresi CİHAZ SEVİYESİNDE: ekranın değil, çerçevenin
          çocuğu. Ekranın içine konsaydı Dükkan'ın `overflow: hidden`
          gövdesine hapsolur ve alt navigasyonun altında kalırdı.
        */}
        {profileOpen && (
          <ProfileDialog
            profile={profile}
            onCancel={closeProfile}
            onSave={updateProfile}
          />
        )}

        {/*
          En fazla İKİ balon çizilir. Ömür sorunu yukarıda kökünden çözüldü
          (her balon kendi süresini sayar); bu sınır ayrı bir işe yarıyor:
          aynı anda üç balon üst üste gelirse yığın Stok özetini gömüyordu.
          Sıradakiler kaybolmaz, öndekiler düştükçe görünürler.
        */}
        {toasts.length > 0 && (
          <div className="toastLayer">
            {toasts.slice(0, 2).map((toast) => (
              <div key={toast.id} className={`toast toast--${toast.tone}`}>
                {toast.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
