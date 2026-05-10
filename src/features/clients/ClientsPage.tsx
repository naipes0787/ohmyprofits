import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Plus, Pencil, Trash2, Search, ArrowUpDown } from 'lucide-react';

import { PageHeader } from '@shared/ui/PageHeader';
import { EmptyState } from '@shared/ui/EmptyState';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Field';
import { ConfirmDialog } from '@shared/ui/Sheet';
import { useToast } from '@shared/hooks/use-toast';

import { ClientForm } from './ClientForm';
import { useClients, useDeleteClient, type Client } from './clients';

type SortKey = 'name' | 'recent';

export default function ClientsPage() {
  const [params, setParams] = useSearchParams();
  const wantNew = params.get('new') === '1';

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [sort, setSort] = useState<SortKey>('name');

  const [editing, setEditing] = useState<Client | null>(null);
  const [formOpen, setFormOpen] = useState(wantNew);
  const [pendingDelete, setPendingDelete] = useState<Client | null>(null);

  // Pop the new-client form whenever ?new=1 lands (incl. from EmptyState CTA).
  useEffect(() => {
    if (wantNew) {
      setEditing(null);
      setFormOpen(true);
    }
  }, [wantNew]);

  const { data: clients = [], isLoading, isError } = useClients();
  const deleteMut = useDeleteClient();
  const { push } = useToast();

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const base = q
      ? clients.filter((c) => {
          if (c.name.toLowerCase().includes(q)) return true;
          if (c.email?.toLowerCase().includes(q)) return true;
          if (c.address?.toLowerCase().includes(q)) return true;
          return false;
        })
      : clients;

    if (sort === 'name') {
      return base.toSorted((a, b) => a.name.localeCompare(b.name));
    }
    return base.toSorted((a, b) => b.created_at.localeCompare(a.created_at));
  }, [clients, deferredSearch, sort]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleFormOpenChange(next: boolean) {
    setFormOpen(next);
    if (!next) {
      setEditing(null);
      // Clear ?new=1 if present so refresh doesn't reopen the form.
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
      push({ tone: 'positive', title: 'Client removed.' });
      setPendingDelete(null);
    } catch {
      push({ tone: 'danger', title: 'Couldn’t remove client.' });
    }
  }

  const hasAny = clients.length > 0;
  const hasResults = filtered.length > 0;

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <PageHeader eyebrow="Section 01" title="Clients" />

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorBlock />
      ) : !hasAny ? (
        <>
          <EmptyState
            headline="No clients yet."
            description="Every order needs someone to ship to. Add your first client to start."
            cta={{ label: 'Add your first client', to: '/clients?new=1' }}
          />
        </>
      ) : (
        <>
          <Toolbar
            search={search}
            onSearchChange={setSearch}
            sort={sort}
            onSortChange={setSort}
            onNew={openNew}
            count={filtered.length}
            total={clients.length}
          />

          {hasResults ? (
            <ClientsList
              clients={filtered}
              onEdit={(c) => {
                setEditing(c);
                setFormOpen(true);
              }}
              onDelete={(c) => setPendingDelete(c)}
            />
          ) : (
            <NoResults query={deferredSearch} />
          )}
        </>
      )}

      <ClientForm
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        client={editing}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Remove this client?"
        description={
          pendingDelete
            ? `${pendingDelete.name} will be hidden from new orders. You can restore them later from your records.`
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
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  onNew: () => void;
  count: number;
  total: number;
}

function Toolbar(props: ToolbarProps) {
  const { search, onSearchChange, sort, onSortChange, onNew, count, total } =
    props;
  return (
    <div className="mt-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-1 items-end gap-4 md:max-w-md">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="text-ink-muted absolute bottom-3 left-0 h-4 w-4 md:left-3"
            strokeWidth={1.5}
          />
          <Input
            label="Search clients"
            hideLabel
            placeholder="Search by name, email, address…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-6 md:pl-10"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 md:justify-end">
        <button
          type="button"
          onClick={() =>
            onSortChange(sort === 'name' ? 'recent' : 'name')
          }
          className="text-ink-muted hover:text-ink font-mono inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] transition-colors"
          aria-label={`Sort by ${sort === 'name' ? 'recent' : 'name'}`}
        >
          <ArrowUpDown className="h-3.5 w-3.5" strokeWidth={1.5} />
          {sort === 'name' ? 'A → Z' : 'Newest'}
        </button>

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
  );
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

interface ClientsListProps {
  clients: Client[];
  onEdit: (c: Client) => void;
  onDelete: (c: Client) => void;
}

function ClientsList({ clients, onEdit, onDelete }: ClientsListProps) {
  return (
    <ul className="border-line mt-8 border-t">
      {clients.map((c) => (
        <ClientRow
          key={c.id}
          client={c}
          onEdit={() => onEdit(c)}
          onDelete={() => onDelete(c)}
        />
      ))}
    </ul>
  );
}

interface ClientRowProps {
  client: Client;
  onEdit: () => void;
  onDelete: () => void;
}

function ClientRow({ client, onEdit, onDelete }: ClientRowProps) {
  const subtitle = [client.email, client.phone].filter(Boolean).join(' · ');

  return (
    <li className="border-line group border-b">
      <div className="flex items-center justify-between gap-4 py-5 md:py-6">
        <button
          type="button"
          onClick={onEdit}
          className="flex flex-1 flex-col items-start gap-1 text-left"
        >
          <span className="font-display text-step-2 leading-tight tracking-tight uppercase group-hover:text-accent transition-colors">
            {client.name}
          </span>
          {subtitle ? (
            <span className="text-ink-muted text-sm">{subtitle}</span>
          ) : client.address ? (
            <span className="text-ink-muted text-sm">{client.address}</span>
          ) : null}
        </button>

        <div className="flex items-center gap-1 md:gap-2">
          <IconAction
            label={`Edit ${client.name}`}
            onClick={onEdit}
            icon={<Pencil className="h-4 w-4" strokeWidth={1.5} />}
          />
          <IconAction
            label={`Remove ${client.name}`}
            onClick={onDelete}
            danger
            icon={<Trash2 className="h-4 w-4" strokeWidth={1.5} />}
          />
        </div>
      </div>
    </li>
  );
}

interface IconActionProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

function IconAction({ label, icon, onClick, danger }: IconActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        'inline-flex h-11 w-11 items-center justify-center transition-colors',
        danger
          ? 'text-ink-muted hover:text-danger'
          : 'text-ink-muted hover:text-ink',
      ].join(' ')}
    >
      {icon}
    </button>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

function ListSkeleton() {
  return (
    <ul className="border-line mt-16 border-t" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="border-line border-b py-7"
        >
          <div className="bg-line h-4 w-48 animate-pulse" />
          <div className="bg-line/60 mt-3 h-3 w-72 animate-pulse" />
        </li>
      ))}
    </ul>
  );
}

function ErrorBlock() {
  return (
    <div className="border-danger mt-12 border-l-2 px-5 py-6">
      <p className="font-display text-step-2 uppercase tracking-tight">
        Couldn’t load clients.
      </p>
      <p className="text-ink-muted mt-2 text-sm">
        Check your connection and refresh. If it keeps happening, sign out and
        back in.
      </p>
    </div>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="mt-16 max-w-md">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-ink-muted">
        No matches
      </p>
      <h2 className="text-step-3 mt-3 leading-tight">
        Nothing matches “{query.trim()}”.
      </h2>
      <p className="text-ink-muted mt-3 text-sm">
        Try a shorter query, or clear the search.
      </p>
    </div>
  );
}
