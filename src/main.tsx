import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';

import { App } from '@ui/App';

const root = document.getElementById('root');
if (!root) throw new Error('#root bulunamadı');

// Native iOS tam ekranında WebView zaten fiziksel kenarlara kadar uzanır.
// Bu işaret, web/PWA güvenli alanlarını bozmadan yalnız uygulama kabuğunun
// Dynamic Island ve home-indicator boşluklarını kendi düzenine yedirmesini sağlar.
if (Capacitor.isNativePlatform()) {
  document.documentElement.dataset.nativePlatform = Capacitor.getPlatform();
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
