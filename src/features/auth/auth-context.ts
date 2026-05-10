import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Auth identity context — Context here is fine per §2.4: it holds *identity*,
 * not data. All data flows go through React Query keyed by owner.id.
 */

export interface AuthContextValue {
  /** Whether the initial session probe has resolved. */
  isReady: boolean;
  session: Session | null;
  user: User | null;
  /** Whether the user has confirmed their email. */
  isEmailVerified: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
