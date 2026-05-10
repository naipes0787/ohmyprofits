import { describe, it, expect } from 'vitest';
import { isSafeReturnTo, readReturnTo, buildLoginUrl } from './return-to';

describe('isSafeReturnTo', () => {
  it('accepts root', () => {
    expect(isSafeReturnTo('/')).toBe(true);
  });

  it('accepts simple relative paths', () => {
    expect(isSafeReturnTo('/clients')).toBe(true);
    expect(isSafeReturnTo('/orders/abc-123')).toBe(true);
    expect(isSafeReturnTo('/products?new=1')).toBe(true);
  });

  it('rejects null/empty', () => {
    expect(isSafeReturnTo(null)).toBe(false);
    expect(isSafeReturnTo(undefined)).toBe(false);
    expect(isSafeReturnTo('')).toBe(false);
  });

  it('rejects absolute URLs', () => {
    expect(isSafeReturnTo('https://evil.example/clients')).toBe(false);
    expect(isSafeReturnTo('http://localhost:5173/clients')).toBe(false);
  });

  it('rejects protocol-relative URLs', () => {
    expect(isSafeReturnTo('//evil.example/x')).toBe(false);
  });

  it('rejects backslash-prefixed', () => {
    expect(isSafeReturnTo('\\\\evil')).toBe(false);
  });

  it('rejects scheme-only strings', () => {
    expect(isSafeReturnTo('javascript:alert(1)')).toBe(false);
    expect(isSafeReturnTo('data:text/html,foo')).toBe(false);
  });

  it('rejects values that do not start with a slash', () => {
    expect(isSafeReturnTo('clients')).toBe(false);
  });
});

describe('readReturnTo', () => {
  it('extracts a safe next param', () => {
    expect(readReturnTo('?next=/orders/abc')).toBe('/orders/abc');
  });

  it('drops an unsafe next param', () => {
    expect(readReturnTo('?next=https://evil.example')).toBeUndefined();
  });
});

describe('buildLoginUrl', () => {
  it('returns /login for unsafe paths', () => {
    expect(buildLoginUrl('https://evil.example')).toBe('/login');
  });

  it('returns /login when already at /login', () => {
    expect(buildLoginUrl('/login')).toBe('/login');
  });

  it('encodes the next param', () => {
    expect(buildLoginUrl('/orders?status=paid')).toBe(
      '/login?next=%2Forders%3Fstatus%3Dpaid',
    );
  });
});
