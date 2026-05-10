/**
 * Centralized query keys. Keyed by [feature, owner, ...] so cache scopes are
 * explicit and the cache is cleared on sign-out by removing the owner key.
 */

export const queryKeys = {
  all: ['omp'] as const,
  clients: (ownerId: string) => ['omp', 'clients', ownerId] as const,
  client: (ownerId: string, id: string) =>
    ['omp', 'clients', ownerId, id] as const,
  categories: (ownerId: string) => ['omp', 'categories', ownerId] as const,
  products: (ownerId: string) => ['omp', 'products', ownerId] as const,
  product: (ownerId: string, id: string) =>
    ['omp', 'products', ownerId, id] as const,
  orders: (ownerId: string) => ['omp', 'orders', ownerId] as const,
  order: (ownerId: string, id: string) =>
    ['omp', 'orders', ownerId, id] as const,
} as const;
