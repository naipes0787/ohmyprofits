/**
 * Service-worker registration + update bus.
 *
 * Why a tiny event bus rather than one global listener: we want both the
 * <UpdateBanner /> AND the (future) Account page to subscribe independently.
 * Workbox emits one onNeedRefresh per update; the bus fans it out.
 */
import { registerSW } from 'virtual:pwa-register';

export type SwUpdateState =
  | { state: 'idle' }
  | { state: 'available'; update: () => Promise<void> }
  | { state: 'offline-ready' };

type Listener = (s: SwUpdateState) => void;

const listeners = new Set<Listener>();
let current: SwUpdateState = { state: 'idle' };

function emit(next: SwUpdateState): void {
  current = next;
  for (const fn of listeners) fn(next);
}

export function onSwUpdate(fn: Listener): () => void {
  listeners.add(fn);
  // Replay current state so late subscribers don't miss the event.
  fn(current);
  return () => {
    listeners.delete(fn);
  };
}

export function getSwState(): SwUpdateState {
  return current;
}

let registered = false;

export function registerServiceWorker(): void {
  if (registered) return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  // E2E suite sets this so the runtime cache doesn't serve stale Supabase
  // responses to React Query during multi-step tests. No effect in normal
  // user sessions.
  if (window.localStorage?.getItem('omp.e2e.disable_sw') === '1') return;
  registered = true;

  const update = registerSW({
    immediate: false,
    onNeedRefresh() {
      emit({
        state: 'available',
        update: async () => {
          await update(true);
        },
      });
    },
    onOfflineReady() {
      emit({ state: 'offline-ready' });
    },
  });
}
