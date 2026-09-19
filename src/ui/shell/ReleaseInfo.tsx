import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { version } from '../../../package.json';
import { t } from '@i18n/index';

export function ReleaseInfo() {
  const [info, setInfo] = useState({ version, build: '', commit: '' });
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    if (Capacitor.isNativePlatform()) {
      void App.getInfo().then(result => {
        if (live) setInfo({ version: result.version, build: result.build, commit: '' });
      }).catch(() => {});
    } else {
      void fetch('./release.json', { signal: controller.signal, cache: 'no-store' })
        .then(response => response.ok ? response.json() : null)
        .then(result => {
          if (live && result?.version === version && typeof result.commit === 'string' && /^[a-f0-9]{40}$/.test(result.commit)) {
            setInfo({ version, build: '', commit: result.commit.slice(0, 7) });
          }
        }).catch(() => {});
    }
    return () => { live = false; clearTimeout(timer); controller.abort(); };
  }, []);
  return <details className="settingsPrivacy releaseInfo">
    <summary>{t('Sürüm')} {info.version}{info.build ? ` (${info.build})` : ''}{!Capacitor.isNativePlatform() ? ' · Web' : ''}
      {info.commit ? ` · ${info.commit}` : ''}</summary>
    <strong>{t('Bu sürümde yenilikler')}</strong>
    <ul>
      <li>{t('Müşteriye göre stok önerisi ve daha net satış tutarları.')}</li>
      <li>{t('Klasik görünüm, sade stok kontrolleri ve pazarlık analizi.')}</li>
      <li>{t('Kupa düğmesiyle aylık HAS sıralaması ekranı. Canlı sezon ayrıca etkinleştirilir.')}</li>
      <li>{t('Reklam durum mesajları ve müşteriyi tek sefer geri çağırma.')}</li>
    </ul>
  </details>;
}
