/**
 * MİHENKAYNAK — üretim derlemesini karartma (obfuscation) eklentisi.
 *
 * NE İÇİN: kullanıcı isteği — "tasarım ve parametrelerimiz/denklemlerimiz
 * çalınmasın." Bu GERÇEK bir şifreleme DEĞİLDİR (öyle bir şey web/WebView
 * kodu için mümkün değil — tarayıcı çalıştırabilmek için kodu okuyabilir
 * hâlde almak zorunda). Bu, işi zorlaştıran bir CAYDIRICI katman: kontrol
 * akışı bulandırılır, değişken adları anlamsızlaştırılır, metin sabitleri
 * kodlanır. Kararlı bir kişi hâlâ geri çözebilir — amaç imkânsız kılmak
 * değil, "bir metin editörüyle aç, oku" seviyesindeki kopyalamayı engellemek.
 *
 * BİLEREK KAPALI BIRAKILAN AYARLAR — `selfDefending` ve `debugProtection`:
 * bu ikisi DevTools açıkken kodun kilitlenmesine/sonsuz döngüye girmesine
 * neden olabiliyor. Gerçek oyuncuların (özellikle hata ayıklarken) veya
 * mağaza incelemecilerinin DevTools açması meşru bir senaryo — kod onlara
 * karşı "savunma" yapmaya kalkarsa uygulama çöker gibi görünür. Caydırıcılık
 * için güvenilirlikten ödün verilmedi.
 *
 * `controlFlowFlattening`/`deadCodeInjection` eşikleri BİLEREK ORTA düzeyde
 * (maksimum değil): tam güçte bu ayarlar paket boyutunu birkaç katına
 * çıkarabilir ve CPU yükünü artırabilir — mobil bir oyun için yükleme/
 * çalışma hızından ödün vermeye değmez.
 *
 * Yalnız `vite build` sırasında çalışır (`apply: 'build'`) — `vite dev` ve
 * `vitest` etkilenmez, kaynak kodun kendisi hiç değişmez.
 */
import JavaScriptObfuscator from 'javascript-obfuscator';

export function obfuscate() {
  return {
    name: 'mihenkaynak-obfuscate',
    apply: 'build',
    enforce: 'post',
    renderChunk(code, chunk) {
      if (chunk.type !== 'chunk' || !chunk.fileName.endsWith('.js')) return null;

      const result = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.4,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.2,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        selfDefending: false,
        debugProtection: false,
        disableConsoleOutput: false,
        numbersToExpressions: true,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 12,
        target: 'browser',
      });

      return { code: result.getObfuscatedCode(), map: null };
    },
  };
}
