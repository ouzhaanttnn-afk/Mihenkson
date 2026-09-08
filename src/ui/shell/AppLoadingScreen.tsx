import { useEffect, useState } from 'react';

import { t } from '@i18n/index';

const CRITICAL_IMAGES = [
  '/assets/brand/mihenkaynak-loading.png',
  '/assets/realistic/backgrounds/shop-interior-liquid-v1.webp',
  '/assets/realistic/navigation/shop.webp',
];

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
    if (image.complete) resolve();
  });
}

export function AppLoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(8);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let finishTimer = 0;
    let assetTimeout = 0;
    let assetsReady = false;
    const startedAt = performance.now();

    const fontsReady = document.fonts?.ready?.then(() => undefined) ?? Promise.resolve();
    const timeoutReady = new Promise<void>((resolve) => {
      assetTimeout = window.setTimeout(resolve, 2500);
    });
    Promise.race([
      Promise.all([fontsReady, ...CRITICAL_IMAGES.map(preloadImage)]),
      timeoutReady,
    ]).finally(() => {
      assetsReady = true;
    });

    const advance = (now: number) => {
      if (disposed) return;
      const elapsed = now - startedAt;
      const waitingProgress = Math.min(92, 8 + elapsed / 14);
      const target = assetsReady && elapsed >= 900
        ? Math.min(100, Math.max(waitingProgress, 92 + (elapsed - 900) / 45))
        : waitingProgress;

      setProgress((current) => Math.max(current, Math.round(target)));

      if (target >= 100) {
        setLeaving(true);
        finishTimer = window.setTimeout(onComplete, 420);
        return;
      }
      frame = window.requestAnimationFrame(advance);
    };

    frame = window.requestAnimationFrame(advance);
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(finishTimer);
      window.clearTimeout(assetTimeout);
    };
  }, [onComplete]);

  const status = progress < 35
    ? t('Atölye hazırlanıyor')
    : progress < 70
      ? t('Vitrin düzenleniyor')
      : progress < 96
        ? t('Piyasa bağlanıyor')
        : t('Hazır');

  return (
    <div className={`launchScreen ${leaving ? 'launchScreen--leaving' : ''}`} aria-label={t('Oyun yükleniyor')}>
      <img
        className="launchScreen__image"
        src="/assets/brand/mihenkaynak-loading.png"
        alt=""
        aria-hidden="true"
      />
      <div className="launchScreen__shade" />
      <div className="launchScreen__progress">
        <div className="launchScreen__status" role="status" aria-live="polite">
          <span>{status}</span>
          <span className="num">{progress}%</span>
        </div>
        <div
          className="launchScreen__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span className="launchScreen__fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
