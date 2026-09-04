/// <reference types="vite/client" />

/**
 * AdMob reklam birimi kimlikleri — GİZLİ DEĞİL (Google App/Ad Unit ID'leri
 * native derlemede zaten APK/IPA içine gömülür, hesaba erişim yetkisi
 * taşımaz). `.env`'e taşınma sebebi ortam-özgü (environment-specific)
 * yapılandırma olmaları: hesap değişirse veya test/prod ayrımı gerekirse
 * kodu değil yalnız `.env`'i değiştirmek yeter. Değerler `.env` dosyasında
 * (Git'e girmez) — bkz. `.env.example`.
 */
interface ImportMetaEnv {
  readonly VITE_ADMOB_REWARD_UNIT_ANDROID?: string;
  readonly VITE_ADMOB_REWARD_UNIT_IOS?: string;
  readonly VITE_ADMOB_DAY_OPEN_UNIT_ANDROID?: string;
  readonly VITE_ADMOB_DAY_OPEN_UNIT_IOS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
