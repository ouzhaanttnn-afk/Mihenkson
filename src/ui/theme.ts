import type { PlayerPreferences } from '@domain/preferences';

export function resolveTheme(theme: PlayerPreferences['theme'], systemDark: boolean): 'classic' | 'light' | 'dark' {
  return theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
}

export function watchTheme(theme: PlayerPreferences['theme']): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = () => {
    const resolved = resolveTheme(theme, media.matches);
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved === 'classic' ? 'dark' : resolved;
  };
  apply();
  media.addEventListener('change', apply);
  return () => media.removeEventListener('change', apply);
}
