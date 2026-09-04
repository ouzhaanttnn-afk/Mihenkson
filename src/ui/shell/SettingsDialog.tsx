/**
 * AYARLAR penceresi.
 *
 * KAPSAM:
 *
 *   Profil            → kuyumcunun adı ve portresi (ProfileDialog'a devreder)
 *   Öğretici ipuçları → açık / kapalı, iki yöne de çalışır
 *   Ses               → tek anahtar + düzey kaydırıcısı · GERÇEKTEN ÇALIŞIR
 *   Titreşim          → GERÇEKTEN ÇALIŞIR (destekleyen cihazda; iOS'ta API yok)
 *   Dil               → GERÇEKTEN ÇALIŞIR (tr / en)
 *   Para birimi       → GERÇEKTEN ÇALIŞIR (₺ / $) — yalnız GÖSTERİM
 *   Kayıt             → bugünkü gerçek davranış: cihazda otomatik yerel kayıt
 *   Yasal / destek    → yayımlanmış HTTPS gizlilik ve destek sayfaları
 *
 * "YENİ OYUN / KAYDI SİL" bu pencerede sunulmaz. `resetGame` mağaza eylemi
 * testler ve ileride açık bir sıfırlama akışı için durur. Henüz var olmayan
 * bulut hesap özelliği ise App Review'da yarım özellik gibi görünmesin diye
 * burada vaat edilmez.
 *
 * "MÜZİK" ANAHTARI VE "MÜZİK DÜZEYİ" DE KALDIRILDI. Kullanıcı geri bildirimi:
 * "müziği beğenmedim" → önce varsayılan kapatıldı, sonra kullanıcı özelliğin
 * kendisinin kaldırılmasını istedi ("müziği kaldıracaktın"). Ses altyapısı
 * (`src/ui/music.ts`, `public/assets/audio/music/`, `tools/muzik-uret.py`)
 * ve `PlayerPreferences`teki `musicEnabled`/`musicVolume` alanları tamamen
 * silindi — geri getirmek istenirse `git log`'da bu değişiklikten önceki
 * sürüm referans alınabilir. Eski (bu değişiklikten önceki) bir kayıtta bu
 * alanlar olabilir; `normalizePreferences` artık onları OKUMUYOR bile —
 * fazladan JSON alanı sessizce göz ardı edilir, kayıt bozulmaz.
 *
 * ARTIK HİÇBİR SATIRDA "HAZIRLANIYOR" YOK. Bu dosya uzun süre o ibareyi
 * taşıdı, çünkü anahtarlar konulmuş ama davranışları bağlanmamıştı ve
 * çalışmayan bir anahtarı çalışıyormuş gibi göstermek, ayarlar ekranının
 * güvenilirliğini tam da orada kırardı. Dördü de bağlandı; ibare kalktı.
 *
 * PARA BİRİMİ SATIRI OYUNCUYA NE OLDUĞUNU SÖYLER: dolar seçmek oyunun
 * parasını çevirmez, yazısını çevirir. Sabit kur ekranda yazılıdır ki
 * oyuncu "kasam mı eridi?" diye düşünmesin.
 *
 * ZAMAN DURUR: pencere açıkken `tick` erken döner (gameStore · §4). Oyuncu
 * ayara bakarken saatin işlemesi ve kuyruğun ilerlemesi cezaya dönerdi.
 *
 * ERİŞİLEBİLİRLİK: role="dialog" + aria-modal, başlıkla ilişkili; Escape ve
 * dış tıklama kapatır; açılışta odak ilk denetime gider ve Tab pencerede
 * döner (odak tuzağı) — aksi halde klavye kullanıcısı arkadaki oyuna düşer.
 */

import { useState } from 'react';

import {
  CURRENCIES,
  LANGUAGES,
  VOLUME_MAX,
  VOLUME_MIN,
  VOLUME_STEP,
} from '@domain/preferences';
import { USD_RATE } from '@i18n/currency';
import { pct } from '@ui/format';
import { t } from '@i18n/index';
import { hapticsSupported, playHaptic } from '@ui/haptics';
import { audioStatus, playSound, unlockAudio } from '@ui/audio';
import { adPrivacyOptionsSupported, showAdPrivacyOptions } from '@ui/ads';
import { soundTestNoteText, type SoundTestNote } from '@ui/transient-copy';
import { useModalSurface } from '@ui/useModalSurface';
import { useGame } from '@state/gameStore';

const PRIVACY_URL = {
  tr: 'https://alpersonmihenk-chi.vercel.app/privacy.html',
  en: 'https://alpersonmihenk-chi.vercel.app/privacy-en.html',
} as const;
const SUPPORT_URL = {
  tr: 'https://alpersonmihenk-chi.vercel.app/support.html',
  en: 'https://alpersonmihenk-chi.vercel.app/support-en.html',
} as const;

export function SettingsDialog() {
  const open = useGame((s) => s.settingsOpen);
  const close = useGame((s) => s.closeSettings);
  const openProfile = useGame((s) => s.openProfile);
  const jewelerName = useGame((s) => s.profile.jewelerName);
  const seenLessons = useGame((s) => s.seenLessons);
  const skipOnboarding = useGame((s) => s.skipOnboarding);
  const restoreOnboarding = useGame((s) => s.restoreOnboarding);
  const notify = useGame((s) => s.notify);
  const preferences = useGame((s) => s.preferences);
  const language = preferences.language;
  const setPreference = useGame((s) => s.setPreference);

  // Cihaz desteği render sırasında sabittir; her çizimde sormaya gerek yok.
  const [titresimVar] = useState(hapticsSupported);
  /*
    iOS'ta Web Audio, telefonun fiziksel sessiz düğmesine tabidir; Apple'ın
    bunu aşan bir web API'si yok. Bu yüzden ipucu YALNIZ orada gösterilir.
    Modern iPad'ler kendini "MacIntel" diye tanıtıyor, dokunma noktası sayısı
    ikisini ayırır.
  */
  const [sessizDugmeliCihaz] = useState(
    () =>
      typeof navigator !== 'undefined' &&
      (/iP(hone|ad|od)/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)),
  );
  const [sesNotu, setSesNotu] = useState<SoundTestNote>('prompt');
  const { dialogRef, initialFocusRef } = useModalSurface<HTMLDivElement>(
    close,
    { active: open },
  );

  if (!open) return null;

  const coachOn = seenLessons.length === 0;

  return (
    <div className="settingsScrim" onClick={close} role="presentation">
      <div
        ref={dialogRef}
        className="settingsBox"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="settingsBox__title" id="settings-title">
          {t('Ayarlar')}
        </h2>

        <div className="settingsBox__scroll">
        <button
          ref={initialFocusRef}
          type="button"
          className="settingsRow"
          onClick={() => {
            close();
            openProfile();
          }}
        >
          <span className="settingsRow__copy">
            <strong>{t('Profil')}</strong>
            <small>{t('{ad} · ad ve portre', { ad: jewelerName })}</small>
          </span>
          <span className="settingsRow__action">{t('Düzenle')}</span>
        </button>

        <button
          type="button"
          className="settingsRow"
          aria-pressed={coachOn}
          onClick={() => (coachOn ? skipOnboarding() : restoreOnboarding())}
        >
          <span className="settingsRow__copy">
            <strong>{t('Öğretici ipuçları')}</strong>
            <small>{coachOn ? t('Açık — yeni durumlarda ipucu çıkar') : t('Kapalı')}</small>
          </span>
          <span className={`settingsRow__switch ${coachOn ? 'settingsRow__switch--on' : ''}`}>
            <span className="settingsRow__knob" />
          </span>
        </button>

        <button
          type="button"
          className="settingsRow"
          aria-pressed={preferences.soundEnabled}
          onClick={() => setPreference('soundEnabled', !preferences.soundEnabled)}
        >
          <span className="settingsRow__copy">
            <strong>{t('Ses efektleri')}</strong>
            <small>
              {preferences.soundEnabled ? t('Açık') : t('Kapalı')} {t('· işlem ve gün sesleri')}
            </small>
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
          aria-pressed={titresimVar ? preferences.vibrationEnabled : undefined}
          /*
            DESTEKLENMEYEN CİHAZDA ANAHTAR KAPALI.

            Alt metin "bu cihaz desteklemiyor" diyordu ama anahtar hâlâ
            basılıyor ve açık/kapalı arasında gidip geliyordu. Yani ekran bir
            cümleyle doğruyu, bir hareketle yalanı söylüyordu — oyuncu açıp
            beklemeye devam ediyordu. Ses düzeyi kaydırıcısında verilen karar
            burada da geçerli: hiçbir şey yapmayan denetim ekranda tutulmaz.
          */
          disabled={!titresimVar}
          onClick={() => setPreference('vibrationEnabled', !preferences.vibrationEnabled)}
        >
          <span className="settingsRow__copy">
            <strong>{t('Titreşim')}</strong>
            <small>
              {!titresimVar
                ? t('Bu cihaz titreşimi desteklemiyor')
                : `${preferences.vibrationEnabled ? t('Açık') : t('Kapalı')} ${t(
                    t('· işlem ve gün olayları'),
                  )}`}
            </small>
          </span>
          <span
            className={`settingsRow__switch ${preferences.vibrationEnabled ? 'settingsRow__switch--on' : ''}`}
          >
            <span className="settingsRow__knob" />
          </span>
        </button>

        {/*
          SES DÜZEYİ — EFEKT KAYDIRICISI.

          C2'de hızlı stok penceresindeki kaydırıcıları KALDIRMIŞTIK; burada
          eklemek onunla çelişmiyor. Oradaki değer kesin bir sayıydı (kaç
          çeyrek), yazmak doğruydu. Ses düzeyi sürekli ve yaklaşık bir
          tercihtir; kimse "%65 istiyorum" diye düşünmez, kulağıyla ayarlar.
        */}
        <div className="settingsRow settingsRow--static settingsRow--stack">
          <span className="settingsRow__copy">
            <strong>{t('Ses düzeyi')}</strong>
            <small>
              {preferences.soundEnabled
                ? /*
                     YÜZDE İMİ ELLE YAZILMIYOR. Bir kez daha ekran görüntüsü
                     yakaladı: `pct` dile bağlanmıştı ama burada im hâlâ
                     şablonun içinde sabitti ve İngilizce arayüzde "%70"
                     yazıyordu.
                   */
                  pct(preferences.soundVolume / 100)
                : t('Ses kapalıyken ayarlanamaz')}
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
            aria-label={t('Ses düzeyi')}
            onChange={(e) => setPreference('soundVolume', Number(e.target.value))}
          />
        </div>

        {/*
          "SESİ DENE" — görünmez bir arızayı görünür kılar.

          "Ses çalmıyor" kör bir şikâyettir: oyuncu tarayıcının mı, ayarın mı,
          dosyanın mı yoksa telefonun yan tarafındaki sessiz düğmesinin mi
          sustuğunu göremez; hiçbiri ekrana yansımaz. Bu düğme tek dokunuşta
          hem sesi çalmayı dener hem de ses yolunun o anki durumunu söyler.

          KİLİT BURADA DA AÇILIR: düğmenin kendisi bir kullanıcı jestidir,
          yani tarayıcının beklediği izin tam bu anda doğar.

          iOS NOTU HERKESE DEĞİL, YALNIZ iPhone/iPad'e. Web Audio orada
          telefonun fiziksel sessiz düğmesine tabidir ve bunu tahmin etmenin
          yolu yoktur; Android'de böyle bir davranış olmadığı için oradaki
          oyuncuya yanlış ipucu verilmez.
        */}
        <div className="settingsRow settingsRow--static settingsRow--stack">
          <span className="settingsRow__copy">
            <strong>{t('Sesi dene')}</strong>
            <small>{soundTestNoteText(sesNotu)}</small>
          </span>
          <button
            type="button"
            className="chip"
            onClick={() => {
              unlockAudio();
              playSound('coins', true, preferences.soundVolume);
              playHaptic('coins', preferences.vibrationEnabled);
              const durum = audioStatus();
              setSesNotu(
                !durum.supported
                  ? 'unsupported'
                  : durum.state === 'running'
                    ? sessizDugmeliCihaz
                      ? 'running-silent-device'
                      : 'running'
                    : 'blocked',
              );
            }}
          >
            {t('Çal')}
          </button>
        </div>

        {/*
          Dil bir AÇIK/KAPALI değil, bir seçim — o yüzden anahtar değil
          segment. `radiogroup` kullanılıyor ki ekran okuyucu "iki seçenekten
          biri" desin; anahtar taklidi yapmak yanlış olurdu.
        */}
        <div className="settingsRow settingsRow--static">
          <span className="settingsRow__copy">
            <strong>{t('Dil')}</strong>
            <small>{t('Arayüz metinleri')}</small>
          </span>
          <span className="settingsSegment" role="radiogroup" aria-label={t('Dil')}>
            {LANGUAGES.map((lang) => (
              <button
                key={lang.id}
                type="button"
                role="radio"
                aria-checked={preferences.language === lang.id}
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
          PARA BİRİMİ — dille aynı biçimde, ama açıklaması şart.

          Oyuncunun aklına gelecek ilk soru "param mı değişti?" olur. Alt
          satır kuru yazarak cevaplıyor: değişen yalnız yazı, kasadaki tutar
          değil. Kur sabittir ve bilerek öyledir (bkz. i18n/currency).
        */}
        <div className="settingsRow settingsRow--static">
          <span className="settingsRow__copy">
            <strong>{t('Para birimi')}</strong>
            <small>
              {/*
                Kur sayısı da dilin ondalık ayracını kullanır. Sabit virgül
                bırakılsaydı İngilizce arayüzde "1 $ = 32,45 ₺" yazardı ve
                virgülü binlik ayracı sanan biri için otuz iki bin okunurdu.
              */}
              {t('Yalnız gösterim · 1 $ = {rate} ₺', {
                rate: USD_RATE.toFixed(2).replace('.', language === 'en' ? '.' : ','),
              })}
            </small>
          </span>
          <span className="settingsSegment" role="radiogroup" aria-label={t('Para birimi')}>
            {CURRENCIES.map((cur) => (
              <button
                key={cur.id}
                type="button"
                role="radio"
                aria-checked={preferences.currency === cur.id}
                aria-label={`${t(cur.label)} (${cur.symbol})`}
                className={`settingsSegment__option ${
                  preferences.currency === cur.id ? 'settingsSegment__option--on' : ''
                }`}
                onClick={() => setPreference('currency', cur.id)}
              >
                {cur.symbol}
              </button>
            ))}
          </span>
        </div>

        {/* Bugün gerçekten çalışan kayıt davranışı; gelecek özellik vaadi yok. */}
        <div className="settingsRow settingsRow--static">
          <span className="settingsRow__copy">
            <strong>{t('Kayıt')}</strong>
            <small>{t('İlerleme bu cihazda otomatik kaydedilir')}</small>
          </span>
          <span className="settingsRow__badge">{t('Yerel')}</span>
        </div>

        <div className="settingsRow settingsRow--static">
          <span className="settingsRow__copy">
            <strong>{t('Gizlilik ve destek')}</strong>
            <small>{t('Yayımlanmış politika ve iletişim')}</small>
          </span>
          <span className="settingsRow__linkGroup">
            <a
              className="settingsTextLink"
              href={PRIVACY_URL[language]}
              target="_blank"
              rel="noreferrer"
            >
              {t('Gizlilik')}
            </a>
            <a
              className="settingsTextLink"
              href={SUPPORT_URL[language]}
              target="_blank"
              rel="noreferrer"
            >
              {t('Destek')}
            </a>
          </span>
        </div>

        {adPrivacyOptionsSupported() ? (
          <div className="settingsRow">
            <span className="settingsRow__copy">
              <strong>{t('Reklam gizlilik tercihleri')}</strong>
              <small>{t('Google AdMob onay seçenekleri')}</small>
            </span>
            <button
              type="button"
              className="settingsTextButton"
              onClick={async () => {
                const result = await showAdPrivacyOptions();
                if (result === 'shown') notify(t('Reklam gizlilik tercihleri güncellendi.'), 'positive');
                else if (result === 'not-required') notify(t('Bu bölgede ek reklam tercihi gerekmiyor.'), 'info');
                else notify(t('Reklam gizlilik tercihleri şu anda açılamadı.'), 'negative');
              }}
            >
              {t('Tercihleri Aç')}
            </button>
          </div>
        ) : null}
        </div>

        <button type="button" className="settingsBox__close" onClick={close}>
          {t('Kapat')}
        </button>
      </div>
    </div>
  );
}
