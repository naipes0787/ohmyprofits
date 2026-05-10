import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Input } from '@shared/ui/Field';
import { Button } from '@shared/ui/Button';
import { supabase } from '@shared/lib/supabase';

import { MagicLinkSchema, type MagicLinkInput } from './schemas';
import { useAuth } from './use-auth';

export default function MagicLinkPage() {
  const { isReady, session } = useAuth();
  const [sent, setSent] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MagicLinkInput>({
    resolver: zodResolver(MagicLinkSchema),
    defaultValues: { email: '' },
  });

  if (isReady && session && !sent) {
    return <Navigate to="/clients" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const { error } = await supabase().auth.signInWithOtp({
      email: values.email,
      options: {
        emailRedirectTo: `${window.location.origin}/verify`,
        shouldCreateUser: false,
      },
    });
    if (error) {
      // Per A07, render the same success message regardless. Account
      // enumeration would otherwise leak which emails are registered.
    }
    setSent(values.email);
  });

  if (sent) {
    return (
      <div>
        <p className="text-ink-muted font-mono text-xs uppercase tracking-[0.24em]">
          Magic link sent
        </p>
        <h2 className="mt-3 text-step-4 leading-[0.92]">Check your inbox.</h2>
        <p className="text-ink-muted mt-4 max-w-md text-sm">
          If <span className="text-ink font-mono">{sent}</span> matches an
          account, a sign-in link is on its way. Open it on this device.
        </p>
        <Link
          to="/login"
          className="bg-ink text-bg mt-10 inline-block px-5 py-3 font-display text-sm uppercase tracking-[0.18em]"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-ink-muted font-mono text-xs uppercase tracking-[0.24em]">
        Sign in
      </p>
      <h2 className="mt-3 text-step-4 leading-[0.92]">Email me a link.</h2>
      <p className="text-ink-muted mt-3 max-w-md text-sm">
        We’ll send a one-time sign-in link. No password required.
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-10 space-y-6" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          // Single-purpose form page.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          {...register('email')}
          error={errors.email?.message}
        />
        {submitError ? (
          <p role="alert" className="text-danger font-mono text-xs">
            {submitError}
          </p>
        ) : null}
        <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
          Send the link
        </Button>
      </form>

      <p className="text-ink-muted mt-10 text-sm">
        Prefer a password?{' '}
        <Link to="/login" className="text-ink underline underline-offset-[6px]">
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
