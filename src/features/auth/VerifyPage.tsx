import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import { Button } from '@shared/ui/Button';
import { supabase } from '@shared/lib/supabase';

type VerifyState =
  | { status: 'pending' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

/**
 * Lands the user from email confirmations and magic links.
 *
 * Supabase delivers two flavors:
 *   1. PKCE-style: ?code=... + auth.exchangeCodeForSession()
 *   2. token_hash flavor: ?token_hash=...&type=... + auth.verifyOtp()
 *
 * We support both so the verify route works with the standard Supabase email
 * templates regardless of which flow the project is configured for.
 */
export default function VerifyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<VerifyState>({ status: 'pending' });

  useEffect(() => {
    const code = params.get('code');
    const tokenHash = params.get('token_hash');
    const type = params.get('type');
    const errorDescription =
      params.get('error_description') ?? params.get('error');

    if (errorDescription) {
      setState({ status: 'error', message: errorDescription });
      return;
    }

    if (!code && !tokenHash) {
      setState({
        status: 'error',
        message: 'This verification link is missing required parameters.',
      });
      return;
    }

    let cancelled = false;
    void (async () => {
      const sb = supabase();
      try {
        if (code) {
          const { error } = await sb.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash) {
          const { error } = await sb.auth.verifyOtp({
            token_hash: tokenHash,
            type:
              type === 'recovery'
                ? 'recovery'
                : type === 'email_change'
                  ? 'email_change'
                  : type === 'magiclink'
                    ? 'magiclink'
                    : 'signup',
          });
          if (error) throw error;
        }

        if (cancelled) return;

        // Recovery (password reset) flow has its own next step.
        if (type === 'recovery') {
          setState({
            status: 'success',
            message: 'Identity confirmed. Set a new password to continue.',
          });
          window.setTimeout(() => {
            void navigate('/reset', { replace: true });
          }, 800);
          return;
        }

        setState({
          status: 'success',
          message: 'You’re signed in. Heading to your workspace…',
        });
        window.setTimeout(() => {
          void navigate('/clients', { replace: true });
        }, 900);
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : 'This link has expired or already been used.';
        setState({ status: 'error', message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, navigate]);

  return (
    <div>
      <p className="text-ink-muted font-mono text-xs uppercase tracking-[0.24em]">
        Verification
      </p>
      <h2 className="mt-3 text-step-4 leading-[0.92]">
        {state.status === 'pending' ? 'Hold tight.' : null}
        {state.status === 'success' ? 'You’re in.' : null}
        {state.status === 'error' ? 'Link not accepted.' : null}
      </h2>
      <p
        role="status"
        aria-live="polite"
        className="text-ink-muted mt-4 max-w-md text-sm"
      >
        {state.status === 'pending'
          ? 'Confirming your link with the server…'
          : state.message}
      </p>

      {state.status === 'error' ? (
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/forgot">Request a new link</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
