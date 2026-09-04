import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function projectFile(path: string): string {
  return readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)), 'utf8');
}

function relativeLuminance(hex: string): number {
  const channels = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function cssHexVariable(css: string, variable: string): string {
  const value = css.match(new RegExp(`${variable}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];
  if (!value) throw new Error(`${variable} için hex renk bulunamadı`);
  return value;
}

function selectorColorVariable(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const variable = css.match(
    new RegExp(`${escaped}\\s*\\{[^}]*color:\\s*var\\((--[^)]+)\\)`, 's'),
  )?.[1];
  if (!variable) throw new Error(`${selector} için renk değişkeni bulunamadı`);
  return variable;
}

describe('mobil kabuk sözleşmesi', () => {
  it('tarayıcı yakınlaştırmasını kapatmaz', () => {
    const html = projectFile('index.html');
    const viewport = html.match(/<meta\s+name="viewport"\s+content="([^"]+)"/s)?.[1] ?? '';

    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('viewport-fit=cover');
    expect(viewport).not.toContain('maximum-scale');
    expect(viewport).not.toContain('user-scalable=no');
  });

  it('tek ana landmark ve dükkan başlığı üretir', () => {
    const app = projectFile('src/ui/App.tsx');
    const shop = projectFile('src/ui/screens/ShopScreen.tsx');
    const market = projectFile('src/ui/screens/MarketPlaceholderScreen.tsx');

    expect(app).toContain('<main');
    expect(app).toContain('id="main-content"');
    expect(shop).toContain('<h1 className="srOnly">');
    expect(shop).toContain('<section\n        className={`workbench');
    expect(market).toContain('<section className="marketCatalog"');
  });

  it('saat rolünü ve profil düğmesindeki XP ilerleme adını korur', () => {
    const status = projectFile('src/ui/shell/StatusStrip.tsx');

    expect(status).toContain('role="timer"');
    expect(status).toContain('aria-live="off"');
    expect(status).toContain('const profileAriaLabel =');
    expect(status).toContain("${t('XP')}: ${store.xp}/${store.xpToNext}");
    expect(status).toContain('aria-label={profileAriaLabel}');
    expect(status).toContain('className="statusStrip__xpBar" aria-hidden="true"');
    expect(status).not.toContain('role="progressbar"');
  });

  it('müşteri sabrını adsız bir div değil erişilebilir bir ölçer olarak sunar', () => {
    const customer = projectFile('src/ui/shell/CustomerStrip.tsx');
    const patience = customer.match(/<div\s+className="patience"[\s\S]*?>/)?.[0] ?? '';

    expect(patience).toContain('role="meter"');
    expect(patience).toContain('aria-label=');
    expect(patience).toContain('aria-valuemin={0}');
    expect(patience).toContain('aria-valuemax={total}');
    expect(patience).toContain('aria-valuenow={filled}');
  });

  it('kritik küçük metin renklerini gerçek yüzeylerinde WCAG AA kontrastında tutar', () => {
    const tokens = projectFile('src/ui/tokens.css');
    const shellCss = projectFile('src/ui/shell/AppShell.css');
    const workbenchCss = projectFile('src/ui/workbench/Workbench.css');
    const tokenSource = JSON.parse(projectFile('spec/design_tokens.json')) as {
      color: {
        brass: { '700': string };
        semantic: { negativeOnDark: string; warningOnLight: string };
      };
    };

    expect(cssHexVariable(tokens, '--brass-700').toLowerCase())
      .toBe(tokenSource.color.brass['700'].toLowerCase());
    expect(cssHexVariable(tokens, '--negative-on-dark').toLowerCase())
      .toBe(tokenSource.color.semantic.negativeOnDark.toLowerCase());
    expect(cssHexVariable(tokens, '--warning-on-light').toLowerCase())
      .toBe(tokenSource.color.semantic.warningOnLight.toLowerCase());

    const cases = [
      {
        selector: '.marketStrip__change--down',
        css: shellCss,
        background: '--ink-700',
      },
      {
        selector: '.stageStrip__step--done',
        css: shellCss,
        background: '--stone-200',
      },
      {
        selector: '.stageStrip__step',
        css: shellCss,
        background: '--stone-200',
      },
      {
        selector: '.impact__value--warning',
        css: workbenchCss,
        background: '--stone-50',
      },
      {
        selector: '.dock__disabledReason',
        css: shellCss,
        background: '--stone-50',
      },
    ];

    for (const item of cases) {
      const foreground = cssHexVariable(tokens, selectorColorVariable(item.css, item.selector));
      const background = cssHexVariable(tokens, item.background);
      expect(contrastRatio(foreground, background), item.selector).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('dar ekran, yatay görünüm ve kayan ray güvenlik ağlarını korur', () => {
    const shellCss = projectFile('src/ui/shell/AppShell.css');
    const screensCss = projectFile('src/ui/screens/Screens.css');
    const shop = projectFile('src/ui/screens/ShopScreen.tsx');

    expect(shellCss).toContain('@media (max-width: 430px)');
    expect(shellCss).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(shellCss).toMatch(
      /@media \(max-width: 430px\)[\s\S]*?\.statusStrip__clock\s*\{[\s\S]*?grid-template-columns:\s*max-content max-content;[\s\S]*?\.statusStrip__time\s*\{[\s\S]*?grid-column:\s*1 \/ -1;/,
    );
    expect(shellCss).toContain('@media (orientation: landscape) and (max-height: 520px)');
    expect(shellCss).toContain('flex-direction: column;');
    expect(screensCss).toContain('.horizontalRailCue');
    expect(screensCss).toContain('scroll-snap-type: x proximity');
    expect(shop).toMatch(
      /className="toolRailSlot"[\s\S]*?<ContextualToolRail[\s\S]*?<RushFab/,
    );
    /* Kuyrukta ray bileşeni null olsa da dış slotun kalması asıl regresyon korumasıdır. */
    expect(shop).toContain('if (s.queue.length > 0) return null;');
    expect(shellCss).toMatch(
      /\.toolRailSlot\s*\{[\s\S]*?flex:\s*0 0 var\(--h-tool-rail\);/,
    );
    expect(shellCss).toMatch(
      /\.toolRailSlot\s*\{[\s\S]*?min-height:\s*var\(--h-tool-rail\);/,
    );
    expect(shellCss).toMatch(
      /\.toolRailSlot > \.rushFabAnchor\s*\{[\s\S]*?position:\s*absolute;/,
    );
  });

  it('gerçek iPhone portresinde pazarlık kararlarını kaydırmadan gösterir', () => {
    const tokens = projectFile('src/ui/tokens.css');
    const shellCss = projectFile('src/ui/shell/AppShell.css');
    const workbenchCss = projectFile('src/ui/workbench/Workbench.css');
    const shop = projectFile('src/ui/screens/ShopScreen.tsx');

    expect(tokens).toContain('@media (max-height: 820px)');
    expect(tokens).toMatch(/--h-tool-rail:\s*52px/);
    expect(shellCss).toMatch(
      /@media \(max-width: 430px\)[\s\S]*?\.statusStrip\s*\{[\s\S]*?overflow-x:\s*clip;/,
    );
    expect(workbenchCss).toMatch(
      /@media \(orientation: portrait\) and \(max-height: 820px\)[\s\S]*?\.negotiate\s*\{[\s\S]*?overflow-y:\s*hidden;/,
    );
    expect(workbenchCss).toMatch(
      /@media \(orientation: portrait\) and \(max-height: 820px\)[\s\S]*?\.refPanel\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\);/,
    );
    expect(workbenchCss).toMatch(
      /\.history,[\s\S]*?\.moveStrip\s*\{\s*display:\s*none;/,
    );
    expect(workbenchCss).toMatch(
      /@media \(orientation: portrait\) and \(max-height: 620px\)[\s\S]*?\.negotiate\s*\{[\s\S]*?overflow-y:\s*auto;/,
    );
    expect(shop).toContain('<div className="appraisalInspect">');
    expect(workbenchCss).toMatch(
      /\.appraisalInspect\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?overflow:\s*hidden;/,
    );
    expect(workbenchCss).toMatch(
      /@media \(orientation: portrait\) and \(max-height: 820px\)[\s\S]*?\.appraisalInspect \.inspect__fields\s*\{[\s\S]*?overflow:\s*hidden;/,
    );
  });

  it('ayarlar başlığı ve kapatma eylemi dışında yalnız içerik kayar', () => {
    const settings = projectFile('src/ui/shell/SettingsDialog.tsx');
    const shellCss = projectFile('src/ui/shell/AppShell.css');

    expect(settings).toContain('className="settingsBox__scroll"');
    expect(shellCss).toMatch(/\.settingsBox__scroll\s*\{[\s\S]*?overflow-y:\s*auto;/);
    expect(shellCss).toMatch(/\.settingsBox\s*\{[\s\S]*?overflow:\s*hidden;/);
  });

  it('her page__scroll bölgesi etiketli, klavyeyle kaydırılabilir ve görünür odaklıdır', () => {
    const screensDir = fileURLToPath(new URL('./screens/', import.meta.url));
    const sources = readdirSync(screensDir)
      .filter((name) => name.endsWith('.tsx'))
      .map((name) => readFileSync(`${screensDir}/${name}`, 'utf8'));
    const declaredRegionCount = sources.reduce(
      (count, source) => count + (source.match(/className="page__scroll"/g) ?? []).length,
      0,
    );
    const regions = sources.flatMap((source) =>
      (source.match(/<div\b[^>]*\bclassName="page__scroll"[^>]*>/g) ?? [])
        .map((opening) => ({ opening, source })),
    );

    expect(declaredRegionCount).toBeGreaterThan(0);
    expect(regions).toHaveLength(declaredRegionCount);
    const titleIds: string[] = [];
    for (const { opening, source } of regions) {
      expect(opening).toContain('role="region"');
      expect(opening).toContain('tabIndex={0}');
      const titleId = opening.match(/aria-labelledby="([^"]+)"/)?.[1];
      expect(titleId).toBeTruthy();
      titleIds.push(titleId!);
      expect(source.match(new RegExp(`id="${titleId}"`, 'g'))).toHaveLength(1);
      expect(source).toMatch(new RegExp(`<h1\\b[^>]*\\bid="${titleId}"[^>]*>`));
    }
    expect(new Set(titleIds).size).toBe(titleIds.length);

    const screensCss = projectFile('src/ui/screens/Screens.css');
    expect(screensCss).toMatch(/\.page__scroll:focus-visible\s*\{[\s\S]*?outline:/);
  });

  it('tüm özel modallar odağı tutar ve arka planı etkisizleştirir', () => {
    const shop = projectFile('src/ui/screens/ShopScreen.tsx');
    const market = projectFile('src/ui/screens/MarketPlaceholderScreen.tsx');
    const settings = projectFile('src/ui/shell/SettingsDialog.tsx');
    const profile = projectFile('src/ui/shell/ProfileDialog.tsx');
    const app = projectFile('src/ui/App.tsx');
    const modalSurface = projectFile('src/ui/useModalSurface.ts');

    expect(modalSurface).toContain('if (!active) return;');
    expect(modalSurface).toContain("if (event.key === 'Escape')");
    expect(modalSurface).toContain('if (closeOnEscapeRef.current) onCloseRef.current()');
    expect(modalSurface).toContain("if (event.key !== 'Tab') return;");
    expect(modalSurface).toContain("document.addEventListener('keydown', onKeyDown, true)");
    expect(modalSurface).toContain('sibling.inert = true');
    expect(modalSurface).toContain("sibling.setAttribute('aria-hidden', 'true')");
    expect(modalSurface).toMatch(
      /restoreOutside\(\);\s*if \(previousFocus\?\.isConnected\) previousFocus\.focus/,
    );
    expect(modalSurface).toContain('previousFocus.focus({ preventScroll: true })');
    expect(shop.match(/useModalSurface\(onClose\)/g)).toHaveLength(2);
    expect(shop.match(/ref=\{dialogRef\}/g)).toHaveLength(2);
    expect(shop.match(/ref=\{initialFocusRef\}/g)).toHaveLength(2);
    expect(shop.match(/tabIndex=\{-1\}/g)).toHaveLength(2);
    expect(market).toContain('function MarketPurchaseDialog');
    expect(market).toContain('useModalSurface(onClose)');
    expect(market).toContain('ref={dialogRef}');
    expect(market).toContain('ref={initialFocusRef}');
    expect(market).toContain('tabIndex={-1}');
    expect(settings).toContain('useModalSurface<HTMLDivElement>');
    expect(settings).toContain('{ active: open }');
    expect(settings).toContain('ref={dialogRef}');
    expect(settings).toContain('ref={initialFocusRef}');
    expect(settings).toContain('tabIndex={-1}');
    expect(profile).toContain('useModalSurface<');
    expect(profile).toContain('HTMLInputElement');
    expect(profile).toContain('{ closeOnEscape: !welcome }');
    expect(profile).toContain('ref={dialogRef}');
    expect(profile).toContain('ref={nameRef}');
    expect(profile).toContain('if (!welcome && e.target === e.currentTarget) onCancel()');
    expect(profile).toContain('tabIndex={-1}');
    expect(app).toContain('const settingsOpen = useGame((s) => s.settingsOpen)');
    expect(app).toMatch(
      /!profileSetupDone \? \([\s\S]*?mode="welcome"[\s\S]*?: profileOpen \? \([\s\S]*?: settingsOpen \? \([\s\S]*?<SettingsDialog \/>/,
    );
  });

  it('kısa yatay ekranda aktif dock kararlarını tek görünür sıraya böler', () => {
    const dock = projectFile('src/ui/shell/DecisionDock.tsx');
    const shellCss = projectFile('src/ui/shell/AppShell.css');
    const workbenchCss = projectFile('src/ui/workbench/Workbench.css');

    expect(dock).toContain("actions.length === 2 ? 'dock--twoSecondary' : ''");
    expect(dock).toContain("hasContent ? 'dock--withContent' : ''");
    expect(dock).toContain('className="dock__content"');
    expect(shellCss).toMatch(
      /\.dock:not\(\.dock--idle\)\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:/,
    );
    expect(shellCss).toMatch(
      /\.dock--twoSecondary:not\(\.dock--idle\) > \.dock__secondaryRow\s*\{[\s\S]*?grid-column:\s*2;/,
    );
    expect(shellCss).toMatch(
      /\.dock--withContent:not\(\.dock--idle\) > \.dock__content\s*\{[\s\S]*?grid-column:\s*1;/,
    );
    expect(workbenchCss).toMatch(
      /\.dock--withContent \.offer\s*\{[\s\S]*?display:\s*grid;/,
    );
  });
});
