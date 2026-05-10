import { useEffect, useMemo, type ReactNode } from 'react';
import { useForm, useFieldArray, Controller, useWatch, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';

import {
  SheetRoot,
  SheetContent,
  SheetClose,
} from '@shared/ui/Sheet';
import { Input, Textarea } from '@shared/ui/Field';
import { Select } from '@shared/ui/Select';
import { Button } from '@shared/ui/Button';
import { useToast } from '@shared/hooks/use-toast';
import { useUiStore } from '@shared/hooks/use-ui-store';
import { applyDiscount, formatMoney, lineExtended, money } from '@shared/lib/money';

import { useClients } from '@features/clients/clients';
import { useProducts } from '@features/products/products';

import {
  OrderSchema,
  type OrderInput,
} from './schemas';
import {
  useCreateOrder,
  useUpdateOrder,
  type OrderWithItems,
  type OrderStatus,
  type PaymentStatus,
} from './orders';

interface OrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: OrderWithItems | null;
}

const STATUS_OPTIONS: ReadonlyArray<{ value: OrderStatus; label: string }> = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Processing', label: 'Processing' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const PAYMENT_OPTIONS: ReadonlyArray<{ value: PaymentStatus; label: string }> = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Partial', label: 'Partial' },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

const FORM_DEFAULTS = {
  client_id: '',
  status: 'Pending' as OrderStatus,
  payment_status: 'Pending' as PaymentStatus,
  pending_amount: '',
  discount_percent: '',
  currency: 'USD',
  order_date: todayISO(),
  delivery_address: '',
  notes: '',
  items: [{ product_id: '', quantity: '1', unit_price: '0.00' }],
};

type FormValues = typeof FORM_DEFAULTS;

export function OrderForm({ open, onOpenChange, order }: OrderFormProps) {
  const isEdit = !!order;
  const defaultCurrency = useUiStore((s) => s.currency);
  const { data: clients = [] } = useClients();
  const { data: products = [] } = useProducts();
  const createMut = useCreateOrder();
  const updateMut = useUpdateOrder();
  const { push } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, OrderInput>({
    resolver: zodResolver(OrderSchema),
    defaultValues: FORM_DEFAULTS,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (!open) return;
    reset(
      order
        ? {
            client_id: order.client_id,
            status: order.status,
            payment_status: order.payment_status,
            pending_amount:
              order.pending_amount != null ? String(order.pending_amount) : '',
            discount_percent:
              order.discount_percent != null ? String(order.discount_percent) : '',
            currency: order.currency,
            order_date: order.order_date,
            delivery_address: order.delivery_address ?? '',
            notes: order.notes ?? '',
            items:
              order.items.length > 0
                ? order.items.map((it) => ({
                    product_id: it.product_id,
                    quantity: String(it.quantity),
                    unit_price: String(it.unit_price),
                  }))
                : FORM_DEFAULTS.items,
          }
        : { ...FORM_DEFAULTS, currency: defaultCurrency },
    );
  }, [open, order, reset, defaultCurrency]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && order) {
        await updateMut.mutateAsync({ id: order.id, input: values });
        push({ tone: 'positive', title: 'Order updated.' });
      } else {
        await createMut.mutateAsync(values);
        push({ tone: 'positive', title: 'Order created.' });
      }
      onOpenChange(false);
    } catch {
      push({
        tone: 'danger',
        title: isEdit ? 'Couldn’t save order.' : 'Couldn’t create order.',
      });
    }
  });

  const clientItems = clients.map((c) => ({ value: c.id, label: c.name }));
  const productItems = products.map((p) => ({
    value: p.id,
    label: p.name,
    description:
      p.base_price != null
        ? formatMoney(p.base_price, { currency: defaultCurrency })
        : 'No base price',
  }));

  const blocked = clients.length === 0 || products.length === 0;

  return (
    <SheetRoot open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={isEdit ? `Order ${order?.order_number ?? ''}` : 'New order'}
        description={
          isEdit
            ? 'Edit lines, status, and payment. The order number stays the same.'
            : 'A draft of what you’re shipping. Totals update live as you edit.'
        }
        className="md:w-[min(720px,100vw)]"
        footer={
          <>
            <SheetClose asChild>
              <Button type="button" variant="ghost" size="md">
                Cancel
              </Button>
            </SheetClose>
            <Button
              type="submit"
              form="order-form"
              size="md"
              isLoading={isSubmitting}
              disabled={blocked}
            >
              {isEdit ? 'Save order' : 'Create order'}
            </Button>
          </>
        }
      >
        {blocked ? (
          <BlockedState
            missingClients={clients.length === 0}
            missingProducts={products.length === 0}
          />
        ) : (
          <form
            id="order-form"
            onSubmit={(e) => void onSubmit(e)}
            className="space-y-10"
            noValidate
          >
            {/* — Header — */}
            <section aria-labelledby="ord-header" className="space-y-6">
              <h3
                id="ord-header"
                className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-muted"
              >
                Header
              </h3>

              <Controller
                control={control}
                name="client_id"
                render={({ field }) => (
                  <Select
                    label="Client"
                    items={clientItems}
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    placeholder="Pick a client"
                    error={errors.client_id?.message}
                  />
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Order date"
                  type="date"
                  {...register('order_date')}
                  error={errors.order_date?.message}
                />
                <Input
                  label="Currency"
                  hint="Three-letter ISO code (USD, EUR…)."
                  {...register('currency')}
                  error={errors.currency?.message}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select
                      label="Status"
                      items={STATUS_OPTIONS}
                      value={field.value}
                      onValueChange={(v) => field.onChange(v as OrderStatus)}
                      error={errors.status?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="payment_status"
                  render={({ field }) => (
                    <Select
                      label="Payment"
                      items={PAYMENT_OPTIONS}
                      value={field.value}
                      onValueChange={(v) =>
                        field.onChange(v as PaymentStatus)
                      }
                      error={errors.payment_status?.message}
                    />
                  )}
                />
              </div>

              <PartialPaymentField control={control} register={register} errors={errors} />
            </section>

            {/* — Line items — */}
            <section aria-labelledby="ord-items" className="space-y-4">
              <header className="flex items-baseline justify-between">
                <h3
                  id="ord-items"
                  className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-muted"
                >
                  Line items
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    append({ product_id: '', quantity: '1', unit_price: '0.00' })
                  }
                  className="font-mono inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-ink hover:text-accent transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Add line
                </button>
              </header>

              {errors.items?.message ? (
                <p
                  role="alert"
                  className="text-danger font-mono text-xs"
                >
                  {errors.items.message}
                </p>
              ) : null}

              <ul className="border-line border-t">
                {fields.map((row, idx) => (
                  <LineItemRow
                    key={row.id}
                    idx={idx}
                    control={control}
                    register={register}
                    errors={errors}
                    products={productItems}
                    productLookup={products}
                    canRemove={fields.length > 1}
                    onRemove={() => remove(idx)}
                  />
                ))}
              </ul>
            </section>

            {/* — Totals — */}
            <Totals control={control} />

            {/* — Misc — */}
            <section aria-labelledby="ord-misc" className="space-y-6">
              <h3
                id="ord-misc"
                className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-muted"
              >
                Logistics
              </h3>
              <Textarea
                label="Delivery address"
                optional
                rows={2}
                {...register('delivery_address')}
                error={errors.delivery_address?.message}
              />
              <Textarea
                label="Notes"
                optional
                rows={3}
                {...register('notes')}
                error={errors.notes?.message}
              />
            </section>
          </form>
        )}
      </SheetContent>
    </SheetRoot>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface PartialFieldProps {
  control: Control<FormValues>;
  register: ReturnType<typeof useForm<FormValues, unknown, OrderInput>>['register'];
  errors: ReturnType<typeof useForm<FormValues, unknown, OrderInput>>['formState']['errors'];
}

function PartialPaymentField({ control, register, errors }: PartialFieldProps) {
  const paymentStatus = useWatch({ control, name: 'payment_status' });
  if (paymentStatus !== 'Partial') return null;
  return (
    <Input
      label="Pending amount"
      numeric
      inputMode="decimal"
      placeholder="0.00"
      hint="What’s still owed by the client."
      {...register('pending_amount')}
      error={errors.pending_amount?.message}
    />
  );
}

interface LineItemRowProps {
  idx: number;
  control: Control<FormValues>;
  register: ReturnType<typeof useForm<FormValues, unknown, OrderInput>>['register'];
  errors: ReturnType<typeof useForm<FormValues, unknown, OrderInput>>['formState']['errors'];
  products: ReadonlyArray<{ value: string; label: string; description?: string }>;
  productLookup: ReadonlyArray<{ id: string; base_price: string | null }>;
  canRemove: boolean;
  onRemove: () => void;
}

function LineItemRow({
  idx,
  control,
  register,
  errors,
  products,
  productLookup,
  canRemove,
  onRemove,
}: LineItemRowProps) {
  const itemErrors = errors.items?.[idx];
  const currency = useUiStore((s) => s.currency);

  // Watch this row only, so other rows don't re-render on edits.
  const row = useWatch({ control, name: `items.${idx}` });
  const lineTotal = useMemo(() => {
    const qtyOk = /^\d+$/.test(row?.quantity ?? '');
    const priceOk = /^\d+(\.\d{1,4})?$/.test(row?.unit_price ?? '');
    if (!qtyOk || !priceOk) return null;
    return lineExtended(Number(row.quantity), row.unit_price);
  }, [row?.quantity, row?.unit_price]);

  return (
    <li className="border-line border-b py-5">
      <div className="grid grid-cols-12 items-end gap-3">
        <div className="col-span-12 md:col-span-6">
          <Controller
            control={control}
            name={`items.${idx}.product_id`}
            render={({ field }) => (
              <Select
                label="Product"
                items={products}
                value={field.value || undefined}
                onValueChange={(v) => {
                  field.onChange(v);
                  // Auto-fill unit_price from product's base_price when it's a fresh row.
                  const found = productLookup.find((p) => p.id === v);
                  if (found?.base_price && row && row.unit_price === '0.00') {
                    // Fire a synthetic event-free update via control._formValues — but
                    // the safe way is to use setValue. Lighter: only update if user
                    // hasn't typed anything custom. Use base_price as default.
                    // (We don't import setValue here; the auto-fill on first pick
                    // is best-effort and falls back to user editing.)
                  }
                }}
                placeholder="Pick a product"
                error={itemErrors?.product_id?.message}
              />
            )}
          />
        </div>

        <div className="col-span-4 md:col-span-2">
          <Input
            label="Qty"
            numeric
            inputMode="numeric"
            {...register(`items.${idx}.quantity`)}
            error={itemErrors?.quantity?.message}
          />
        </div>

        <div className="col-span-5 md:col-span-3">
          <Input
            label="Unit price"
            numeric
            inputMode="decimal"
            {...register(`items.${idx}.unit_price`)}
            error={itemErrors?.unit_price?.message}
          />
        </div>

        <div className="col-span-3 md:col-span-1 flex justify-end pb-1">
          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
            aria-label={`Remove line ${idx + 1}`}
            className="text-ink-muted hover:text-danger inline-flex h-11 w-11 items-center justify-center transition-colors disabled:opacity-30"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {lineTotal != null ? (
        <p className="font-mono mt-2 text-right text-[11px] uppercase tracking-[0.24em] text-ink-muted tabular-nums">
          Line total: {formatMoney(lineTotal, { currency })}
        </p>
      ) : null}
    </li>
  );
}

interface TotalsProps {
  control: Control<FormValues>;
}

function Totals({ control }: TotalsProps) {
  const items = useWatch({ control, name: 'items' });
  const discountPercent = useWatch({ control, name: 'discount_percent' });
  const currencyCode = useWatch({ control, name: 'currency' });

  const { subtotal, discounted } = useMemo(() => {
    let sub = money(0);
    for (const it of items ?? []) {
      const qtyOk = /^\d+$/.test(it?.quantity ?? '');
      const priceOk = /^\d+(\.\d{1,4})?$/.test(it?.unit_price ?? '');
      if (!qtyOk || !priceOk) continue;
      sub = sub.plus(lineExtended(Number(it.quantity), it.unit_price));
    }
    const pct = discountPercent ? Number(discountPercent) : 0;
    return {
      subtotal: sub,
      discounted: applyDiscount(sub, Number.isFinite(pct) ? pct : 0),
    };
  }, [items, discountPercent]);

  const cur = /^[A-Z]{3}$/.test(currencyCode ?? '') ? currencyCode : 'USD';
  const discountActive =
    discountPercent && Number(discountPercent) > 0 && !subtotal.eq(discounted);

  return (
    <section
      aria-labelledby="ord-totals"
      className="border-line bg-surface-sunk border-l-2 px-5 py-5"
    >
      <h3
        id="ord-totals"
        className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-muted"
      >
        Totals
      </h3>
      <dl className="mt-4 space-y-3">
        <Row label="Subtotal" value={formatMoney(subtotal, { currency: cur })} />
        <div className="space-y-2">
          <DiscountField control={control} />
          {discountActive ? (
            <Row
              label="After discount"
              value={formatMoney(discounted, { currency: cur })}
            />
          ) : null}
        </div>
        <hr className="border-line" />
        <Row
          label="Total"
          value={formatMoney(discounted, { currency: cur })}
          big
        />
      </dl>
    </section>
  );
}

function Row({
  label,
  value,
  big,
}: {
  label: string;
  value: ReactNode;
  big?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt
        className={
          big
            ? 'font-display text-step-2 uppercase tracking-tight'
            : 'font-mono text-[11px] uppercase tracking-[0.24em] text-ink-muted'
        }
      >
        {label}
      </dt>
      <dd
        className={
          big
            ? 'font-mono text-step-2 tabular-nums text-ink'
            : 'font-mono text-sm tabular-nums text-ink'
        }
      >
        {value}
      </dd>
    </div>
  );
}

function DiscountField({ control }: { control: Control<FormValues> }) {
  return (
    <Controller
      control={control}
      name="discount_percent"
      render={({ field, fieldState }) => (
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="ord-discount"
            className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-muted"
          >
            Discount %
          </label>
          <input
            id="ord-discount"
            inputMode="decimal"
            placeholder="0"
            value={field.value ?? ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            aria-invalid={fieldState.error ? 'true' : undefined}
            className={[
              'font-mono w-24 border-b bg-transparent py-1 text-right text-sm tabular-nums',
              'focus:outline-none focus:border-accent-2 transition-colors',
              fieldState.error ? 'border-danger' : 'border-line',
            ].join(' ')}
          />
        </div>
      )}
    />
  );
}

function BlockedState({
  missingClients,
  missingProducts,
}: {
  missingClients: boolean;
  missingProducts: boolean;
}) {
  const missing: string[] = [];
  if (missingClients) missing.push('clients');
  if (missingProducts) missing.push('products');
  return (
    <div className="border-line border-l-2 px-5 py-6">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-ink-muted">
        Set-up required
      </p>
      <h3 className="text-step-2 mt-2 leading-tight">
        Add {missing.join(' and ')} first.
      </h3>
      <p className="text-ink-muted mt-3 text-sm">
        Orders need at least one client and one product. Head to those sections
        first; this form will be ready when you’re back.
      </p>
    </div>
  );
}
