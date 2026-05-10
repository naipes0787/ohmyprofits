import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Plus, Search, Trash2 } from 'lucide-react';

import { PageHeader } from '@shared/ui/PageHeader';
import { EmptyState } from '@shared/ui/EmptyState';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Field';
import { ConfirmDialog } from '@shared/ui/Sheet';
import { OrderStatusPill, PaymentStatusPill } from '@shared/ui/Pill';
import { useToast } from '@shared/hooks/use-toast';
import { applyDiscount, formatMoney, lineExtended, money } from '@shared/lib/money';

import { useClients } from '@features/clients/clients';

import {
  useDeleteOrder,
  useOrders,
  type OrderStatus,
  type OrderWithItems,
} from './orders';
import { OrderForm } from './OrderForm';

const STATUS_FILTERS: ReadonlyArray<{ value: OrderStatus | 'All'; label: string }> = [
  { value: 'All', label: 'All' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Confirmed', label: 'Confirmed' },
  { value: 'Processing', label: 'Processing' },
  { value: 'Delivered', label: 'Delivered' },
  { value: 'Cancelled', label: 'Cancelled' },
];

export default function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const wantNew = params.get('new') === '1';

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'All'>('All');

  const [editing, setEditing] = useState<OrderWithItems | null>(null);
  const [formOpen, setFormOpen] = useState(wantNew);
  const [pendingDelete, setPendingDelete] = useState<OrderWithItems | null>(null);

  const {
    data: orders = [],
    isLoading,
    isError,
  } = useOrders();
  const { data: clients = [] } = useClients();
  const deleteMut = useDeleteOrder();
  const { push } = useToast();

  useEffect(() => {
    if (wantNew) {
      setEditing(null);
      setFormOpen(true);
    }
  }, [wantNew]);

  const clientById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients) map.set(c.id, c.name);
    return map;
  }, [clients]);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'All' && o.status !== statusFilter) return false;
      if (!q) return true;
      if (o.order_number.toLowerCase().includes(q)) return true;
      const clientName = clientById.get(o.client_id);
      if (clientName?.toLowerCase().includes(q)) return true;
      if (o.notes?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [orders, deferredSearch, statusFilter, clientById]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleFormOpenChange(next: boolean) {
    setFormOpen(next);
    if (!next) {
      setEditing(null);
      if (params.has('new')) {
        params.delete('new');
        setParams(params, { replace: true });
      }
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteMut.mutateAsync(pendingDelete.id);
      push({ tone: 'positive', title: 'Order removed.' });
      setPendingDelete(null);
    } catch {
      push({ tone: 'danger', title: 'Couldn’t remove order.' });
    }
  }

  const hasAny = orders.length > 0;
  const hasResults = filtered.length > 0;

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <PageHeader eyebrow="Section 03" title="Orders" />

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorBlock />
      ) : !hasAny ? (
        <EmptyState
          headline="No orders yet."
          description="Live totals as you edit prices, quantities, and discounts. Mark partial payments without losing the trail."
          cta={{ label: 'Draft your first order', to: '/orders?new=1' }}
        />
      ) : (
        <>
          <Toolbar
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            onNew={openNew}
            count={filtered.length}
            total={orders.length}
          />

          {hasResults ? (
            <OrdersList
              orders={filtered}
              clientById={clientById}
              onEdit={(o) => {
                setEditing(o);
                setFormOpen(true);
              }}
              onDelete={(o) => setPendingDelete(o)}
            />
          ) : (
            <NoResults query={deferredSearch} statusFilter={statusFilter} />
          )}
        </>
      )}

      <OrderForm
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        order={editing}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Remove this order?"
        description={
          pendingDelete
            ? `${pendingDelete.order_number} will be hidden from the main list. You can restore it later from your records.`
            : ''
        }
        confirmLabel="Remove"
        onConfirm={() => void confirmDelete()}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

interface ToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: OrderStatus | 'All';
  onStatusChange: (s: OrderStatus | 'All') => void;
  onNew: () => void;
  count: number;
  total: number;
}

function Toolbar(props: ToolbarProps) {
  const {
    search,
    onSearchChange,
    statusFilter,
    onStatusChange,
    onNew,
    count,
    total,
  } = props;

  return (
    <div className="mt-10 space-y-5">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-1 items-end gap-4 md:max-w-md">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="text-ink-muted absolute bottom-3 left-0 h-4 w-4 md:left-3"
              strokeWidth={1.5}
            />
            <Input
              label="Search orders"
              hideLabel
              placeholder="Search by number, client, notes…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-6 md:pl-10"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 md:justify-end">
          <span
            aria-live="polite"
            className="text-ink-muted font-mono text-[11px] uppercase tracking-[0.24em] tabular-nums"
          >
            {count === total ? `${total}` : `${count} / ${total}`}
          </span>

          <Button
            variant="primary"
            size="md"
            onClick={onNew}
            leadingIcon={<Plus className="h-4 w-4" strokeWidth={1.75} />}
          >
            New
          </Button>
        </div>
      </div>

      {/* Status filter chips. */}
      <div
        role="tablist"
        aria-label="Filter by status"
        className="-mx-1 flex gap-1 overflow-x-auto"
      >
        {STATUS_FILTERS.map((opt) => {
          const active = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onStatusChange(opt.value)}
              className={[
                'font-mono shrink-0 px-3 py-2 text-[11px] uppercase tracking-[0.24em] transition-colors',
                'border',
                active
                  ? 'bg-accent text-(--color-accent-ink) border-accent'
                  : 'border-line text-ink-muted hover:text-ink',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

interface OrdersListProps {
  orders: OrderWithItems[];
  clientById: Map<string, string>;
  onEdit: (o: OrderWithItems) => void;
  onDelete: (o: OrderWithItems) => void;
}

function OrdersList({ orders, clientById, onEdit, onDelete }: OrdersListProps) {
  return (
    <ul className="border-line mt-8 border-t">
      {orders.map((o) => (
        <OrderRow
          key={o.id}
          order={o}
          clientName={clientById.get(o.client_id) ?? '—'}
          onEdit={() => onEdit(o)}
          onDelete={() => onDelete(o)}
        />
      ))}
    </ul>
  );
}

interface OrderRowProps {
  order: OrderWithItems;
  clientName: string;
  onEdit: () => void;
  onDelete: () => void;
}

function OrderRow({ order, clientName, onEdit, onDelete }: OrderRowProps) {
  // Total derived from items + discount, never persisted.
  const total = useMemo(() => {
    let sub = money(0);
    for (const it of order.items) {
      sub = sub.plus(lineExtended(it.quantity, it.unit_price));
    }
    const pct = order.discount_percent ? Number(order.discount_percent) : 0;
    return applyDiscount(sub, Number.isFinite(pct) ? pct : 0);
  }, [order.items, order.discount_percent]);

  const itemCount = order.items.length;

  return (
    <li className="border-line group border-b">
      <div className="flex items-stretch gap-4 py-5 md:py-6">
        <button
          type="button"
          onClick={onEdit}
          className="flex flex-1 flex-col gap-3 text-left md:flex-row md:items-center md:gap-6"
        >
          <div className="md:w-44">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-muted">
              {order.order_date}
            </p>
            <p className="font-mono text-step-1 tabular-nums leading-tight group-hover:text-accent transition-colors">
              {order.order_number}
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-display text-step-2 leading-tight tracking-tight uppercase truncate">
              {clientName}
            </p>
            <p className="text-ink-muted mt-1 text-xs">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <OrderStatusPill status={order.status} />
            <PaymentStatusPill status={order.payment_status} />
          </div>

          <div className="md:w-32 md:text-right">
            <p className="font-mono text-step-1 tabular-nums">
              {formatMoney(total, { currency: order.currency })}
            </p>
            {order.payment_status === 'Partial' && order.pending_amount ? (
              <p className="font-mono text-warning mt-1 text-[11px] uppercase tracking-[0.24em] tabular-nums">
                {formatMoney(order.pending_amount, {
                  currency: order.currency,
                })}{' '}
                owed
              </p>
            ) : null}
          </div>
        </button>

        <div className="flex items-center">
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Remove ${order.order_number}`}
            className="text-ink-muted hover:text-danger inline-flex h-11 w-11 items-center justify-center transition-colors"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

function ListSkeleton() {
  return (
    <ul className="border-line mt-16 border-t" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="border-line border-b py-7">
          <div className="bg-line h-5 w-40 animate-pulse" />
          <div className="bg-line/60 mt-3 h-4 w-72 animate-pulse" />
        </li>
      ))}
    </ul>
  );
}

function ErrorBlock() {
  return (
    <div className="border-danger mt-12 border-l-2 px-5 py-6">
      <p className="font-display text-step-2 uppercase tracking-tight">
        Couldn’t load orders.
      </p>
      <p className="text-ink-muted mt-2 text-sm">
        Check your connection and refresh.
      </p>
    </div>
  );
}

function NoResults({
  query,
  statusFilter,
}: {
  query: string;
  statusFilter: OrderStatus | 'All';
}) {
  const filterText =
    statusFilter !== 'All' ? ` with status ${statusFilter}` : '';
  return (
    <div className="mt-16 max-w-md">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-ink-muted">
        No matches
      </p>
      <h2 className="text-step-3 mt-3 leading-tight">
        {query.trim()
          ? `Nothing matches “${query.trim()}”${filterText}.`
          : `No orders${filterText}.`}
      </h2>
      <p className="text-ink-muted mt-3 text-sm">
        Adjust the filter or clear the search.
      </p>
    </div>
  );
}
