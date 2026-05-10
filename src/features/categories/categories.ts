import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '@shared/lib/supabase';
import { queryKeys } from '@shared/lib/query-keys';
import { useAuth } from '@features/auth/use-auth';

export const CategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  description: z.string().max(500).optional(),
});

export type CategoryInput = z.infer<typeof CategorySchema>;

export interface Category {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchCategories(ownerId: string): Promise<Category[]> {
  const { data, error } = await supabase()
    .from('categories')
    .select('*')
    .eq('owner_id', ownerId)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Category[];
}

async function createCategory(
  ownerId: string,
  input: CategoryInput,
): Promise<Category> {
  const result = await supabase()
    .from('categories')
    .insert({ owner_id: ownerId, ...input })
    .select()
    .single();
  if (result.error) throw result.error;
  return result.data as Category;
}

async function updateCategory(id: string, input: CategoryInput): Promise<Category> {
  const result = await supabase()
    .from('categories')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (result.error) throw result.error;
  return result.data as Category;
}

async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase().from('categories').delete().eq('id', id);
  if (error) throw error;
}

export function useCategories() {
  const { user } = useAuth();
  const ownerId = user?.id ?? '';
  return useQuery({
    queryKey: queryKeys.categories(ownerId),
    queryFn: () => fetchCategories(ownerId),
    enabled: !!ownerId,
  });
}

export function useCreateCategory() {
  const { user } = useAuth();
  const ownerId = user?.id ?? '';
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) => createCategory(ownerId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.categories(ownerId) });
    },
  });
}

export function useUpdateCategory() {
  const { user } = useAuth();
  const ownerId = user?.id ?? '';
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryInput }) =>
      updateCategory(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.categories(ownerId) });
    },
  });
}

export function useDeleteCategory() {
  const { user } = useAuth();
  const ownerId = user?.id ?? '';
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.categories(ownerId) });
      void qc.invalidateQueries({ queryKey: queryKeys.products(ownerId) });
    },
  });
}
