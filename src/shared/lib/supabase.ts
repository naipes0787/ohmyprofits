import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Browser Supabase client. Singleton — Supabase JS already debounces, but a
 * second instance would split auth state across tabs.
 *
 * SSR cookie wiring (per §3.1) lands when the auth shell is built (build-order
 * step 3). For now this is the SPA client used by React Query.
 */

let cached: SupabaseClient | undefined;

export function supabase(): SupabaseClient {
  if (cached) return cached;
  const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = env();
  cached = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
    auth: {
      // Until the SSR cookie helper lands we keep the default storage. The
      // service-role key is NEVER read here — only the anon key.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: { 'x-client-info': 'ohmyprofits-web' },
    },
  });
  return cached;
}
