import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Input } from '@shared/ui/Field';
import { Button } from '@shared/ui/Button';
import { supabase } from '@shared/lib/supabase';

import { SignupSchema, type SignupInput } from './schemas';
import { useAuth } from './use-auth';

export default function SignupPage() {
  const { isReady, session } = useAuth();
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(SignupSchema),
    defaultValues: { email: '', password: '', displayName: '' },
    mode: 'onSubmit',
  });

  if (isReady && session && !submitted) {
    return <Navigate to="/clients" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const { data, error } = await supabase().auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/verify`,
        data: { display_name: values.displayName },
      },
    });

    if (error) {
      // Generic message per A07 — don't reveal whether the email is registered.
      setSubmitError('We couldn’t create that account. Try again.');
      return;
    }
    // If email confirmations are on, session will be null.
    if (!data.session) {
      setSubmitted(values.email);
    }
  });

  if (submitted) {
    return (
      <div>
        <p className="text-ink-muted font-mono text-xs uppercase tracking-[0.24em]">
          Almost there
        </p>
        <h2 className="mt-3 text-step-4 leading-[0.92]">Check your inbox.</h2>
        <p className="text-ink-muted mt-4 max-w-md text-sm">
          We sent a verification link to{' '}
          <span className="text-ink font-mono">{submitted}</span>. Open it on this
          device to finish creating your account.
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
        Create account
      </p>
      <h2 className="mt-3 text-step-4 leading-[0.92]">Set up shop.</h2>
      <p className="text-ink-muted mt-3 max-w-md text-sm">
        Your data is yours alone — Postgres + RLS keep it that way.
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-10 space-y-6" noValidate>
        <Input
          label="What should we call you?"
          autoComplete="name"
          // Single-purpose form page; autofocusing the first field matches
          // the one-task-per-screen pattern.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          {...register('displayName')}
          error={errors.displayName?.message}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          {...register('email')}
          error={errors.email?.message}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          error={errors.password?.message}
          hint="≥ 12 characters. Mix letters with at least one number or symbol."
        />

        {submitError ? (
          <p
            role="alert"
            aria-live="polite"
            className="border-danger text-danger border-l-2 px-3 py-2 font-mono text-xs uppercase tracking-[0.2em]"
          >
            {submitError}
          </p>
        ) : null}

        <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
          Create account
        </Button>
      </form>

      <p className="text-ink-muted mt-10 text-sm">
        Already have an account?{' '}
        <Link to="/login" className="text-ink underline underline-offset-[6px]">
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
