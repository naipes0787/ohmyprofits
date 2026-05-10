import { describe, it, expect } from 'vitest';
import { applyDiscount, formatMoney, lineExtended, money } from './money';

describe('money', () => {
  it('multiplies without float drift', () => {
    // The classic 0.1 * 0.2 trap.
    expect(lineExtended(0.1, '0.2').toString()).toBe('0.02');
  });

  it('keeps cents accurate at scale', () => {
    expect(lineExtended(7, '12.99').toString()).toBe('90.93');
  });

  it('applies percentage discount as a Decimal factor', () => {
    const subtotal = money('100.00');
    expect(applyDiscount(subtotal, 12.5).toString()).toBe('87.5');
  });

  it('returns subtotal untouched when discount <= 0', () => {
    const subtotal = money('42.50');
    expect(applyDiscount(subtotal, 0).toString()).toBe('42.5');
    expect(applyDiscount(subtotal, -10).toString()).toBe('42.5');
  });

  it('formats with the requested currency', () => {
    const formatted = formatMoney(1234.5, { currency: 'USD', locale: 'en-US' });
    expect(formatted).toContain('1,234.50');
  });
});
