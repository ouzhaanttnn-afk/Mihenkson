/**
 * AYARLAR penceresi.
 *
 * KAPSAM — yalnız GERÇEKTEN ayarlanabilen şeyler:
 *
 *   Profil            → kuyumcunun adı ve portresi (ProfileDialog'a devreder)
 *   Öğretici ipuçları → açık / kapalı, iki yöne de çalışır
 *   Yeni oyun         → kaydı siler (onaylı)
 *
 * NE YOK VE NEDEN: ses, müzik, titreşim ve dil anahtarları KOYULMADI. Bu
 * kod tabanında ses altyapısı hiç yok (`public/assets/audio` klasörü bile
 * yok) ve arayüz tek dilli. Çalışmayan bir anahtar göstermek, oyuncuya
 * kapattığını sandığı bir şeyi kapattırmak olurdu — ayarlar ekranının
 * güvenilirliği tam da burada kırılır.
 *
 * ZAMAN DURUR: pencere açıkken `tick` erken döner (gameStore · §4). Oyuncu
 * ayara bakarken saatin işlemesi ve kuyruğun ilerlemesi cezaya dönerdi.
 *
 * ERİŞİLEBİLİRLİK: role="dialog" + aria-modal, başlıkla ilişkili; Escape ve
 * dış tıklama kapatır; açılışta odak ilk denetime gider ve Tab pencerede
 * döner (odak tuzağı) — aksi halde klavye kullanıcısı arkadaki oyuna düşer.
 */

import { useEffect, useRef, useState } from 'react';

import { useGame } from '@state/gameStore';

export function SettingsDialog() {
  const open = useGame((s) => s.settingsOpen);
  const close = useGame((s) => s.closeSettings);
  const openProfile = useGame((s) => s.openProfile);
  const jewelerName = useGame((s) => s.profile.jewelerName);
  const seenLessons = useGame((s) => s.seenLessons);
  const skipOnboarding = useGame((s) => s.skipOnboarding);
  const restoreOnboarding = useGame((s) => s.restoreOnboarding);
  const resetGame = useGame((s) => s.resetGame);

  const [confirmReset, setConfirmReset] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);

  // Pencere her açılışta temiz gelir: bir önceki oturumun yarım kalmış
  // "emin misin?" hâli, ikinci açılışta yanlışlıkla onaylanabilirdi.
  useEffect(() => {
    if (open) setConfirmReset(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    firstRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      const box = boxRef.current;
      if (!box) return;
      const stops = Array.from(
        box.querySelectorAll<HTMLElement>('button:not([disabled])'),
      );
      if (stops.length === 0) return;
      const first = stops[0]!;
      const last = stops[stops.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  const coachOn = seenLessons.length === 0;

  return (
    <div className="settingsScrim" onClick={close} role="presentation">
      <div
        ref={boxRef}
        className="settingsBox"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="settingsBox__title" id="settings-title">
          Ayarlar
        </h2>

        <button
          ref={firstRef}
          type="button"
          className="settingsRow"
          onClick={() => {
            close();
            openProfile();
          }}
        >
          <span className="settingsRow__copy">
            <strong>Profil</strong>
            <small>{jewelerName} · ad ve portre</small>
          </span>
          <span className="settingsRow__action">Düzenle</span>
        </button>

        <button
          type="button"
          className="settingsRow"
          aria-pressed={coachOn}
          onClick={() => (coachOn ? skipOnboarding() : restoreOnboarding())}
        >
          <span className="settingsRow__copy">
            <strong>Öğretici ipuçları</strong>
            <small>{coachOn ? 'Açık — yeni durumlarda ipucu çıkar' : 'Kapalı'}</small>
          </span>
          <span className={`settingsRow__switch ${coachOn ? 'settingsRow__switch--on' : ''}`}>
            <span className="settingsRow__knob" />
          </span>
        </button>

        {/*
          Yıkıcı eylem: tek dokunuşla kayıt silinmez. Onay metni ne olacağını
          da söyler — kayıt silinir ama açık oyun ekranda kalır, yeni oyun
          bir sonraki açılışta başlar (gameStore · resetGame).
        */}
        {confirmReset ? (
          <div className="settingsDanger">
            <p className="settingsDanger__text">
              Kayıt silinecek. Ekrandaki oyun kapanana kadar durur; yeni oyun bir sonraki
              açılışta başlar. Geri alınamaz.
            </p>
            <div className="settingsDanger__actions">
              <button
                type="button"
                className="settingsDanger__cancel"
                onClick={() => setConfirmReset(false)}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="settingsDanger__confirm"
                onClick={() => {
                  resetGame();
                  setConfirmReset(false);
                  close();
                }}
              >
                Kaydı sil
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="settingsRow settingsRow--danger"
            onClick={() => setConfirmReset(true)}
          >
            <span className="settingsRow__copy">
              <strong>Yeni oyun</strong>
              <small>Kaydı siler · geri alınamaz</small>
            </span>
            <span className="settingsRow__action">Sil</span>
          </button>
        )}

        <button type="button" className="settingsBox__close" onClick={close}>
          Kapat
        </button>
      </div>
    </div>
  );
}
