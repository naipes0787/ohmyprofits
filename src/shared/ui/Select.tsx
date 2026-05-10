import {
  forwardRef,
  useId,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@shared/lib/cn';
import { Field } from './Field';

/**
 * Radix-backed Select styled to the Kirken direction. The trigger uses the
 * same low-chrome treatment as Input. Items are uppercase mono in the dropdown
 * to echo brewery batch stamp typography.
 */

export interface SelectItem {
  value: string;
  label: string;
  description?: string | undefined;
  disabled?: boolean | undefined;
}

export interface SelectProps {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  hideLabel?: boolean | undefined;
  optional?: boolean | undefined;
  items: ReadonlyArray<SelectItem>;
  value?: string | undefined;
  defaultValue?: string | undefined;
  onValueChange?: ((value: string) => void) | undefined;
  placeholder?: string | undefined;
  disabled?: boolean | undefined;
  /** Sets `name` on a hidden input so RHF / native forms can read the value. */
  name?: string | undefined;
  id?: string | undefined;
  required?: boolean | undefined;
}

const TRIGGER_BASE = [
  'group/select w-full bg-transparent text-ink',
  'min-h-[44px] py-2',
  'border-line border-b md:border md:px-3',
  'inline-flex items-center justify-between gap-3',
  'data-[placeholder]:text-ink-muted',
  'focus:outline-none focus:border-accent-2',
  'data-[state=open]:border-accent-2',
  'transition-colors duration-[120ms]',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    label,
    hint,
    error,
    hideLabel,
    optional,
    items,
    value,
    defaultValue,
    onValueChange,
    placeholder = 'Select…',
    disabled,
    name,
    id,
    required,
  },
  ref,
) {
  const reactId = useId();
  const triggerId = id ?? reactId;
  const errorId = `${triggerId}-error`;

  return (
    <Field
      label={label}
      htmlFor={triggerId}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      optional={optional}
    >
      <RadixSelect.Root
        {...(value !== undefined && { value })}
        {...(defaultValue !== undefined && { defaultValue })}
        {...(onValueChange !== undefined && { onValueChange })}
        {...(disabled !== undefined && { disabled })}
        {...(name !== undefined && { name })}
        {...(required !== undefined && { required })}
      >
        <RadixSelect.Trigger
          ref={ref}
          id={triggerId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(TRIGGER_BASE, error && 'border-danger md:border-danger')}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown
              aria-hidden="true"
              className="text-ink-muted h-4 w-4 transition-transform group-data-[state=open]/select:rotate-180"
              strokeWidth={1.5}
            />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            className={cn(
              'border-line bg-surface text-ink z-50 min-w-[var(--radix-select-trigger-width)] border',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0',
              'shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]',
            )}
          >
            <RadixSelect.Viewport className="p-1">
              {items.map((item) => (
                <SelectOption key={item.value} item={item} />
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </Field>
  );
});

function SelectOption({ item }: { item: SelectItem }) {
  return (
    <RadixSelect.Item
      value={item.value}
      {...(item.disabled !== undefined && { disabled: item.disabled })}
      className={cn(
        'relative flex cursor-pointer items-start gap-3 px-3 py-2.5',
        'font-display text-sm uppercase tracking-[0.16em]',
        'data-[highlighted]:bg-ink data-[highlighted]:text-bg',
        'data-[highlighted]:outline-none',
        'data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed',
      )}
    >
      <span className="flex w-4 shrink-0 items-center justify-center pt-0.5">
        <RadixSelect.ItemIndicator>
          <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        </RadixSelect.ItemIndicator>
      </span>
      <span className="flex flex-col">
        <RadixSelect.ItemText>{item.label}</RadixSelect.ItemText>
        {item.description ? (
          <span className="text-ink-muted mt-0.5 font-body text-[11px] normal-case tracking-normal">
            {item.description}
          </span>
        ) : null}
      </span>
    </RadixSelect.Item>
  );
}

/**
 * Bare trigger / content / item exports for the rare custom case (e.g. when
 * the dropdown content needs to render arbitrary JSX, not items[]). Most
 * consumers should use <Select /> above.
 */
export const SelectRoot = RadixSelect.Root;
export const SelectTrigger = RadixSelect.Trigger;
export const SelectValue = RadixSelect.Value;
export const SelectContent: typeof RadixSelect.Content = forwardRef(
  function SelectContent({ className, children, ...props }, ref) {
    return (
      <RadixSelect.Portal>
        <RadixSelect.Content
          ref={ref}
          position="popper"
          sideOffset={6}
          className={cn(
            'border-line bg-surface text-ink z-50 border shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]',
            className,
          )}
          {...props}
        >
          <RadixSelect.Viewport className="p-1">
            {children}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    );
  },
) as typeof RadixSelect.Content;

export interface RawSelectItemProps
  extends ComponentPropsWithoutRef<typeof RadixSelect.Item> {
  children: ReactNode;
}

export const SelectItemComponent = forwardRef<HTMLDivElement, RawSelectItemProps>(
  function SelectItemComponent({ className, children, ...props }, ref) {
    return (
      <RadixSelect.Item
        ref={ref}
        className={cn(
          'relative flex cursor-pointer items-center gap-3 px-3 py-2.5',
          'font-display text-sm uppercase tracking-[0.16em]',
          'data-[highlighted]:bg-ink data-[highlighted]:text-bg',
          'data-[highlighted]:outline-none',
          'data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed',
          className,
        )}
        {...props}
      >
        <RadixSelect.ItemIndicator className="flex w-4 items-center">
          <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        </RadixSelect.ItemIndicator>
        <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      </RadixSelect.Item>
    );
  },
);
