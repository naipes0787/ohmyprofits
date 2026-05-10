import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  SheetRoot,
  SheetContent,
  SheetClose,
} from '@shared/ui/Sheet';
import { Input, Textarea } from '@shared/ui/Field';
import { Select } from '@shared/ui/Select';
import { Button } from '@shared/ui/Button';
import { useToast } from '@shared/hooks/use-toast';

import { useCategories } from '@features/categories/categories';
import {
  ProductSchema,
  type Product,
  type ProductInput,
  useCreateProduct,
  useUpdateProduct,
} from './products';

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  /** Pre-select a category when opening the form via a "+ Add product" button next to a category. */
  defaultCategoryId?: string | null;
  /** Open the categories manager when the user clicks "Manage categories". */
  onManageCategories?: () => void;
}

interface FormValues {
  name: string;
  category_id: string;
  description: string;
  base_price: string;
  cost_price: string;
  stock: string;
}

const EMPTY_DEFAULTS: FormValues = {
  name: '',
  category_id: '',
  description: '',
  base_price: '',
  cost_price: '',
  stock: '',
};

export function ProductForm({
  open,
  onOpenChange,
  product,
  defaultCategoryId,
  onManageCategories,
}: ProductFormProps) {
  const isEdit = !!product;
  const { data: categories = [] } = useCategories();
  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();
  const { push } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, ProductInput>({
    resolver: zodResolver(ProductSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      product
        ? {
            name: product.name,
            category_id: product.category_id,
            description: product.description ?? '',
            base_price: product.base_price != null ? String(product.base_price) : '',
            cost_price: product.cost_price != null ? String(product.cost_price) : '',
            stock: product.stock != null ? String(product.stock) : '',
          }
        : {
            ...EMPTY_DEFAULTS,
            category_id: defaultCategoryId ?? '',
          },
    );
  }, [open, product, defaultCategoryId, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && product) {
        await updateMut.mutateAsync({ id: product.id, input: values });
        push({ tone: 'positive', title: 'Product updated.' });
      } else {
        await createMut.mutateAsync(values);
        push({ tone: 'positive', title: 'Product added.' });
      }
      onOpenChange(false);
    } catch {
      push({
        tone: 'danger',
        title: isEdit ? 'Couldn’t save changes.' : 'Couldn’t add product.',
      });
    }
  });

  const categoryItems = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const categoryFieldDisabled = categories.length === 0;

  return (
    <SheetRoot open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title={isEdit ? 'Edit product' : 'New product'}
        description={
          isEdit
            ? 'Update product details and pricing.'
            : 'Group it under a category. Prices and stock are optional — add them when you have them.'
        }
        footer={
          <>
            <SheetClose asChild>
              <Button type="button" variant="ghost" size="md">
                Cancel
              </Button>
            </SheetClose>
            <Button
              type="submit"
              form="product-form"
              size="md"
              isLoading={isSubmitting}
            >
              {isEdit ? 'Save changes' : 'Add product'}
            </Button>
          </>
        }
      >
        <form
          id="product-form"
          onSubmit={(e) => void onSubmit(e)}
          className="space-y-6"
          noValidate
        >
          <Input
            label="Name"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            {...register('name')}
            error={errors.name?.message}
          />

          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <div className="space-y-3">
                <Select
                  label="Category"
                  items={categoryItems}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  placeholder={
                    categoryFieldDisabled
                      ? 'No categories yet'
                      : 'Pick a category'
                  }
                  disabled={categoryFieldDisabled}
                  error={errors.category_id?.message}
                />
                {onManageCategories ? (
                  <button
                    type="button"
                    onClick={onManageCategories}
                    className="text-ink-muted hover:text-ink font-mono text-[11px] uppercase tracking-[0.24em] underline-offset-[6px] hover:underline"
                  >
                    {categoryFieldDisabled
                      ? '+ Create your first category'
                      : '+ Manage categories'}
                  </button>
                ) : null}
              </div>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Base price"
              numeric
              optional
              inputMode="decimal"
              placeholder="0.00"
              {...register('base_price')}
              error={errors.base_price?.message}
            />
            <Input
              label="Cost price"
              numeric
              optional
              inputMode="decimal"
              placeholder="0.00"
              hint="Only visible to you."
              {...register('cost_price')}
              error={errors.cost_price?.message}
            />
          </div>

          <Input
            label="Stock"
            numeric
            optional
            inputMode="numeric"
            placeholder="0"
            {...register('stock')}
            error={errors.stock?.message}
          />

          <Textarea
            label="Description"
            optional
            rows={3}
            {...register('description')}
            error={errors.description?.message}
          />
        </form>
      </SheetContent>
    </SheetRoot>
  );
}
