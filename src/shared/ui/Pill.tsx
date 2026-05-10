import { type HTMLAttributes } from 'react';
import { cn } from '@shared/lib/cn';

/**
 * Status pill — per §4.5: all-caps mono, 10px, 1px solid border in the status
 * color, transparent fill. Looks like a brewery batch stamp, not a Bootstrap badge.
 */

export type PillTone =
  | 'neutral'
  | 'accent'
  | 'positive'
  | 'warning'
  | 'danger'
  | 'info';

const TONES: Record<PillTone, string> = {
  neutral: 'text-ink border-line-strong',
  accent: 'text-accent border-accent',
  info: 'text-[color:var(--color-accent-2)] border-[color:var(--color-accent-2)]',
  positive: 'text-positive border-positive',
  warning: 'text-warning border-warning',
  danger: 'text-danger border-danger',
};

export interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone;
}

export function Pill({ tone = 'neutral', className, children, ...props }: PillProps) {
  return (
    <span
      className={cn(
        'font-mono inline-flex items-center px-2 py-0.5',
        'text-[10px] uppercase tracking-[0.2em] leading-none',
        'border bg-transparent',
        TONES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Domain helpers — Order status & payment status. Living next to Pill so the
// tone mapping is a single source of truth.
// -----------------------------------------------------------------------------

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Delivered'
  | 'Cancelled';

export type PaymentStatus = 'Pending' | 'Paid' | 'Partial';

const ORDER_STATUS_TONE: Record<OrderStatus, PillTone> = {
  Pending: 'neutral',
  Confirmed: 'info',
  Processing: 'accent',
  Delivered: 'positive',
  Cancelled: 'danger',
};

const PAYMENT_STATUS_TONE: Record<PaymentStatus, PillTone> = {
  Pending: 'neutral',
  Paid: 'positive',
  Partial: 'warning',
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return <Pill tone={ORDER_STATUS_TONE[status]}>{status}</Pill>;
}

export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  return <Pill tone={PAYMENT_STATUS_TONE[status]}>{status}</Pill>;
}
