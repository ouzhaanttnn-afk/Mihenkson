import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

function plistArray(plist: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`<key>${escaped}<\\/key>\\s*<array>([\\s\\S]*?)<\\/array>`).exec(plist);
  expect(match, `${key} Info.plist içinde bulunmalı`).not.toBeNull();
  return match?.[1] ?? '';
}

describe('iOS mağaza paketi', () => {
  it('dikey ürün kararıyla iPhone-only hedeflenir', () => {
    const project = read('ios/App/App.xcodeproj/project.pbxproj');
    const families = [...project.matchAll(/TARGETED_DEVICE_FAMILY = ([^;]+);/g)]
      .map((match) => match[1]?.replaceAll('"', ''));

    expect(families.length).toBeGreaterThan(0);
    expect(families.every((family) => family === '1')).toBe(true);
  });

  it('portre odaklı arayüz landscape desteği ilan etmez', () => {
    const plist = read('ios/App/App/Info.plist');
    const phone = plistArray(plist, 'UISupportedInterfaceOrientations');

    expect(phone).toContain('UIInterfaceOrientationPortrait');
    expect(phone).not.toContain('Landscape');
    expect(plist).not.toContain('UISupportedInterfaceOrientations~ipad');
  });

  it('muaf olmayan şifreleme kullanmadığını pakette açıklar', () => {
    const plist = read('ios/App/App/Info.plist');
    expect(plist).toMatch(/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/);
  });

  it('Google güncel SKAdNetwork listesini eksiksiz ve tekrarsız taşır', () => {
    const plist = read('ios/App/App/Info.plist');
    const ids = [...plist.matchAll(
      /<key>SKAdNetworkIdentifier<\/key>\s*<string>([^<]+)<\/string>/g,
    )].map((match) => match[1]);

    expect(ids.length).toBeGreaterThanOrEqual(50);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining([
      'cstr6suwn9.skadnetwork',
      '4fzdc2evr5.skadnetwork',
      '2fnua5tdw4.skadnetwork',
      '3qcr597p9d.skadnetwork',
    ]));
  });

  it('ATT sistem istemini İngilizce ve Türkçe yerelleştirir', () => {
    const project = read('ios/App/App.xcodeproj/project.pbxproj');
    const en = read('ios/App/App/en.lproj/InfoPlist.strings');
    const tr = read('ios/App/App/tr.lproj/InfoPlist.strings');

    expect(project).toContain('InfoPlist.strings in Resources');
    expect(project).toMatch(/knownRegions = \([\s\S]*?\btr,/);
    expect(en).toContain('NSUserTrackingUsageDescription');
    expect(tr).toContain('NSUserTrackingUsageDescription');
  });
});

describe('yayınlanan yasal ve destek sayfaları', () => {
  it('gizlilik metni iki reklam biçimini ve AdMob veri kapsamını açıklar', () => {
    const privacy = read('public/privacy.html');
    for (const required of [
      'Ödüllü reklam',
      'Geçiş reklamı',
      'Google AdMob',
      'yaklaşık konum',
      'cihaz veya reklam kimlikleri',
      'performans',
      'çökme/teşhis',
      'nostoscomp@gmail.com',
    ]) {
      expect(privacy, `gizlilik metninde eksik: ${required}`).toContain(required);
    }
  });

  it('uygulama doğru HTTPS gizlilik ve destek adreslerini sunar', () => {
    const settings = read('src/ui/shell/SettingsDialog.tsx');
    expect(settings).toContain('https://alpersonmihenk-chi.vercel.app/privacy.html');
    expect(settings).toContain('https://alpersonmihenk-chi.vercel.app/privacy-en.html');
    expect(settings).toContain('https://alpersonmihenk-chi.vercel.app/support.html');
    expect(settings).toContain('https://alpersonmihenk-chi.vercel.app/support-en.html');
    expect(settings).not.toMatch(/App Store Hesabını Bağla|Google Play Hesabını Bağla|yakında geliyor/);
  });

  it('yasal ve destek sayfalarını Türkçe ve İngilizce sunar', () => {
    for (const page of ['privacy', 'support', 'terms']) {
      expect(read(`public/${page}.html`)).toContain('<html lang="tr">');
      expect(read(`public/${page}-en.html`)).toContain('<html lang="en">');
    }
    expect(read('public/privacy-en.html')).toContain('Google AdMob');
    expect(read('public/support-en.html')).toContain('nostoscomp@gmail.com');
  });

  it('mağaza belgeleri eski geçici paylaşım bağlantısını taşımaz', () => {
    const docs = [
      'store/README.md',
      'store/ios/checklist.md',
      'store/ios/metadata-taslak.md',
      'store/android/checklist.md',
      'store/android/metadata-taslak.md',
      'store/legal/gizlilik-politikasi.md',
      'store/legal/kullanim-sartlari.md',
    ].map(read).join('\n');

    expect(docs).not.toContain('claude.ai/code/artifact');
  });
});

describe('reklam gizliliği', () => {
  it('reklam yüklemeyi UMP canRequestAds kararıyla sınırlar', () => {
    const ads = read('src/ui/ads.ts');

    expect(ads).toContain('consent.canRequestAds');
    expect(ads).toMatch(/if \(!\(await ensureInitialized\(\)\)\.canRequestAds\) return false;/);
    expect(ads).toMatch(/if \(!\(await ensureInitialized\(\)\)\.canRequestAds\) return;/);
    expect(ads).toContain('AdMob.showPrivacyOptionsForm()');
    expect(ads).not.toContain('AdMob.requestTrackingAuthorization()');
    expect(ads).toContain("consent.privacyOptionsRequirement === 'UNKNOWN'");
  });

  it('native ayarlarda UMP gizlilik tercihleri girişini sunar', () => {
    const settings = read('src/ui/shell/SettingsDialog.tsx');
    expect(settings).toContain('adPrivacyOptionsSupported()');
    expect(settings).toContain('showAdPrivacyOptions()');
  });
});
