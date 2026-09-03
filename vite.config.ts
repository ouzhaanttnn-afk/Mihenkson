import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { obfuscate } from './tools/vite-plugin-obfuscate.mjs';

export default defineConfig({
  // `obfuscate()` yalnız `vite build`'de çalışır (bkz. dosyanın kendi
  // başındaki not) — tasarım/ekonomi formüllerinin üretim paketinde
  // metin editörüyle doğrudan okunmasını zorlaştıran bir caydırıcı katman.
  plugins: [react(), obfuscate()],
  resolve: {
    alias: {
      '@domain': fileURLToPath(new URL('./src/domain', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
      '@state': fileURLToPath(new URL('./src/state', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
      '@i18n': fileURLToPath(new URL('./src/i18n', import.meta.url)),
    },
  },
  // Capacitor/WebView paketlemesi için göreli asset yolları.
  base: './',
  build: { target: 'es2020', assetsDir: 'assets' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
