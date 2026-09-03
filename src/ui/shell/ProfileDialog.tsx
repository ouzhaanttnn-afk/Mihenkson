/**
 * Profili Düzenle penceresi.
 *
 * KAPSAM: kuyumcunun adı ve portresi. Başka hiçbir şey. Avatarların
 * seviyesi, XP'si, özelliği veya karar etkisi yoktur (bkz. @domain/profile).
 *
 * TASLAK ÜZERİNDE ÇALIŞIR: pencere açıldığında mevcut profilin bir kopyası
 * alınır ve tüm düzenleme o kopyada yapılır. "İptal" hiçbir şey yazmaz,
 * çünkü yazılacak bir şey henüz oluşmamıştır — iptalde geri alma mantığı
 * kurmak yerine, kaydedene kadar hiç dokunmamak daha güvenli.
 *
 * ERİŞİLEBİLİRLİK:
 *  - role="dialog" + aria-modal, başlıkla ilişkilendirilmiş.
 *  - Escape kapatır, dış tıklama kapatır (karşılama kipinde İKİSİ DE yok:
 *    oyuncu henüz kendini tanıtmadı, kapatılacak bir önceki hâl yok).
 *  - Açılışta odak ad alanına gider; Tab pencerede döner (odak tuzağı) —
 *    aksi halde klavye kullanıcısı arkadaki oyun ekranına düşerdi.
 *  - Avatar ızgarası bir radio grubudur: TEK tab durağı vardır ve seçim ok
 *    tuşlarıyla gezilir (roving tabindex).
 *
 *    BU KENDİLİĞİNDEN GELMİYOR — ölçerek öğrendim. Önce "ok tuşları
 *    tarayıcıdan gelir" diye yazmıştım; doğru değil. Yerel ok-tuşu davranışı
 *    yalnız gerçek `<input type="radio">` için vardır, `role="radio"` verilmiş
 *    bir `<button>` için değil. Üstelik 11 düğmenin hepsi ayrı birer tab
 *    durağıydı: klavye kullanıcısı "Kaydet"e ulaşmak için 11 kez Tab'a
 *    basmak zorundaydı. Tarayıcı testinde Kaydet'e hiç ulaşılamadı.
 */

import { useEffect, useId, useRef, useState } from 'react';

import { AVATAR_IDS, NAME_MAX, SHOP_SUFFIX, checkJewelerName, type PlayerProfile } from '@domain/profile';
import { avatarArt } from '@ui/assets';
import { Art } from '@ui/Art';
import { IconTrust } from '@ui/icons';
import { t } from '@i18n/index';

interface Props {
  profile: PlayerProfile;
  /**
   * `welcome`: oyunun ilk açılışı. Aynı pencere, farklı çerçeve — iptal ve
   * dış tıklamayla kapatma YOKTUR, çünkü kapatılacak bir "önceki hâl" yok:
   * oyuncu henüz kendini tanıtmadı.
   *
   * AD ALANI BOŞ AÇILIR. Düzenleme kipinde varsayılan "Kuyumcu" doludur,
   * ama karşılamada dolu gelseydi oyuncu tek dokunuşla "Kuyumcu
   * Kuyumculuk"a razı olurdu — istenen "isim giriniz" ekranı değil, atlanan
   * bir ekran olurdu. Boş alanda "Dükkânı Aç" kapalı durur; açan şey adın
   * kendisidir.
   *
   * Ayrı bir ekran yazmak yerine bu pencere yeniden kullanılıyor: ad
   * doğrulaması, odak tuzağı ve avatar ızgarasının roving tabindex'i burada
   * zaten çözülmüş. İkinci bir kopya, o çözümlerin birinde sessizce
   * geride kalırdı.
   */
  mode?: 'edit' | 'welcome';
  onCancel: () => void;
  /** @returns kaydedildiyse true; ad geçersizse false (pencere açık kalır). */
  onSave: (next: { jewelerName: string; avatarId: string }) => boolean;
}

export function ProfileDialog({ profile, mode = 'edit', onCancel, onSave }: Props) {
  const welcome = mode === 'welcome';
  const [name, setName] = useState(welcome ? '' : profile.jewelerName);
  const [avatarId, setAvatarId] = useState<string>(profile.avatarId);
  const [error, setError] = useState<string | null>(null);

  const titleId = useId();
  const nameId = useId();
  const errorId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const nameCheck = checkJewelerName(name);

  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
  }, []);

  // Escape kapatır; Tab pencerenin içinde döner.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        // Karşılama ekranında kapatacak bir "önceki hâl" yok; Escape yutulur.
        if (!welcome) onCancel();
        return;
      }
      if (e.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      // `[tabindex="-1"]` olanlar hariç: roving tabindex ile ızgaranın
      // seçili olmayan 10 kartı Tab sırasında yoktur.
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([tabindex="-1"]), input:not([disabled])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel, welcome]);

  const submit = () => {
    const check = checkJewelerName(name);
    if (!check.ok) {
      setError(check.error);
      nameRef.current?.focus();
      return;
    }
    // Ad ve avatar BİRLİKTE yazılır — yarısı kaydedilmiş bir profil olmaz.
    if (!onSave({ jewelerName: check.value, avatarId })) {
      setError(t('Profil kaydedilemedi.'));
    }
  };

  return (
    <div
      className="profileScrim"
      onMouseDown={(e) => {
        // Yalnız zemine basıldığında kapanır: panelin içinde başlayan bir
        // sürükleme (metin seçimi) zeminde bitince pencere kapanmamalı.
        if (!welcome && e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="profileDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
      >
        <h2 className="profileDialog__title" id={titleId}>
          {welcome ? t('Hoş geldin, sarraf') : t('Profili Düzenle')}
        </h2>
        {welcome && (
          <p className="profileDialog__welcome">
            {t(
              t("Tezgâhın arkasına geçmeden önce: dükkânın adı ne olsun, sen kimsin? İkisini de sonradan Ayarlar'dan değiştirebilirsin."),
            )}
          </p>
        )}

        <label className="profileDialog__label" htmlFor={nameId}>
          {t('Dükkan Adı')}
        </label>
        <input
          id={nameId}
          ref={nameRef}
          className={`profileDialog__input ${error ? 'profileDialog__input--error' : ''}`}
          value={name}
          /*
            maxLength, doğrulamanın YERİNE değil YANINDA: aşırı uzun metnin
            arayüzü bozmasını daha yazılırken engeller. Sınırın kendisi yine
            checkJewelerName'de — tek doğruluk kaynağı orası.
          */
          maxLength={NAME_MAX + SHOP_SUFFIX.length + 1}
          /*
            Karşılamada örnek "Kuyumculuk" EKİ OLMADAN verilir: hemen
            altındaki ipucu ekin kendiliğinden geldiğini söylüyor, örnek
            ekli olsaydı iki satır birbirini yalanlardı.
          */
          placeholder={welcome ? t('örn. Alvera') : t('İsim koyunuz — örn. Alvera Kuyumculuk')}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />
        <p className="profileDialog__hint">
          {welcome
            ? t('Dükkânın adını yaz — sonuna "{ek}" kendiliğinden eklenir.', {
                ek: SHOP_SUFFIX,
              })
            : t('İsim koyunuz — örn. Alvera Kuyumculuk')}
        </p>
        {error && (
          <p className="profileDialog__error" id={errorId} role="alert">
            {error}
          </p>
        )}

        <span className="profileDialog__label">{t('Karakter')}</span>
        <div
          className="avatarGrid"
          role="radiogroup"
          aria-label={t('Kuyumcu portresi')}
          ref={gridRef}
          onKeyDown={(e) => {
            const step =
              e.key === 'ArrowRight' || e.key === 'ArrowDown'
                ? 1
                : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
                  ? -1
                  : 0;
            let target: number | null = null;
            if (step !== 0) {
              const at = AVATAR_IDS.indexOf(avatarId as (typeof AVATAR_IDS)[number]);
              // Uçlarda sarar: son karttan sağa basınca başa döner.
              target = (at + step + AVATAR_IDS.length) % AVATAR_IDS.length;
            } else if (e.key === 'Home') target = 0;
            else if (e.key === 'End') target = AVATAR_IDS.length - 1;
            if (target === null) return;

            e.preventDefault();
            setAvatarId(AVATAR_IDS[target]!);
            // Odak seçimi TAKİP EDER; aksi halde ekran okuyucu nerede
            // olduğunu, gören kullanıcı da odak halkasını kaybederdi.
            gridRef.current
              ?.querySelectorAll<HTMLElement>('.avatarCard')
              [target]?.focus();
          }}
        >
          {AVATAR_IDS.map((id) => {
            const selected = id === avatarId;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                /*
                  ROVING TABINDEX: gruba tek bir tab durağı düşer — seçili
                  olan. Diğerleri Tab sırasından çıkar ama ok tuşlarıyla
                  hâlâ erişilebilir.
                */
                tabIndex={selected ? 0 : -1}
                aria-label={t('Karakter {no}', { no: id.replace('male-', '') })}
                className={`avatarCard ${selected ? 'avatarCard--selected' : ''}`}
                onClick={() => setAvatarId(id)}
              >
                <Art
                  art={avatarArt(id)}
                  size={72}
                  decorative
                  className="avatarCard__img"
                  fallback={<IconTrust size={26} />}
                />
                {selected && (
                  <span className="avatarCard__check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="profileDialog__actions">
          {!welcome && (
            <button type="button" className="profileDialog__cancel" onClick={onCancel}>
              {t('İptal')}
            </button>
          )}
          <button
            type="button"
            className="profileDialog__save"
            onClick={submit}
            disabled={!nameCheck.ok}
          >
            {welcome ? t('Dükkânı Aç') : t('Değişiklikleri Kaydet')}
          </button>
        </div>
      </div>
    </div>
  );
}
