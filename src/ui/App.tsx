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

import { t } from '@i18n/index';
import { useEffect, useRef } from 'react';

import { useGame } from '@state/gameStore';
import { BottomNav } from '@ui/shell/BottomNav';
import { BusinessScreen } from '@ui/screens/BusinessScreen';
import { ShopScreen } from '@ui/screens/ShopScreen';
import { StockScreen } from '@ui/screens/StockScreen';
import { WorkshopScreen } from '@ui/screens/WorkshopScreen';
import { MarketPlaceholderScreen } from '@ui/screens/MarketPlaceholderScreen';
import { ProfileDialog } from '@ui/shell/ProfileDialog';
import { SettingsDialog } from '@ui/shell/SettingsDialog';
import { DayCloseDialog } from '@ui/shell/DayCloseDialog';
import { overdueJobs, readyJobs } from '@domain/service';
import { playSound, preloadAudio, unlockAudio, type SoundId } from '@ui/audio';
import { applyMusic, resumeMusic } from '@ui/music';
import { playHaptic, stopHaptics } from '@ui/haptics';

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
  const profileSetupDone = useGame((s) => s.profileSetupDone);
  const completeProfileSetup = useGame((s) => s.completeProfileSetup);
  const closeProfile = useGame((s) => s.closeProfile);
  // Yalnız `key` için okunur — bkz. aşağıdaki gerekçe.
  const language = useGame((s) => s.preferences.language);
  const currency = useGame((s) => s.preferences.currency);
  const updateProfile = useGame((s) => s.updateProfile);
  const workshopAttention = useGame((s) => {
    const ids = new Set([
      ...readyJobs(s.jobs).map((job) => job.jobId),
      ...overdueJobs(s.jobs, s.market.day).map((job) => job.jobId),
    ]);
    return ids.size;
  });
  const shopQueueCount = useGame((s) => s.queue.length);

  /*
    SES — SUNUM KATMANINDA BAĞLANIR.

    Mağaza yalnız "şu oldu" der (`soundCue`); sesi burası çalar. Böylece alan
    ve mağaza katmanları tarayıcı ses API'sine hiç dokunmaz ve node
    testlerinde hiçbir şey değişmez.

    KİLİT AÇMA: tarayıcı, kullanıcı sayfaya dokunmadan ses çalmaya izin vermez.
    İlk dokunuş/tuşta açıp dosyaları önden çözüyoruz; dinleyici bir kez
    çalışıp kendini kaldırır.
  */
  /*
    FON MÜZİĞİ tercihe abone. Efektlerden farkı sürekli olması: bir olayla
    tetiklenmiyor, açıkken çalıyor. Bu yüzden `soundCue` aboneliğinde değil,
    doğrudan tercih değişiminde uygulanıyor — ilk çizimde de çalışır, yani
    oyuncu oyuna girer girmez (ilk dokunuşundan sonra) müzik başlar.
  */
  const musicEnabled = useGame((s) => s.preferences.musicEnabled);
  const musicVolumePref = useGame((s) => s.preferences.musicVolume);
  useEffect(() => {
    applyMusic(musicEnabled, musicVolumePref);
  }, [musicEnabled, musicVolumePref]);

  /* Titreşim ayardan kapatılınca elde süren darbe kalmasın. */
  const vibrationEnabled = useGame((s) => s.preferences.vibrationEnabled);
  useEffect(() => {
    if (!vibrationEnabled) stopHaptics();
  }, [vibrationEnabled]);

  /*
    SES KİLİDİ TEK SEFERLİK DEĞİL.

    Dinleyiciler `once: true` idi: ilk dokunuşta bağlam açılıyor, sonra
    dinleyici kendini kaldırıyordu. Bu, iOS'ta sesi oturum ortasında kalıcı
    olarak öldüren şeydi — uygulama arka plana atıldığında, telefon çaldığında
    veya sekme değiştiğinde `AudioContext` askıya alınıyor, kendiliğinden geri
    gelmiyor ve onu uyandıracak dinleyici de artık yok. Oyuncunun gördüğü:
    "ses başta vardı, sonra kesildi".

    Artık her dokunuşta ve ekran geri geldiğinde uyandırılıyor. Maliyeti yok:
    `unlockAudio` zaten çalışan bir bağlamda hiçbir şey yapmıyor, `preloadAudio`
    da çözülmüş tamponu yeniden indirmiyor.
  */
  useEffect(() => {
    const ac = () => { unlockAudio(); preloadAudio(); resumeMusic(); };
    const opts = { passive: true } as const;
    const gorunurluk = () => {
      if (document.visibilityState !== 'visible') return;
      unlockAudio();
      resumeMusic();
    };
    window.addEventListener('pointerdown', ac, opts);
    window.addEventListener('keydown', ac, opts);
    document.addEventListener('visibilitychange', gorunurluk);
    return () => {
      window.removeEventListener('pointerdown', ac);
      window.removeEventListener('keydown', ac);
      document.removeEventListener('visibilitychange', gorunurluk);
    };
  }, []);

  useEffect(() => {
    /*
      Sayaç (`n`) üstünden dinleniyor, `id` üstünden değil: aynı ses arka
      arkaya iki kez gerekebilir ve yalnız `id` izlenseydi ikincisi kaçardı.
    */
    let sonN = useGame.getState().soundCue?.n ?? 0;
    let sonSeviye = useGame.getState().store.level;

    return useGame.subscribe((state) => {
      const { soundEnabled, soundVolume, vibrationEnabled } = state.preferences;
      const cue = state.soundCue;
      if (cue && cue.n !== sonN) {
        sonN = cue.n;
        playSound(cue.id as SoundId, soundEnabled, soundVolume);
        // Titreşim SESTEN BAĞIMSIZ: sesi kapatıp titreşimi açık tutmak
        // (toplu taşımada oynayan oyuncu) geçerli ve yaygın bir tercihtir.
        playHaptic(cue.id as SoundId, vibrationEnabled);
      }
      /*
        Seviye atlama alan katmanında (`applyTransaction`) oluyor ve orası
        SAF kalmalı — oradan işaret veremeyiz. Arayüzde seviyenin artışını
        izlemek aynı sonucu katman ayrımını bozmadan verir.
      */
      if (state.store.level > sonSeviye) {
        sonSeviye = state.store.level;
        playSound('levelup', soundEnabled, soundVolume);
        playHaptic('levelup', vibrationEnabled);
      } else if (state.store.level < sonSeviye) {
        sonSeviye = state.store.level;   // yeni oyun / kayıt yükleme
      }
    });
  }, []);

  // v5 resumes active negotiations and deterministic queue state, not just a day checkpoint.
  useEffect(() => {
    let scheduled = false;
    let disposed = false;
    const flush = () => { if (!useGame.getState().saveGame()) useGame.getState().notify(t('Kayıt yazılamadı; depolama alanını kontrol edin.'), 'negative'); };
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
      {/*
        DİL VE PARA BİRİMİ DEĞİŞİNCE TÜM AĞAÇ YENİDEN KURULUR.

        `t()` etkin dili modül düzeyinde okuyor; React bunu bir bağımlılık
        olarak GÖREMEZ. Dolayısıyla dil değiştiğinde, o dili okuyan yüzlerce
        bileşenden yalnız tercihe abone olanlar yeniden çizilirdi — ekranın
        yarısı yeni dilde, yarısı eskisinde kalırdı.

        Her bileşene ayrı bir `useT()` aboneliği eklemek de mümkündü ama
        yüzlerce dokunuş demekti ve biri unutulunca hata sessiz olurdu.
        `key` ile yeniden kurmak tek satırda kesin sonuç verir. Bedeli, o an
        açık olan yerel arayüz durumunun (açık çekmece gibi) sıfırlanması;
        oyunun kendi durumu mağazada olduğu için para, stok ve pazarlık
        etkilenmez. Dil değiştirmek nadir bir eylem, sıfırlama kabul edilir.
      */}
      <div className="device" key={`${language}-${currency}`}>
        <div className={`screen ${tab === 'shop' ? 'screen--noScroll' : ''}`}>
          {tab === 'shop' && <ShopScreen />}
          {tab === 'stock' && <StockScreen />}
          {tab === 'workshop' && <WorkshopScreen />}
          {tab === 'market' && <MarketPlaceholderScreen />}
          {tab === 'business' && <BusinessScreen />}
        </div>

        <BottomNav
          active={tab}
          onSelect={setTab}
          shopBadge={shopQueueCount}
          workshopBadge={workshopAttention}
        />
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
          İLK AÇILIŞ — ad ve portre.

          Oyunun ilk ekranı budur; oyuncu kendini tanıtmadan tezgâhın
          arkasına geçmez. Yalnız HİÇ KAYIT YOKKEN çıkar: kaydı olan oyuncuda
          `profileSetupDone` true gelir (eski kayıtlarda alan eksikse de
          `true`ya düşer — bkz. save.ts), yani zaten oynamış birine hoş geldin
          ekranı gösterilmez.

          Profil penceresiyle aynı anda açılamaz: bu ekran kapanmadan oyuna
          girilmiyor, dolayısıyla profil penceresini açacak düğmeye de
          ulaşılamıyor.
        */}
        {!profileSetupDone && (
          <ProfileDialog
            profile={profile}
            mode="welcome"
            onCancel={() => undefined}
            onSave={completeProfileSetup}
          />
        )}

        {/*
          Ayarlar da CİHAZ SEVİYESİNDE — profil penceresiyle aynı sebep:
          ekranın içine konsaydı Dükkan'ın `overflow: hidden` gövdesine
          hapsolur ve alt navigasyonun altında kalırdı.
        */}
        <SettingsDialog />

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
