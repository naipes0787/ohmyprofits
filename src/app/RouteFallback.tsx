/**
 * Loading fallback for route-level Suspense. Deliberate, not a spinner-only
 * blank — see §1.3.
 */
export function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="px-6 py-12 md:px-10 md:py-16"
    >
      <p className="text-ink-muted text-xs uppercase tracking-[0.24em]">
        Loading
      </p>
      <div className="mt-4 h-2 w-40 overflow-hidden bg-surface-sunk">
        <div className="bg-accent h-full w-1/3 animate-pulse" />
      </div>
    </div>
  );
}
