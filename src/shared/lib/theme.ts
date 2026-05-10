/**
 * Theme application. The `ui-store` (Zustand, versioned per
 * `client-localstorage-schema`) persists the user's preference. We mirror the
 * value to a `<html class="theme-…">` so CSS doesn't depend on JS booting.
 */

export type Theme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'omp.ui.v1';

interface PersistedShape {
  state?: { theme?: Theme };
  version?: number;
}

function readStoredTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'system';
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 'system';
    const parsed = JSON.parse(raw) as PersistedShape;
    const t = parsed.state?.theme;
    return t === 'light' || t === 'dark' || t === 'system' ? t : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');
  if (theme === 'light') root.classList.add('theme-light');
  else if (theme === 'dark') root.classList.add('theme-dark');
}

export function applyStoredTheme(): void {
  if (typeof document === 'undefined') return;
  applyTheme(readStoredTheme());
}
