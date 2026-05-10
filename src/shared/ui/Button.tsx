import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@shared/lib/cn';

/**
 * Per §4.5:
 *   - rectangular, subtle 2px corner radius (or 0 for primary)
 *   - no gradients, no scale-on-hover
 *   - press state = slight inset shadow
 *   - primary = solid orange on ink; secondary = ink outline; ghost = no border, underline on hover
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render as a child element via Radix Slot. Useful for `<Link>` interop. */
  asChild?: boolean;
  /** Inline icon, rendered before children. Lucide icons typically. */
  leadingIcon?: ReactNode;
  /** Inline icon, rendered after children. */
  trailingIcon?: ReactNode;
  /** Show a loading state — disables the button and renders a tick mark. */
  isLoading?: boolean;
}

const BASE = [
  'inline-flex items-center justify-center gap-2',
  'font-display uppercase tracking-[0.18em]',
  'transition-colors duration-[120ms]',
  'select-none',
  'disabled:opacity-40 disabled:cursor-not-allowed',
  'focus-visible:outline-none', // focus ring comes from :focus-visible on body
  'active:shadow-[inset_0_2px_0_0_rgba(0,0,0,0.18)]',
].join(' ');

const VARIANTS: Record<ButtonVariant, string> = {
  primary: [
    'bg-accent text-[color:var(--color-accent-ink)]',
    'hover:bg-[color-mix(in_srgb,var(--color-accent),black_8%)]',
    'rounded-none',
  ].join(' '),
  secondary: [
    'border border-ink text-ink bg-transparent',
    'hover:bg-ink hover:text-bg',
    'rounded-[2px]',
  ].join(' '),
  ghost: [
    'text-ink bg-transparent',
    'hover:underline underline-offset-[6px] decoration-[1.5px]',
    'rounded-[2px]',
  ].join(' '),
  destructive: [
    'bg-danger text-bg',
    'hover:bg-[color-mix(in_srgb,var(--color-danger),black_10%)]',
    'rounded-none',
  ].join(' '),
};

const SIZES: Record<ButtonSize, string> = {
  // Per §4.8, mobile tap target ≥ 44×44.
  sm: 'min-h-[40px] px-3 text-xs',
  md: 'min-h-[44px] px-5 text-sm',
  lg: 'min-h-[52px] px-7 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    asChild = false,
    leadingIcon,
    trailingIcon,
    isLoading = false,
    disabled,
    className,
    children,
    type,
    ...props
  },
  ref,
) {
  const Comp = asChild ? Slot : 'button';
  const finalClassName = cn(BASE, VARIANTS[variant], SIZES[size], className);

  // When `asChild`, the consumer's element receives our props; we can't pass
  // `type` or `disabled` because the child may be an <a>. Just render content.
  if (asChild) {
    return (
      <Comp ref={ref} className={finalClassName} {...props}>
        {renderContent({ leadingIcon, trailingIcon, isLoading, children })}
      </Comp>
    );
  }

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      disabled={disabled ?? isLoading}
      aria-busy={isLoading || undefined}
      className={finalClassName}
      {...props}
    >
      {renderContent({ leadingIcon, trailingIcon, isLoading, children })}
    </button>
  );
});

function renderContent(args: {
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  isLoading: boolean;
  children?: ReactNode;
}): ReactNode {
  const { leadingIcon, trailingIcon, isLoading, children } = args;
  return (
    <>
      {isLoading ? <LoadingTick /> : leadingIcon}
      <span>{children}</span>
      {!isLoading && trailingIcon ? trailingIcon : null}
    </>
  );
}

function LoadingTick() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-2 w-2 animate-pulse bg-current"
    />
  );
}
