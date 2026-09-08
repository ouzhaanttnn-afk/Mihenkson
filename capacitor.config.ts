import type { CapacitorConfig } from '@capacitor/cli';

// appId KESİNLEŞTİRİLDİ — kullanıcı kararı (bkz. store/README.md): com.mihenkaynak.app.
const config: CapacitorConfig = {
  appId: 'com.mihenkaynak.app',
  appName: 'MİHENKAYNAK',
  webDir: 'dist',
  ios: {
    // Oyunu sistem çubuklarının arasına daraltma; WebView ekranın fiziksel
    // kenarlarına kadar uzansın. CSS güvenli alanları gerçek oyun yüzeylerine
    // katar, ayrı üst/alt boşluk üretmez.
    contentInset: 'never',
  },
  plugins: {
    SystemBars: {
      // Capacitor 8'in yerleşik yolu hem durum çubuğunu hem de home
      // indicator'ı gizler; özel UIViewController alt sınıfı gerektirmez.
      hidden: true,
    },
  },
};

export default config;
