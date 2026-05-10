import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@shared/lib/cn';

/**
 * Per §4.5:
 *   - low-chrome — bottom border only on mobile, full bordered on desktop
 *   - focus ring uses --accent-2
 *   - error state shifts bottom border to --danger and surfaces a single-line message
 *
 * Per §4.8 a11y:
 *   - all forms label-associated
 *   - errors announced via aria-live="polite"
 *   - 44×44 tap targets on mobile
 */

interface FieldRootProps {
  label: string;
  htmlFor?: string | undefined;
  hint?: string | undefined;
  error?: string | undefined;
  /** Hide the label visually but keep it for screen readers. */
  hideLabel?: boolean | undefined;
  optional?: boolean | undefined;
  children: ReactNode;
  className?: string | undefined;
}

/**
 * Standalone field wrapper for cases where the input element isn't an Input/
 * Textarea (e.g. native <select> or a custom Radix Select trigger). Most
 * consumers will use the Input/Textarea components which embed a Field.
 */
export function Field(props: FieldRootProps) {
  const {
    label,
    htmlFor,
    hint,
    error,
    hideLabel,
    optional,
    children,
    className,
  } = props;
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const hintId = htmlFor && hint ? `${htmlFor}-hint` : undefined;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        className={cn(
          'flex items-baseline justify-between',
          hideLabel && 'sr-only',
        )}
      >
        <label
          htmlFor={htmlFor}
          className="text-ink font-mono text-xs uppercase tracking-[0.24em]"
        >
          {label}
        </label>
        {optional ? (
          <span className="text-ink-muted font-mono text-[10px] uppercase tracking-[0.24em]">
            Optional
          </span>
        ) : null}
      </div>

      {children}

      {error ? (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-danger font-mono text-xs"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-ink-muted text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const INPUT_BASE = [
  'w-full bg-transparent text-ink',
  'min-h-[44px] py-2',
  'border-line border-b md:border md:px-3',
  'placeholder:text-ink-muted',
  'focus:outline-none focus:border-accent-2',
  'transition-colors duration-[120ms]',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

const INPUT_ERROR = 'border-danger md:border-danger focus:border-danger';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | undefined;
  hideLabel?: boolean;
  optional?: boolean;
  /** Treat as a numeric column — apply tabular-nums + monospace. */
  numeric?: boolean;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id,
    label,
    hint,
    error,
    hideLabel,
    optional,
    numeric,
    className,
    containerClassName,
    ...props
  },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const errorId = `${inputId}-error`;
  const hintId = hint ? `${inputId}-hint` : undefined;

  return (
    <Field
      label={label}
      htmlFor={inputId}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      optional={optional}
      className={containerClassName}
    >
      <input
        id={inputId}
        ref={ref}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={
          [error ? errorId : null, hintId].filter(Boolean).join(' ') || undefined
        }
        className={cn(
          INPUT_BASE,
          error && INPUT_ERROR,
          numeric && 'tnum',
          className,
        )}
        {...props}
      />
    </Field>
  );
});

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string | undefined;
  hideLabel?: boolean;
  optional?: boolean;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      id,
      label,
      hint,
      error,
      hideLabel,
      optional,
      className,
      containerClassName,
      rows = 4,
      ...props
    },
    ref,
  ) {
    const reactId = useId();
    const inputId = id ?? reactId;
    const errorId = `${inputId}-error`;
    const hintId = hint ? `${inputId}-hint` : undefined;

    return (
      <Field
        label={label}
        htmlFor={inputId}
        hint={hint}
        error={error}
        hideLabel={hideLabel}
        optional={optional}
        className={containerClassName}
      >
        <textarea
          id={inputId}
          ref={ref}
          rows={rows}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            [error ? errorId : null, hintId].filter(Boolean).join(' ') ||
            undefined
          }
          className={cn(
            INPUT_BASE,
            'resize-y leading-relaxed',
            error && INPUT_ERROR,
            className,
          )}
          {...props}
        />
      </Field>
    );
  },
);
