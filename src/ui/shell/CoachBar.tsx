/**
 * Öğretim şeridi (GDD 25)
 *
 * NEDEN ÜSTE BİNMİYOR: bu ekranda üste binen katmanlar tekrar tekrar
 * kontrolleri gizledi (toast araç rayını örtüyordu, panel panelin üstüne
 * çiziliyordu). Ders şeridi bir OVERLAY DEĞİL, akışın içinde duran bir
 * bölgedir: İşlem Masası ile araç rayının arasına girer, kimseyi örtmez,
 * kapatılınca yerini geri verir.
 *
 * "TÜMÜNÜ ATLA" NEDEN YALNIZ İLK DERSTE:
 * Önce her derste, "Anladım"ın hemen altında duruyordu. İkisi de 44 px'in
 * altındaydı (26 ve 22 px) ve yan yanaydılar — yani ıskalanan bir dokunuş
 * doğrudan komşusuna gidiyordu. Burada komşu, tüm öğretimi silen düğme.
 * Rutin bir kapatmanın yanına yıkıcı bir eylem koymak, dokunma hedefi
 * kuralının (GDD 23.22) korumaya çalıştığı şeyin ta kendisi.
 *
 * Şimdi: "Anladım" tek başına ve 44 px. Atlama kararı bir kez, ilk derste,
 * AYRI SÜTUNDA veriliyor — ıskalanan dokunuş öbürüne düşemez.
 */

import type { Lesson } from '@domain/onboarding';

interface Props {
  lesson: Lesson;
  /** İlk derste true: öğretimi hiç istemeyen oyuncu kararını burada verir. */
  showSkip: boolean;
  onDismiss: () => void;
  onSkipAll: () => void;
  /** Bekleyen müşteri varsa kısa ekranda öğretim kompaktlaşır. */
  queuePriority?: boolean;
}

export function CoachBar({ lesson, showSkip, onDismiss, onSkipAll, queuePriority = false }: Props) {
  return (
    <aside className={`coach ${queuePriority ? 'coach--queuePriority' : ''}`} role="note" aria-label="Öğretim ipucu">
      <div className="coach__body">
        <span className="coach__title">{lesson.title}</span>
        <span className="coach__text">{lesson.body}</span>

        {showSkip && (
          <button type="button" className="coach__skip" onClick={onSkipAll}>
            Öğretimi kapat
          </button>
        )}
      </div>

      <button type="button" className="coach__ok" onClick={onDismiss}>
        Anladım
      </button>
    </aside>
  );
}
