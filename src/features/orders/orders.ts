import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@shared/lib/supabase';
import { queryKeys } from '@shared/lib/query-keys';
import { useAuth } from '@features/auth/use-auth';

import type {
  OrderInput,
  OrderItemInput,
} from './schemas';

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Delivered'
  | 'Cancelled';

export type PaymentStatus = 'Pending' | 'Paid' | 'Partial';

export interface OrderItem {
  id: string;
  owner_id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  /** NUMERIC, returned as string. */
  unit_price: string;
  position: number;
  created_at: string;
}

export interface Order {
  id: string;
  owner_id: string;
  client_id: string;
  order_number: string;
  order_year: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  pending_amount: string | null;
  discount_percent: string | null;
  currency: string;
  order_date: string;
  delivery_address: string | null;
  notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchOrders(ownerId: string): Promise<OrderWithItems[]> {
  const { data, error } = await supabase()
    .from('orders')
    .select('*, items:order_items(*)')
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .order('order_date', { ascending: false })
    .order('order_number', { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as Array<Order & { items: OrderItem[] }>;
  // Sort items by position within each order.
  return rows.map((r) => ({
    ...r,
    items: [...r.items].sort((a, b) => a.position - b.position),
  }));
}

// ---------------------------------------------------------------------------
// Insert / Update
// ---------------------------------------------------------------------------

interface OrderHeaderPayload {
  client_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  pending_amount: string | null;
  discount_percent: string | null;
  currency: string;
  order_date: string;
  delivery_address: string | null;
  notes: string | null;
}

function toHeaderPayload(input: OrderInput): OrderHeaderPayload {
  return {
    client_id: input.client_id,
    status: input.status,
    payment_status: input.payment_status,
    pending_amount:
      input.payment_status === 'Partial' && input.pending_amount
        ? input.pending_amount
        : null,
    discount_percent: input.discount_percent ?? null,
    currency: input.currency,
    order_date: input.order_date,
    delivery_address: input.delivery_address?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

interface ItemRowPayload {
  owner_id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  position: number;
}

function itemsToRows(
  ownerId: string,
  orderId: string,
  items: ReadonlyArray<OrderItemInput>,
): ItemRowPayload[] {
  return items.map((it, idx) => ({
    owner_id: ownerId,
    order_id: orderId,
    product_id: it.product_id,
    quantity: Number(it.quantity),
    unit_price: it.unit_price,
    position: idx,
  }));
}

async function createOrder(
  ownerId: string,
  input: OrderInput,
): Promise<OrderWithItems> {
  const sb = supabase();
  const inserted = await sb
    .from('orders')
    .insert({ owner_id: ownerId, ...toHeaderPayload(input) })
    .select()
    .single();
  if (inserted.error) throw inserted.error;
  const orderRow = inserted.data as Order;

  const rows = itemsToRows(ownerId, orderRow.id, input.items);
  const itemsResult = await sb.from('order_items').insert(rows).select();
  if (itemsResult.error) {
    // Best-effort cleanup: delete the order we just created so we don't leave
    // a header without lines (RLS allows owner deletes).
    await sb.from('orders').delete().eq('id', orderRow.id);
    throw itemsResult.error;
  }

  return {
    ...orderRow,
    items: ((itemsResult.data ?? []) as OrderItem[]).sort(
      (a, b) => a.position - b.position,
    ),
  };
}

async function updateOrder(
  ownerId: string,
  id: string,
  input: OrderInput,
): Promise<OrderWithItems> {
  const sb = supabase();

  const headerResult = await sb
    .from('orders')
    .update(toHeaderPayload(input))
    .eq('id', id)
    .select()
    .single();
  if (headerResult.error) throw headerResult.error;
  const orderRow = headerResult.data as Order;

  // Replace strategy: easier to reason about than reconciling line-by-line,
  // and the order is small (rarely > a few dozen rows).
  const wipe = await sb.from('order_items').delete().eq('order_id', id);
  if (wipe.error) throw wipe.error;

  const rows = itemsToRows(ownerId, id, input.items);
  const itemsResult = await sb.from('order_items').insert(rows).select();
  if (itemsResult.error) throw itemsResult.error;

  return {
    ...orderRow,
    items: ((itemsResult.data ?? []) as OrderItem[]).sort(
      (a, b) => a.position - b.position,
    ),
  };
}

async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase()
    .from('orders')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useOrders() {
  const { user } = useAuth();
  const ownerId = user?.id ?? '';
  return useQuery({
    queryKey: queryKeys.orders(ownerId),
    queryFn: () => fetchOrders(ownerId),
    enabled: !!ownerId,
  });
}

export function useCreateOrder() {
  const { user } = useAuth();
  const ownerId = user?.id ?? '';
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: OrderInput) => createOrder(ownerId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.orders(ownerId) });
    },
  });
}

export function useUpdateOrder() {
  const { user } = useAuth();
  const ownerId = user?.id ?? '';
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: OrderInput }) =>
      updateOrder(ownerId, id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.orders(ownerId) });
    },
  });
}

export function useDeleteOrder() {
  const { user } = useAuth();
  const ownerId = user?.id ?? '';
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteOrder(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.orders(ownerId) });
    },
  });
}
