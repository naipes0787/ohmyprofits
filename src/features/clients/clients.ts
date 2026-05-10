import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { supabase } from '@shared/lib/supabase';
import { queryKeys } from '@shared/lib/query-keys';
import { useAuth } from '@features/auth/use-auth';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export const ClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  email: z.string().email('Invalid email').or(z.literal('')).optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
});

export type ClientInput = z.infer<typeof ClientSchema>;

// ---------------------------------------------------------------------------
// Domain type
// ---------------------------------------------------------------------------

export interface Client {
  id: string;
  owner_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  description: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function fetchClients(ownerId: string): Promise<Client[]> {
  const { data, error } = await supabase()
    .from('clients')
    .select('*')
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Client[];
}

async function createClient(ownerId: string, input: ClientInput): Promise<Client> {
  const result = await supabase()
    .from('clients')
    .insert({ owner_id: ownerId, ...input })
    .select()
    .single();
  if (result.error) throw result.error;
  return result.data as Client;
}

async function updateClient(id: string, input: ClientInput): Promise<Client> {
  const result = await supabase()
    .from('clients')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (result.error) throw result.error;
  return result.data as Client;
}

async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase()
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useClients() {
  const { user } = useAuth();
  const ownerId = user?.id ?? '';
  return useQuery({
    queryKey: queryKeys.clients(ownerId),
    queryFn: () => fetchClients(ownerId),
    enabled: !!ownerId,
  });
}

export function useCreateClient() {
  const { user } = useAuth();
  const ownerId = user?.id ?? '';
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClientInput) => createClient(ownerId, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.clients(ownerId) });
    },
  });
}

export function useUpdateClient() {
  const { user } = useAuth();
  const ownerId = user?.id ?? '';
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ClientInput }) =>
      updateClient(id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.clients(ownerId) });
    },
  });
}

export function useDeleteClient() {
  const { user } = useAuth();
  const ownerId = user?.id ?? '';
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteClient(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.clients(ownerId) });
    },
  });
}
