import { useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';

import {
  SheetRoot,
  SheetContent,
  SheetClose,
  ConfirmDialog,
} from '@shared/ui/Sheet';
import { Input, Textarea } from '@shared/ui/Field';
import { Button } from '@shared/ui/Button';
import { useToast } from '@shared/hooks/use-toast';

import {
  CategorySchema,
  type Category,
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from './categories';

interface CategoriesManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoriesManager({ open, onOpenChange }: CategoriesManagerProps) {
  const { data: categories = [], isLoading } = useCategories();
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();
  const deleteMut = useDeleteCategory();
  const { push } = useToast();

  const [draftName, setDraftName] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Category | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  async function handleAdd() {
    setDraftError(null);
    const parsed = CategorySchema.safeParse({
      name: draftName.trim(),
      description: draftDesc.trim() || undefined,
    });
    if (!parsed.success) {
      setDraftError(parsed.error.issues[0]?.message ?? 'Invalid');
      return;
    }
    try {
      await createMut.mutateAsync(parsed.data);
      setDraftName('');
      setDraftDesc('');
      push({ tone: 'positive', title: 'Category added.' });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === '23505') {
        setDraftError('A category with that name already exists.');
        return;
      }
      push({ tone: 'danger', title: 'Couldn’t add category.' });
    }
  }

  async function handleSaveEdit() {
    if (!editing) return;
    const parsed = CategorySchema.safeParse({
      name: editing.name.trim(),
      description: editing.description?.trim() || undefined,
    });
    if (!parsed.success) {
      push({
        tone: 'danger',
        title: parsed.error.issues[0]?.message ?? 'Invalid',
      });
      return;
    }
    try {
      await updateMut.mutateAsync({ id: editing.id, input: parsed.data });
      setEditing(null);
      push({ tone: 'positive', title: 'Category updated.' });
    } catch {
      push({ tone: 'danger', title: 'Couldn’t save changes.' });
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    try {
      await deleteMut.mutateAsync(pendingDelete.id);
      push({ tone: 'positive', title: 'Category removed.' });
      setPendingDelete(null);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === '23503') {
        push({
          tone: 'danger',
          title: 'In use by products',
          description: 'Move those products to another category first.',
        });
      } else {
        push({ tone: 'danger', title: 'Couldn’t remove category.' });
      }
      setPendingDelete(null);
    }
  }

  return (
    <SheetRoot open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="Categories"
        description="Quick way to organize your products. Each category is unique to you."
      >
        {/* — Add row — */}
        <section
          aria-labelledby="cat-add"
          className="border-line border-b pb-8"
        >
          <h3
            id="cat-add"
            className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-muted"
          >
            New category
          </h3>
          <div className="mt-4 space-y-4">
            <Input
              label="Name"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              error={draftError ?? undefined}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleAdd();
                }
              }}
            />
            <Textarea
              label="Description"
              optional
              rows={2}
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
            />
            <Button
              size="md"
              onClick={() => void handleAdd()}
              isLoading={createMut.isPending}
              leadingIcon={<Plus className="h-4 w-4" strokeWidth={1.75} />}
            >
              Add category
            </Button>
          </div>
        </section>

        {/* — Existing list — */}
        <section aria-labelledby="cat-list" className="mt-8">
          <h3
            id="cat-list"
            className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-muted"
          >
            {categories.length === 0
              ? 'None yet'
              : `${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}`}
          </h3>

          {isLoading ? (
            <ul className="mt-6 space-y-4" aria-hidden="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="bg-line h-10 animate-pulse" />
              ))}
            </ul>
          ) : categories.length === 0 ? (
            <p className="text-ink-muted mt-4 text-sm">
              Once you add a few, they’ll show here.
            </p>
          ) : (
            <ul className="border-line mt-6 border-t">
              {categories.map((c) => {
                const isEditing = editing?.id === c.id;
                return (
                  <li key={c.id} className="border-line border-b py-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <Input
                          label="Name"
                          hideLabel
                          value={editing.name}
                          onChange={(e) =>
                            setEditing({ ...editing, name: e.target.value })
                          }
                        />
                        <Textarea
                          label="Description"
                          hideLabel
                          rows={2}
                          placeholder="Description (optional)"
                          value={editing.description ?? ''}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              description: e.target.value,
                            })
                          }
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditing(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => void handleSaveEdit()}
                            isLoading={updateMut.isPending}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-display text-step-1 leading-tight tracking-tight uppercase">
                            {c.name}
                          </p>
                          {c.description ? (
                            <p className="text-ink-muted mt-1 text-sm">
                              {c.description}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center">
                          <IconBtn
                            label={`Edit ${c.name}`}
                            onClick={() => setEditing(c)}
                            icon={<Pencil className="h-4 w-4" strokeWidth={1.5} />}
                          />
                          <IconBtn
                            label={`Remove ${c.name}`}
                            onClick={() => setPendingDelete(c)}
                            danger
                            icon={<Trash2 className="h-4 w-4" strokeWidth={1.5} />}
                          />
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="mt-10 flex justify-end">
          <SheetClose asChild>
            <Button variant="ghost" leadingIcon={<X className="h-4 w-4" strokeWidth={1.5} />}>
              Done
            </Button>
          </SheetClose>
        </div>
      </SheetContent>

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Remove this category?"
        description={
          pendingDelete
            ? `${pendingDelete.name} will be removed. Products in it must be moved first.`
            : ''
        }
        confirmLabel="Remove"
        onConfirm={() => void handleConfirmDelete()}
        isLoading={deleteMut.isPending}
      />
    </SheetRoot>
  );
}

interface IconBtnProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

function IconBtn({ label, icon, onClick, danger }: IconBtnProps) {
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
