import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const failures = [];
const passes = [];

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function check(condition, label) {
  (condition ? passes : failures).push(label);
}

function pngInfo(relativePath) {
  const bytes = readFileSync(join(root, relativePath));
  const pngSignature = '89504e470d0a1a0a';
  check(bytes.subarray(0, 8).toString('hex') === pngSignature, `${relativePath} geçerli PNG`);
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    colorType: bytes[25],
  };
}

const capacitor = read('capacitor.config.ts');
const xcodeProject = read('ios/App/App.xcodeproj/project.pbxproj');
const infoPlist = read('ios/App/App/Info.plist');
const androidStrings = read('android/app/src/main/res/values/strings.xml');
const productionEnv = read('.env.production');
const indexHtml = read('index.html');
const webManifest = read('public/manifest.webmanifest');
const appAds = read('public/app-ads.txt');
const adsBridge = read('src/ui/ads.ts');

check(capacitor.includes("appId: 'com.mihenkaynak.app'"), 'Capacitor Bundle ID doğru');
const xcodeBundleIds = [...xcodeProject.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)]
  .map((match) => match[1]);
check(
  xcodeBundleIds.length > 0 && xcodeBundleIds.every((id) => id === 'com.mihenkaynak.app'),
  'Xcode Bundle ID doğru',
);
const deviceFamilies = [...xcodeProject.matchAll(/TARGETED_DEVICE_FAMILY = ([^;]+);/g)]
  .map((match) => match[1].replaceAll('"', ''));
check(
  deviceFamilies.length > 0 && deviceFamilies.every((family) => family === '1'),
  'Xcode hedefi iPhone-only',
);
check(androidStrings.includes('ca-app-pub-4229088811556918~6302768552'), 'Android AdMob App ID hazır');
check(infoPlist.includes('ca-app-pub-4229088811556918~3768104554'), 'iOS AdMob App ID hazır');
const skAdNetworkIds = [...infoPlist.matchAll(
  /<key>SKAdNetworkIdentifier<\/key>\s*<string>([^<]+)<\/string>/g,
)].map((match) => match[1]);
check(skAdNetworkIds.length >= 50, 'Google güncel SKAdNetwork listesi makul sayıda kimlik içeriyor');
check(new Set(skAdNetworkIds).size === skAdNetworkIds.length, 'SKAdNetwork kimlikleri tekrarsız');
for (const id of [
  'cstr6suwn9.skadnetwork',
  '4fzdc2evr5.skadnetwork',
  '2fnua5tdw4.skadnetwork',
  '3qcr597p9d.skadnetwork',
]) {
  check(skAdNetworkIds.includes(id), `SKAdNetwork temel kimliği mevcut: ${id}`);
}

for (const key of [
  'VITE_ADMOB_REWARD_UNIT_ANDROID',
  'VITE_ADMOB_REWARD_UNIT_IOS',
  'VITE_ADMOB_DAY_OPEN_UNIT_ANDROID',
  'VITE_ADMOB_DAY_OPEN_UNIT_IOS',
]) {
  check(new RegExp(`^${key}=ca-app-pub-\\d+\\/\\d+$`, 'm').test(productionEnv), `${key} production değerine sahip`);
}

check(!/user-scalable\s*=\s*no/i.test(indexHtml), 'Kullanıcı yakınlaştırması engellenmiyor');
check(!/maximum-scale\s*=\s*1(?:\.0)?/i.test(indexHtml), 'Viewport maksimum yakınlaştırmayı kilitlemiyor');
check(/"orientation"\s*:\s*"portrait"/.test(webManifest), 'PWA portre yönünde');
check(
  appAds.trim() === 'google.com, pub-4229088811556918, DIRECT, f08c47fec0942fa0',
  'AdMob app-ads.txt kaydı doğru',
);
check(adsBridge.includes('consent.canRequestAds'), 'AdMob reklamları UMP izniyle sınırlandırılıyor');
check(adsBridge.includes('AdMob.showPrivacyOptionsForm()'), 'AdMob gizlilik tercihleri giriş noktası mevcut');
check(
  adsBridge.includes("consent.privacyOptionsRequirement === 'UNKNOWN'"),
  'UMP gizlilik durumu UNKNOWN iken gerekli-değil sayılmıyor',
);

const phoneOrientationBlock = infoPlist.match(
  /<key>UISupportedInterfaceOrientations<\/key>\s*<array>([\s\S]*?)<\/array>/,
)?.[1] ?? '';
check(phoneOrientationBlock.includes('UIInterfaceOrientationPortrait'), 'iPhone portre yönünü destekliyor');
check(!phoneOrientationBlock.includes('Landscape'), 'iPhone bozuk yatay düzeni ilan etmiyor');
check(!infoPlist.includes('UISupportedInterfaceOrientations~ipad'), 'iPhone-only pakette iPad yön beyanı yok');
check(infoPlist.includes('<key>ITSAppUsesNonExemptEncryption</key>'), 'Şifreleme/ihracat beyanı Info.plist içinde');
const englishInfoStrings = read('ios/App/App/en.lproj/InfoPlist.strings');
const turkishInfoStrings = read('ios/App/App/tr.lproj/InfoPlist.strings');
check(/NSUserTrackingUsageDescription/.test(englishInfoStrings), 'ATT açıklaması İngilizce yerelleştirildi');
check(/NSUserTrackingUsageDescription/.test(turkishInfoStrings), 'ATT açıklaması Türkçe yerelleştirildi');
check(/knownRegions[\s\S]*?\btr,/.test(xcodeProject), 'Xcode Türkçe yerelleştirmeyi paketliyor');

for (const page of [
  'public/privacy.html',
  'public/support.html',
  'public/terms.html',
  'public/privacy-en.html',
  'public/support-en.html',
  'public/terms-en.html',
]) {
  check(existsSync(join(root, page)), `${page} mevcut`);
  if (existsSync(join(root, page))) {
    const html = read(page);
    check(!html.includes('[DOLDURULACAK]'), `${page} placeholder içermiyor`);
    check(/nostoscomp@gmail\.com/i.test(html), `${page} iletişim adresi içeriyor`);
  }
}
if (existsSync(join(root, 'public/privacy.html'))) {
  check(/AdMob/i.test(read('public/privacy.html')), 'Gizlilik sayfası AdMob kullanımını açıklıyor');
}
if (existsSync(join(root, 'public/privacy-en.html'))) {
  check(/AdMob/i.test(read('public/privacy-en.html')), 'İngilizce gizlilik sayfası AdMob kullanımını açıklıyor');
  check(/<html lang="en">/.test(read('public/privacy-en.html')), 'İngilizce yasal sayfanın dil etiketi doğru');
}

const appStoreIcon = pngInfo('store/assets/generated/icon-1024-appstore.png');
check(appStoreIcon.width === 1024 && appStoreIcon.height === 1024, 'App Store ikonu 1024×1024');
check(![4, 6].includes(appStoreIcon.colorType), 'App Store ikonunda alfa kanalı yok');

const screenshotSets = [
  ['store/assets/generated/screenshots', 1290, 2796],
  ['store/assets/generated/screenshots-6.5in', 1284, 2778],
];
for (const [directory, expectedWidth, expectedHeight] of screenshotSets) {
  const files = readdirSync(join(root, directory)).filter((file) => file.endsWith('.png'));
  check(files.length >= 3 && files.length <= 10, `${directory} 3–10 ekran görüntüsü içeriyor`);
  for (const file of files) {
    const info = pngInfo(join(directory, file));
    check(
      info.width === expectedWidth && info.height === expectedHeight,
      `${join(directory, file)} ${expectedWidth}×${expectedHeight}`,
    );
  }
}

for (const label of passes) console.log(`✓ ${label}`);
for (const label of failures) console.error(`✗ ${label}`);

if (failures.length > 0) {
  console.error(`\nRelease kontrolü başarısız: ${failures.length} madde.`);
  process.exitCode = 1;
} else {
  console.log(`\nRelease kontrolü başarılı: ${passes.length} madde.`);
}
