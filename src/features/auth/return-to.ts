/**
 * Return-to helpers. Per §3.1, the post-login redirect is validated as a
 * relative path only — never an absolute URL or scheme. This stops an
 * attacker from sending users to /login?next=https://evil.example.
 */

export function isSafeReturnTo(value: string | null | undefined): value is string {
  if (!value) return false;
  if (value === '/') return true;
  // Must start with a single forward slash.
  if (!value.startsWith('/')) return false;
  // Reject protocol-relative URLs and backslash tricks.
  if (value.startsWith('//') || value.startsWith('/\\')) return false;
  // Reject scheme-bearing strings — already filtered by the leading-slash
  // check, but defense in depth in case the input is decoded later.
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  // Reject any whitespace or ASCII control character (\x00-\x1F + DEL).
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) return false;
  }
  return true;
}

export function readReturnTo(search: string): string | undefined {
  const params = new URLSearchParams(search);
  const raw = params.get('next');
  return isSafeReturnTo(raw) ? raw : undefined;
}

export function buildLoginUrl(currentPath: string): string {
  if (!isSafeReturnTo(currentPath) || currentPath === '/login') return '/login';
  const params = new URLSearchParams({ next: currentPath });
  return `/login?${params.toString()}`;
}
