import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { applyTheme, type Theme } from '@shared/lib/theme';

/**
 * Global UI state — theme, currency, sidebar collapsed.
 * Per §2.4 this is the ONLY Zustand store; all data lives in React Query.
 *
 * `client-localstorage-schema`: persisted under a versioned key so a later
 * shape change can ship a `migrate` step without wiping user prefs.
 */

interface UiState {
  theme: Theme;
  currency: string; // ISO 4217
  sidebarCollapsed: boolean;
  setTheme: (theme: Theme) => void;
  setCurrency: (code: string) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      currency: 'USD',
      sidebarCollapsed: false,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      setCurrency: (currency) => set({ currency }),
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: 'omp.ui.v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        theme: s.theme,
        currency: s.currency,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    },
  ),
);
