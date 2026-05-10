import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import * as RadixToast from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { cn } from '@shared/lib/cn';
import {
  ToastContext,
  type ToastContextValue,
  type ToastInput,
  type ToastTone,
} from './toast-context';

/**
 * Radix Toast wrapper used for the §1.3 "Offline" indicator and the §5
 * service-worker "update available" banner. Stays decidedly low-chrome —
 * a thin top border keyed to the tone, mono caps eyebrow, ink body.
 *
 * The hook lives in [`@shared/hooks/use-toast`](../hooks/use-toast.ts) to keep
 * this file as a pure component module (`react-refresh/only-export-components`).
 */

interface ToastItem extends ToastInput {
  id: number;
}

const TONES: Record<ToastTone, string> = {
  neutral: 'border-t-line-strong',
  positive: 'border-t-positive',
  warning: 'border-t-warning',
  danger: 'border-t-danger',
  info: 'border-t-[color:var(--color-accent-2)]',
};

const TONE_EYEBROW: Record<ToastTone, string> = {
  neutral: 'text-ink-muted',
  positive: 'text-positive',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-[color:var(--color-accent-2)]',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((curr) => curr.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((toast: ToastInput): number => {
    const id = ++idRef.current;
    setItems((curr) => [...curr, { ...toast, id }]);
    return id;
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ push, dismiss }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider swipeDirection="right" duration={5000}>
        {children}
        {items.map((item) => (
          <ToastView key={item.id} item={item} onClose={() => dismiss(item.id)} />
        ))}
        <RadixToast.Viewport
          className={cn(
            'fixed z-[60] flex flex-col gap-2 outline-none',
            'right-4 bottom-[calc(env(safe-area-inset-bottom)+72px)] left-4',
            'md:bottom-6 md:left-auto md:w-[380px]',
          )}
        />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

function ToastView({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const tone = item.tone ?? 'neutral';
  return (
    <RadixToast.Root
      {...(item.duration !== undefined && { duration: item.duration })}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className={cn(
        'bg-surface text-ink border-line border border-t-[3px]',
        'flex items-start gap-3 px-4 py-3',
        'shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]',
        'data-[state=open]:animate-in data-[state=open]:slide-in-from-right-4',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
        'data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform',
        'data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right',
        TONES[tone],
      )}
    >
      <div className="min-w-0 flex-1">
        <RadixToast.Title
          className={cn(
            'font-mono text-[10px] uppercase tracking-[0.24em]',
            TONE_EYEBROW[tone],
          )}
        >
          {item.title}
        </RadixToast.Title>
        {item.description ? (
          <RadixToast.Description className="text-ink mt-1 text-sm">
            {item.description}
          </RadixToast.Description>
        ) : null}
      </div>

      {item.action ? (
        <RadixToast.Action
          asChild
          altText={item.action.label}
          onClick={item.action.onClick}
        >
          <button
            type="button"
            className="font-display text-ink hover:text-accent shrink-0 text-xs uppercase tracking-[0.18em] underline-offset-[6px] hover:underline"
          >
            {item.action.label}
          </button>
        </RadixToast.Action>
      ) : null}

      <RadixToast.Close
        aria-label="Dismiss"
        className="text-ink-muted hover:text-ink -m-1 shrink-0 p-1 transition-colors"
      >
        <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      </RadixToast.Close>
    </RadixToast.Root>
  );
}
