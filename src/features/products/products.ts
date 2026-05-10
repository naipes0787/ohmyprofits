import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '@shared/lib/supabase';
import { queryKeys } from '@shared/lib/query-keys';
import { useAuth } from '@features/auth/use-auth';

// Helper: empty string in money/integer inputs becomes undefined. Accepts
// `string | number` on input so numeric primitives hydrated from PostgREST
// responses (NUMERIC sometimes deserializes as number) are coerced.
const optionalMoney = z
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

const optionalInt = z
  .union([z.string(), z.number(), z.undefined()])
  .transform((v) => {
    if (v === undefined) return '';
    if (typeof v === 'number') return String(v);
    return v.trim();
  })
  .pipe(z.union([z.string().regex(/^\d+$/, 'Whole number only'), z.literal('')]))
  .transform((v) => (v === '' ? undefined : Number(v)));

export const ProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  category_id: z.string().uuid({ message: 'Pick a category' }),
  description: z.string().max(2000).optional(),
  base_price: optionalMoney,
  cost_price: optionalMoney,
  stock: optionalInt,
});

export type ProductInput = z.infer<typeof ProductSchema>;

export interface Product {
  id: string;
  owner_id: string;
  category_id: string;
  name: string;
  description: string | null;
  /** Postgres NUMERIC comes back as a string from PostgREST. */
  base_price: string | null;
  cost_price: string | null;
  stock: number | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchProducts(ownerId: string): Promise<Product[]> {
  const { data, error } = await supabase()
    .from('products')
    .select('*')
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Product[];
}

interface ProductWritePayload {
  name: string;
  category_id: string;
  description: string | undefined;
  base_price: string | undefined;
  cost_price: string | undefined;
  stock: number | undefined;
}

function toPayload(input: ProductInput): ProductWritePayload {
  return {
    name: input.name,
    category_id: input.category_id,
    description: input.description,
    base_price: input.base_price,
    cost_price: input.cost_price,
    stock: input.stock,
  };
}

async function createProduct(
  ownerId: string,
  input: ProductInput,
): Promise<Product> {
  const result = await supabase()
    .from('products')
    .insert({ owner_id: ownerId, ...toPayload(input) })
    .select()
    .single();
  if (result.error) throw result.error;
  return result.data as Product;
}

async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  const result = await supabase()
    .from('products')
    .update(toPayload(input))
    .eq('id', id)
    .select()
    .single();
  if (result.error) throw result.error;
  return result.data as Product;
}

async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase()
    .from('products')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export function useProducts() {
  const { user } = useAuth();
  const ownerId = user?.id ?? '';
  return useQuery({
    queryKey: queryKeys.products(ownerId),
    queryFn: () => fetchProducts(ownerId),
    enabled: !!ownerId,
  });
}

export function useCreateProduct() {
  const { user } = useAuth();
  const ownerId = user?.id ?? '';
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProductInput) => createProduct(ownerId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.products(ownerId) });
    },
  });
}

export function useUpdateProduct() {
  const { user } = useAuth();
  const ownerId = user?.id ?? '';
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProductInput }) =>
      updateProduct(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.products(ownerId) });
    },
  });
}

export function useDeleteProduct() {
  const { user } = useAuth();
  const ownerId = user?.id ?? '';
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.products(ownerId) });
    },
  });
}
