/**
 * AYARLAR penceresi.
 *
 * KAPSAM:
 *
 *   Profil            → kuyumcunun adı ve portresi (ProfileDialog'a devreder)
 *   Öğretici ipuçları → açık / kapalı, iki yöne de çalışır
 *   Ses               → tek anahtar + düzey kaydırıcısı · GERÇEKTEN ÇALIŞIR
 *   Titreşim          → GERÇEKTEN ÇALIŞIR (destekleyen cihazda; iOS'ta API yok)
 *   Dil               → tercih SAKLANIR, çeviri katmanı sonra bağlanacak
 *   Yeni oyun         → kaydı siler (onaylı)
 *
 * SES / TİTREŞİM / DİL BİLEREK "HAZIRLANIYOR" DİYE İŞARETLİ. Bu dosya
 * eskiden bu anahtarların KOYULMADIĞINI yazıyordu; gerekçesi, çalışmayan bir
 * anahtarın oyuncuya kapattığını sandığı şeyi kapattırmasıydı. Anahtarlar
 * artık isteniyor ama altyapı hâlâ yok (`public/assets/audio` klasörü bile
 * yok, arayüz tek dilli), dolayısıyla o gerekçe çöpe atılmadı — KARŞILANDI:
 * tercih gerçekten saklanır ve kayıttan geri gelir, ama her satır henüz
 * etkisinin olmadığını AÇIKÇA söyler. Sessizce hiçbir şey yapmayan bir
 * anahtar ile "bunu şimdilik not aldım" diyen bir anahtar aynı şey değildir.
 *
 * Davranış bağlandığında yapılacak tek şey, o "hazırlanıyor" ibarelerini
 * kaldırmaktır; tercih zaten yerinde olacak.
 *
 * ZAMAN DURUR: pencere açıkken `tick` erken döner (gameStore · §4). Oyuncu
 * ayara bakarken saatin işlemesi ve kuyruğun ilerlemesi cezaya dönerdi.
 *
 * ERİŞİLEBİLİRLİK: role="dialog" + aria-modal, başlıkla ilişkili; Escape ve
 * dış tıklama kapatır; açılışta odak ilk denetime gider ve Tab pencerede
 * döner (odak tuzağı) — aksi halde klavye kullanıcısı arkadaki oyuna düşer.
 */

import { useEffect, useRef, useState } from 'react';

import { LANGUAGES, VOLUME_MAX, VOLUME_MIN, VOLUME_STEP } from '@domain/preferences';
import { hapticsSupported } from '@ui/haptics';
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
  const preferences = useGame((s) => s.preferences);
  const setPreference = useGame((s) => s.setPreference);

  const [confirmReset, setConfirmReset] = useState(false);
  // Cihaz desteği render sırasında sabittir; her çizimde sormaya gerek yok.
  const [titresimVar] = useState(hapticsSupported);
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
      /*
        Yalnız `button` aranıyordu; ses düzeyi kaydırıcısı bir `input` ve
        listeye girmiyordu. Şu an pencerenin ortasında durduğu için tuzak
        yine de tutuyordu — ama ilk ya da son denetim hâline geldiği gün
        sessizce kırılırdı. Odaklanabilir her denetim sayılır.
      */
      const stops = Array.from(
        box.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'),
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
          HENÜZ BAĞLI OLMAYAN TERCİHLER.

          Ortak bir başlık altındalar ki oyuncu üçünü tek seferde doğru
          okusun; her satıra ayrı ayrı "çalışmıyor" yazmak hem gürültü olur
          hem de gözden kaçardı.
        */}
        <button
          type="button"
          className="settingsRow"
          aria-pressed={preferences.soundEnabled}
          onClick={() => setPreference('soundEnabled', !preferences.soundEnabled)}
        >
          <span className="settingsRow__copy">
            <strong>Ses</strong>
            <small>{preferences.soundEnabled ? 'Açık' : 'Kapalı'} · işlem ve gün sesleri</small>
          </span>
          <span
            className={`settingsRow__switch ${preferences.soundEnabled ? 'settingsRow__switch--on' : ''}`}
          >
            <span className="settingsRow__knob" />
          </span>
        </button>

        {/*
          TİTREŞİM ARTIK BAĞLI — ama her cihazda çalışmaz.

          `navigator.vibrate` Android/Chrome'da var, **iOS Safari'de YOK** ve
          Apple'ın web'e açtığı bir haptik API'si de yok. Bu bir hata değil,
          platform sınırı. Alt metin bunu cihaza göre SÖYLÜYOR: desteklemeyen
          telefonda "bu cihaz desteklemiyor" yazıyor. Aksi hâlde oyuncu açık
          bir anahtarın neden hiçbir şey yapmadığını anlamazdı — tam da bu
          pencerede kaçındığımız şey.
        */}
        <button
          type="button"
          className="settingsRow"
          aria-pressed={preferences.vibrationEnabled}
          onClick={() => setPreference('vibrationEnabled', !preferences.vibrationEnabled)}
        >
          <span className="settingsRow__copy">
            <strong>Titreşim</strong>
            <small>
              {!titresimVar
                ? 'Bu cihaz titreşimi desteklemiyor'
                : `${preferences.vibrationEnabled ? 'Açık' : 'Kapalı'} · işlem ve gün olayları`}
            </small>
          </span>
          <span
            className={`settingsRow__switch ${preferences.vibrationEnabled ? 'settingsRow__switch--on' : ''}`}
          >
            <span className="settingsRow__knob" />
          </span>
        </button>

        {/*
          SES DÜZEYİ — kaydırıcı burada doğru denetim.

          C2'de hızlı stok penceresindeki kaydırıcıları KALDIRMIŞTIK; burada
          eklemek onunla çelişmiyor. Oradaki değer kesin bir sayıydı (kaç
          çeyrek), yazmak doğruydu. Ses düzeyi sürekli ve yaklaşık bir
          tercihtir; kimse "%65 istiyorum" diye düşünmez, kulağıyla ayarlar.

          SES KAPALIYKEN DEVRE DIŞI: kapalı sesin düzeyini ayarlatmak, tam da
          bu pencerede kaçındığımız şey olurdu — hiçbir şey yapmayan bir
          denetim. Alt metin nedenini de söyler.
        */}
        <div className="settingsRow settingsRow--static settingsRow--stack">
          <span className="settingsRow__copy">
            <strong>Ses düzeyi</strong>
            <small>
              {preferences.soundEnabled
                ? `%${preferences.soundVolume}`
                : 'Ses kapalıyken ayarlanamaz'}
            </small>
          </span>
          <input
            className="settingsSlider"
            type="range"
            min={VOLUME_MIN}
            max={VOLUME_MAX}
            step={VOLUME_STEP}
            value={preferences.soundVolume}
            disabled={!preferences.soundEnabled}
            aria-label="Ses düzeyi"
            onChange={(e) => setPreference('soundVolume', Number(e.target.value))}
          />
        </div>

        {/*
          Dil bir AÇIK/KAPALI değil, bir seçim — o yüzden anahtar değil
          segment. `radiogroup` kullanılıyor ki ekran okuyucu "iki seçenekten
          biri" desin; anahtar taklidi yapmak yanlış olurdu.
        */}
        <p className="settingsNote" id="settings-pending">
          Dil tercihi kaydedilir, ama çeviri katmanı henüz bağlanmadı.
        </p>

        <div className="settingsRow settingsRow--static">
          <span className="settingsRow__copy">
            <strong>Dil</strong>
            <small>Şimdilik yalnız Türkçe içerik var</small>
          </span>
          <span className="settingsSegment" role="radiogroup" aria-label="Dil">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                type="button"
                role="radio"
                aria-checked={preferences.language === lang.id}
                aria-describedby="settings-pending"
                className={`settingsSegment__option ${
                  preferences.language === lang.id ? 'settingsSegment__option--on' : ''
                }`}
                onClick={() => setPreference('language', lang.id)}
              >
                {lang.label}
              </button>
            ))}
          </span>
        </div>

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
