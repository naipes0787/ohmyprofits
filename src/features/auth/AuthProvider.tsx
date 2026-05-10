import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@shared/lib/supabase';
import { AuthContext, type AuthContextValue } from './auth-context';

/**
 * Subscribes to Supabase auth events and exposes session identity to the app.
 *
 * Per §3.1, failed refresh → silent sign-out → redirect to /login (with
 * return-to). Supabase JS handles the refresh internally and emits
 * `TOKEN_REFRESHED` / `SIGNED_OUT` events; we trust those rather than polling.
 */

interface State {
  isReady: boolean;
  session: Session | null;
  user: User | null;
}

const INITIAL: State = { isReady: false, session: null, user: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(INITIAL);
  const queryClient = useQueryClient();

  useEffect(() => {
    const sb = supabase();
    let cancelled = false;

    void sb.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setState({
        isReady: true,
        session: data.session,
        user: data.session?.user ?? null,
      });
    });

    const { data: subscription } = sb.auth.onAuthStateChange((event, session) => {
      setState((prev) => ({
        isReady: true,
        session,
        user: session?.user ?? prev.user, // fall back when only token refreshed
      }));

      // On sign-out, blast the cache so a different signed-in user can't see
      // the previous user's data even momentarily.
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [queryClient]);

  const signOut = useCallback(async () => {
    await supabase().auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isReady: state.isReady,
      session: state.session,
      user: state.user,
      isEmailVerified: Boolean(state.user?.email_confirmed_at),
      signOut,
    }),
    [state.isReady, state.session, state.user, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
