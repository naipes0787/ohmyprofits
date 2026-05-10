import { isRouteErrorResponse, useRouteError } from 'react-router';

/**
 * Route-level error boundary. Renders a designed error state, not a stack
 * trace. Per §1.3 every list/detail screen must implement loading, empty,
 * error, and offline states; this is the global fallback.
 */
export function RouteError() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const message = isRouteErrorResponse(error)
    ? (error.statusText ?? error.data)
    : 'Something broke on our end.';

  return (
    <div className="px-6 py-16 md:px-10 md:py-24">
      <p className="text-ink-muted font-mono text-xs uppercase tracking-[0.3em]">
        {status} — Error
      </p>
      <h1 className="mt-4 max-w-3xl">Well, that wasn&rsquo;t in the script.</h1>
      <p className="text-ink-muted mt-4 max-w-prose">{String(message)}</p>
      <a
        href="/"
        className="bg-ink text-bg mt-10 inline-block px-5 py-3 font-display text-sm uppercase tracking-[0.18em]"
      >
        Back to safety
      </a>
    </div>
  );
}
