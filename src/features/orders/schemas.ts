import { z } from 'zod';

/**
 * Order schemas. Money fields are validated as strings on the wire (PostgREST
 * returns NUMERIC as string and we never float-multiply). However, we accept
 * `string | number` on input so values hydrated from React Hook Form's
 * defaultValues — which can carry numeric primitives when an upstream caller
 * forgot to stringify — are coerced rather than rejected.
 */

const moneyString = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? String(v) : v.trim()))
  .pipe(
    z
      .string()
      .regex(/^\d+(\.\d{1,4})?$/, 'Must be a number with up to 4 decimals'),
  );

const moneyOptional = z
  .union([z.string(), z.number(), z.undefined()])
  .transform((v) => {
    if (v === undefined) return '';
    if (typeof v === 'number') return String(v);
    return v.trim();
  })
  .pipe(
    z.union([
      z
        .string()
        .regex(/^\d+(\.\d{1,4})?$/, 'Must be a number with up to 4 decimals'),
      z.literal(''),
    ]),
  )
  .transform((v) => (v === '' ? undefined : v));

const intStringPositive = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === 'number' ? String(v) : v.trim()))
  .pipe(z.string().regex(/^\d+$/, 'Whole number'))
  .refine((v) => Number(v) >= 1, { message: 'At least 1' });

export const OrderStatusEnum = z.enum([
  'Pending',
  'Confirmed',
  'Processing',
  'Delivered',
  'Cancelled',
]);

export const PaymentStatusEnum = z.enum(['Pending', 'Paid', 'Partial']);

export const OrderItemSchema = z.object({
  /** Set by the form when editing existing rows so we can match on update. */
  id: z.string().uuid().optional(),
  product_id: z.string().uuid({ message: 'Pick a product' }),
  quantity: intStringPositive,
  /** unit_price is editable per line. Must be present and >= 0. */
  unit_price: moneyString,
});

export type OrderItemInput = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z
  .object({
    client_id: z.string().uuid({ message: 'Pick a client' }),
    status: OrderStatusEnum,
    payment_status: PaymentStatusEnum,
    pending_amount: moneyOptional,
    discount_percent: z
      .union([z.string(), z.number(), z.undefined()])
      .transform((v) => {
        if (v === undefined) return '';
        if (typeof v === 'number') return String(v);
        return v.trim();
      })
      .pipe(
        z.union([
          z
            .string()
            .regex(/^\d+(\.\d{1,2})?$/, '0–100, up to 2 decimals')
            .refine((v) => Number(v) >= 0 && Number(v) <= 100, {
              message: '0–100 only',
            }),
          z.literal(''),
        ]),
      )
      .transform((v) => (v === '' ? undefined : v)),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/, 'Three-letter ISO code')
      .default('USD'),
    order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
    delivery_address: z.string().max(500).optional(),
    notes: z.string().max(2000).optional(),
    items: z.array(OrderItemSchema).min(1, 'Add at least one line item'),
  })
  .superRefine((val, ctx) => {
    // §1.2: when payment_status === 'Partial', pending_amount is required.
    if (val.payment_status === 'Partial') {
      if (val.pending_amount === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pending_amount'],
          message: 'Required for partial payments',
        });
      }
    }
  });

export type OrderInput = z.infer<typeof OrderSchema>;
