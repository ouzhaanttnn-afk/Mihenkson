import type { CapacitorConfig } from '@capacitor/cli';

// appId GECICI bir yer tutucu (com.mihenkaynak.app). Yayindan ONCE degistirmek
// bedava, yayindan SONRA pratikte imkansiz. Sirket/gelistirici adi henuz
// store/*/checklist.md'de DOLDURULACAK - ilk native derlemeden once bu
// satiri gercek kimlikle degistir, sonra `npx cap sync` calistir.
const config: CapacitorConfig = {
  appId: 'com.mihenkaynak.app',
  appName: 'MİHENKAYNAK',
  webDir: 'dist',
};

export default config;
