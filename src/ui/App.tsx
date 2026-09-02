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

import { useEffect } from 'react';

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

  // Toast'lar kısa geri bildirimdir; kendiliğinden kapanır.
  useEffect(() => {
    if (toasts.length === 0) return;
    const id = window.setTimeout(() => {
      const first = toasts[0];
      if (first) dismissToast(first.id);
    }, 4000);
    return () => window.clearTimeout(id);
  }, [toasts, dismissToast]);

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
          En fazla İKİ toast görünür.
          Kapatma zamanlayıcısı `toasts` her değiştiğinde sıfırlandığı için
          arka arkaya yapılan işlemlerde balonlar birikiyordu; üst üste binen
          üç balon Stok özetini tamamen gömüyordu. Sınır, biriktirmeyi
          içeriğin üstünü kapatmadan durdurur — sıradakiler yine gösterilir,
          yalnız öndekiler düştükçe.
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
