import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router';
import {
  ChevronDown,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';

import { PageHeader } from '@shared/ui/PageHeader';
import { EmptyState } from '@shared/ui/EmptyState';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Field';
import { ConfirmDialog } from '@shared/ui/Sheet';
import { useToast } from '@shared/hooks/use-toast';
import { useUiStore } from '@shared/hooks/use-ui-store';
import { formatMoney } from '@shared/lib/money';

import { useCategories, type Category } from '@features/categories/categories';
import { CategoriesManager } from '@features/categories/CategoriesManager';

import {
  useDeleteProduct,
  useProducts,
  type Product,
} from './products';
import { ProductForm } from './ProductForm';

export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const wantNew = params.get('new') === '1';
  const currency = useUiStore((s) => s.currency);

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const [editing, setEditing] = useState<Product | null>(null);
  const [presetCategoryId, setPresetCategoryId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(wantNew);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const {
    data: products = [],
    isLoading: loadingProducts,
    isError: errorProducts,
  } = useProducts();
  const {
    data: categories = [],
    isLoading: loadingCategories,
  } = useCategories();
  const deleteMut = useDeleteProduct();
  const { push } = useToast();

  // Pop the form whenever ?new=1 arrives.
  useEffect(() => {
    if (wantNew) {
      setEditing(null);
      setPresetCategoryId(null);
      setFormOpen(true);
    }
  }, [wantNew]);

  const isLoading = loadingProducts || loadingCategories;
  const hasAny = products.length > 0;

  const grouped = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const filtered = q
      ? products.filter((p) => {
          if (p.name.toLowerCase().includes(q)) return true;
          if (p.description?.toLowerCase().includes(q)) return true;
          return false;
        })
      : products;

    const byCat = new Map<string, Product[]>();
    for (const p of filtered) {
      const list = byCat.get(p.category_id);
      if (list) {
        list.push(p);
      } else {
        byCat.set(p.category_id, [p]);
      }
    }
    return categories
      .map<{ category: Category; items: Product[] }>((c) => ({
        category: c,
        items: byCat.get(c.id) ?? [],
      }))
      .filter((g) => (q ? g.items.length > 0 : true));
  }, [products, categories, deferredSearch]);

  const totalShown = grouped.reduce((sum, g) => sum + g.items.length, 0);
  const noResults =
    hasAny && deferredSearch.trim().length > 0 && totalShown === 0;

  function openNew(catId?: string) {
    setEditing(null);
    setPresetCategoryId(catId ?? null);
    setFormOpen(true);
  }

  function handleFormOpenChange(next: boolean) {
    setFormOpen(next);
    if (!next) {
      setEditing(null);
      setPresetCategoryId(null);
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
      push({ tone: 'positive', title: 'Product removed.' });
      setPendingDelete(null);
    } catch {
      push({ tone: 'danger', title: 'Couldn’t remove product.' });
    }
  }

  function toggleCollapse(catId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  return (
    <div className="px-6 py-10 md:px-10 md:py-14">
      <PageHeader eyebrow="Section 02" title="Products" />

      {isLoading ? (
        <ListSkeleton />
      ) : errorProducts ? (
        <ErrorBlock />
      ) : !hasAny && categories.length === 0 ? (
        <EmptyStateInitial
          onAddProduct={() => openNew()}
          onManageCategories={() => setCatManagerOpen(true)}
        />
      ) : !hasAny ? (
        <EmptyState
          headline="No products yet."
          description="You’ve set up categories. Now drop in your first product to fill them out."
          cta={{ label: 'Add your first product', to: '/products?new=1' }}
        />
      ) : (
        <>
          <Toolbar
            search={search}
            onSearchChange={setSearch}
            onNew={() => openNew()}
            onManageCategories={() => setCatManagerOpen(true)}
            count={totalShown}
            total={products.length}
          />

          {noResults ? (
            <NoResults query={deferredSearch} />
          ) : (
            <ul className="border-line mt-10 border-t">
              {grouped.map(({ category, items }) => (
                <CategoryGroup
                  key={category.id}
                  category={category}
                  items={items}
                  currency={currency}
                  collapsed={collapsed.has(category.id)}
                  onToggle={() => toggleCollapse(category.id)}
                  onEdit={(p) => {
                    setEditing(p);
                    setFormOpen(true);
                  }}
                  onDelete={(p) => setPendingDelete(p)}
                  onAddInCategory={() => openNew(category.id)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <ProductForm
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        product={editing}
        defaultCategoryId={presetCategoryId}
        onManageCategories={() => {
          setFormOpen(false);
          setCatManagerOpen(true);
        }}
      />

      <CategoriesManager
        open={catManagerOpen}
        onOpenChange={setCatManagerOpen}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Remove this product?"
        description={
          pendingDelete
            ? `${pendingDelete.name} will be hidden from new orders. You can restore it later from your records.`
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
  onNew: () => void;
  onManageCategories: () => void;
  count: number;
  total: number;
}

function Toolbar(props: ToolbarProps) {
  const { search, onSearchChange, onNew, onManageCategories, count, total } =
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
            label="Search products"
            hideLabel
            placeholder="Search by name, description…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-6 md:pl-10"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 md:justify-end">
        <button
          type="button"
          onClick={onManageCategories}
          className="text-ink-muted hover:text-ink font-mono inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] transition-colors"
        >
          <Layers className="h-3.5 w-3.5" strokeWidth={1.5} />
          Categories
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
// Category group
// ---------------------------------------------------------------------------

interface CategoryGroupProps {
  category: Category;
  items: Product[];
  currency: string;
  collapsed: boolean;
  onToggle: () => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onAddInCategory: () => void;
}

function CategoryGroup(props: CategoryGroupProps) {
  const {
    category,
    items,
    currency,
    collapsed,
    onToggle,
    onEdit,
    onDelete,
    onAddInCategory,
  } = props;

  const sectionId = `cat-${category.id}`;
  const isEmpty = items.length === 0;

  return (
    <li className="border-line border-b">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-controls={sectionId}
        className="group flex w-full items-baseline justify-between gap-4 py-6 text-left md:py-8"
      >
        <div className="flex items-baseline gap-4">
          <ChevronDown
            aria-hidden="true"
            className={[
              'text-ink-muted h-4 w-4 transition-transform duration-150',
              collapsed ? '-rotate-90' : '',
            ].join(' ')}
            strokeWidth={1.5}
          />
          <h2 className="font-display text-step-3 leading-none tracking-tight uppercase group-hover:text-accent transition-colors">
            {category.name}
          </h2>
        </div>
        <span className="text-ink-muted font-mono text-[11px] uppercase tracking-[0.24em] tabular-nums">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </button>

      {!collapsed ? (
        <div id={sectionId}>
          {isEmpty ? (
            <p className="text-ink-muted -mt-2 mb-6 ml-8 text-sm">
              Nothing in this category yet.
            </p>
          ) : (
            <ul className="border-line mb-2 border-t">
              {items.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  currency={currency}
                  onEdit={() => onEdit(p)}
                  onDelete={() => onDelete(p)}
                />
              ))}
            </ul>
          )}

          <div className="-mt-2 mb-6 ml-8">
            <button
              type="button"
              onClick={onAddInCategory}
              className="text-ink-muted hover:text-ink font-mono inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
              Add to {category.name}
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Product row
// ---------------------------------------------------------------------------

interface ProductRowProps {
  product: Product;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
}

function ProductRow({ product, currency, onEdit, onDelete }: ProductRowProps) {
  const price =
    product.base_price != null
      ? formatMoney(product.base_price, { currency })
      : null;
  const stock = product.stock != null ? product.stock : null;

  return (
    <li className="border-line group border-b last:border-b-0">
      <div className="flex items-center gap-4 py-4 pl-8 pr-2 md:py-5">
        <button
          type="button"
          onClick={onEdit}
          className="flex flex-1 items-baseline justify-between gap-4 text-left"
        >
          <div className="min-w-0 flex-1">
            <span className="font-display text-step-1 leading-tight tracking-tight uppercase block group-hover:text-accent transition-colors">
              {product.name}
            </span>
            {product.description ? (
              <span className="text-ink-muted mt-1 line-clamp-1 block text-sm">
                {product.description}
              </span>
            ) : null}
          </div>

          <div className="flex shrink-0 items-baseline gap-6 text-right">
            {stock != null ? (
              <span
                className={[
                  'font-mono text-[11px] uppercase tracking-[0.24em] tabular-nums',
                  stock === 0 ? 'text-warning' : 'text-ink-muted',
                ].join(' ')}
              >
                {stock} in stock
              </span>
            ) : null}
            {price ? (
              <span className="font-mono text-step-1 text-ink tabular-nums">
                {price}
              </span>
            ) : (
              <span className="text-ink-muted font-mono text-[11px] uppercase tracking-[0.24em]">
                No price
              </span>
            )}
          </div>
        </button>

        <div className="flex items-center">
          <IconAction
            label={`Edit ${product.name}`}
            onClick={onEdit}
            icon={<Pencil className="h-4 w-4" strokeWidth={1.5} />}
          />
          <IconAction
            label={`Remove ${product.name}`}
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
  icon: ReactNode;
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

interface EmptyStateInitialProps {
  onAddProduct: () => void;
  onManageCategories: () => void;
}

function EmptyStateInitial({
  onAddProduct,
  onManageCategories,
}: EmptyStateInitialProps) {
  return (
    <div className="mt-16 max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-[0.32em] text-ink-muted">
        Two-step start
      </p>
      <h2 className="text-step-4 mt-3 leading-[0.95]">
        Categories first.<br />Products second.
      </h2>
      <p className="text-ink-muted mt-4 max-w-prose">
        Group your inventory however it makes sense — by line, by season, by
        SKU type. You can rename or rearrange any time.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          onClick={onManageCategories}
          leadingIcon={<Layers className="h-4 w-4" strokeWidth={1.5} />}
        >
          Set up categories
        </Button>
        <Button
          size="lg"
          variant="ghost"
          onClick={onAddProduct}
          leadingIcon={<Plus className="h-4 w-4" strokeWidth={1.75} />}
        >
          Skip — add product
        </Button>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="border-line mt-16 border-t" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="border-line border-b py-8">
          <div className="bg-line h-6 w-48 animate-pulse" />
          <div className="bg-line/60 mt-4 h-4 w-72 animate-pulse" />
          <div className="bg-line/60 mt-2 h-4 w-64 animate-pulse" />
        </li>
      ))}
    </ul>
  );
}

function ErrorBlock() {
  return (
    <div className="border-danger mt-12 border-l-2 px-5 py-6">
      <p className="font-display text-step-2 uppercase tracking-tight">
        Couldn’t load products.
      </p>
      <p className="text-ink-muted mt-2 text-sm">
        Check your connection and refresh.
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
