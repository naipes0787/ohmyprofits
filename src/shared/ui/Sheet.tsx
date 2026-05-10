import { forwardRef, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@shared/lib/cn';

/**
 * Per §4.5: on mobile, all modals are bottom sheets with a drag handle.
 * On desktop, side drawers from the right for create/edit; centered modal
 * only for destructive confirmation.
 *
 * Implementation: a single Radix Dialog with responsive Tailwind classes that
 * morph it from bottom-sheet (mobile) to right-drawer (desktop). The
 * "destructive confirmation" use case is exposed as <ConfirmDialog />.
 */

export const SheetRoot = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

const OVERLAY = [
  'fixed inset-0 z-50',
  'bg-[color:var(--color-ink)]/45',
  'data-[state=open]:animate-in data-[state=open]:fade-in-0',
  'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
].join(' ');

const PANEL_BASE = [
  'fixed z-50 bg-surface text-ink',
  'flex flex-col',
  'shadow-[0_-12px_32px_-16px_rgba(0,0,0,0.45)] md:shadow-[-12px_0_32px_-16px_rgba(0,0,0,0.45)]',
  'focus:outline-none',
  // mobile = bottom sheet
  'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[6px]',
  // desktop = right drawer, full height
  'md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:rounded-none md:rounded-l-[6px]',
  'md:w-[min(560px,100vw)]',
  // motion
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
  'md:data-[state=open]:slide-in-from-right md:data-[state=closed]:slide-out-to-right',
  'duration-[220ms]',
].join(' ');

interface SheetContentProps extends Dialog.DialogContentProps {
  /** The visible heading. Required for a11y — passed to Dialog.Title. */
  title: string;
  /** Optional descriptive subhead. */
  description?: string;
  /** Hide the heading visually but keep it for screen readers. */
  hideTitle?: boolean;
  children: ReactNode;
  /** Footer slot (e.g. submit/cancel). Pinned to the bottom. */
  footer?: ReactNode;
}

export const SheetContent = forwardRef<HTMLDivElement, SheetContentProps>(
  function SheetContent(
    { title, description, hideTitle, children, footer, className, ...props },
    ref,
  ) {
    return (
      <Dialog.Portal>
        <Dialog.Overlay className={OVERLAY} />
        <Dialog.Content ref={ref} className={cn(PANEL_BASE, className)} {...props}>
          {/* Mobile drag handle — purely decorative. */}
          <div className="flex justify-center pt-3 md:hidden" aria-hidden="true">
            <span className="bg-line-strong h-1 w-12 rounded-full" />
          </div>

          <header className="border-line flex items-start justify-between gap-4 border-b px-6 py-5 md:px-8 md:py-6">
            <div className={cn(hideTitle && 'sr-only')}>
              <Dialog.Title className="font-display text-step-2 leading-tight uppercase tracking-tight">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="text-ink-muted mt-1 text-sm">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              className="text-ink-muted hover:text-ink -m-2 p-2 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8">
            {children}
          </div>

          {footer ? (
            <footer className="border-line flex items-center justify-end gap-3 border-t px-6 py-4 md:px-8">
              {footer}
            </footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    );
  },
);

/**
 * Centered destructive confirmation dialog. Used for delete actions per §4.5.
 */
const CONFIRM_PANEL = [
  'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
  'w-[min(440px,calc(100vw-32px))]',
  'bg-surface text-ink',
  'shadow-[0_24px_48px_-16px_rgba(0,0,0,0.55)]',
  'data-[state=open]:animate-in data-[state=closed]:animate-out',
  'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
  'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
  'duration-[180ms]',
  'focus:outline-none',
].join(' ');

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const {
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    cancelLabel = 'Cancel',
    onConfirm,
    destructive = true,
    isLoading,
  } = props;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={OVERLAY} />
        <Dialog.Content className={CONFIRM_PANEL}>
          <div className="px-7 py-7">
            <Dialog.Title className="font-display text-step-2 leading-tight uppercase tracking-tight">
              {title}
            </Dialog.Title>
            <Dialog.Description className="text-ink-muted mt-3 text-sm">
              {description}
            </Dialog.Description>
          </div>
          <footer className="border-line flex items-center justify-end gap-3 border-t px-7 py-4">
            <Dialog.Close
              className="text-ink hover:underline underline-offset-[6px] decoration-[1.5px] font-display text-xs uppercase tracking-[0.18em] px-2 py-2"
            >
              {cancelLabel}
            </Dialog.Close>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                void onConfirm();
              }}
              className={cn(
                'font-display min-h-[44px] px-5 text-sm uppercase tracking-[0.18em]',
                'transition-colors duration-[120ms]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                destructive
                  ? 'bg-danger text-bg hover:bg-[color-mix(in_srgb,var(--color-danger),black_10%)]'
                  : 'bg-ink text-bg',
              )}
            >
              {confirmLabel}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
