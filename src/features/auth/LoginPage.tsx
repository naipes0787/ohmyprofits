import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Input } from '@shared/ui/Field';
import { Button } from '@shared/ui/Button';
import { supabase } from '@shared/lib/supabase';

import { LoginSchema, type LoginInput } from './schemas';
import { useAuth } from './use-auth';
import { readReturnTo } from './return-to';

export default function LoginPage() {
  const { isReady, session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const next = readReturnTo(location.search) ?? '/clients';

  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
  });

  if (isReady && session) {
    return <Navigate to={next} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const { error } = await supabase().auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (error) {
      // Per §3.3 A07: don't enumerate accounts. Generic message regardless of
      // whether the email exists.
      setSubmitError('Email or password is incorrect.');
      return;
    }
    await navigate(next, { replace: true });
  });

  return (
    <div>
      <p className="text-ink-muted font-mono text-xs uppercase tracking-[0.24em]">
        Sign in
      </p>
      <h2 className="mt-3 text-step-4 leading-[0.92]">Welcome back.</h2>
      <p className="text-ink-muted mt-3 max-w-md text-sm">
        Pick up where you left off. Your clients, products, and orders are
        ready.
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-10 space-y-6" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          // Deliberate autofocus on a single-purpose form page — the first
          // and only meaningful action on the screen is filling this field.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          {...register('email')}
          error={errors.email?.message}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          error={errors.password?.message}
          hint="At least 12 characters."
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
          Sign in
        </Button>

        <div className="border-line text-ink-muted flex flex-wrap items-center justify-between gap-3 border-t pt-6 font-mono text-[11px] uppercase tracking-[0.2em]">
          <Link to="/forgot" className="hover:text-ink underline-offset-[6px] hover:underline">
            Forgot password
          </Link>
          <Link to="/magic-link" className="hover:text-ink underline-offset-[6px] hover:underline">
            Email me a magic link
          </Link>
        </div>
      </form>

      <p className="text-ink-muted mt-10 text-sm">
        New here?{' '}
        <Link to="/signup" className="text-ink underline underline-offset-[6px]">
          Create an account
        </Link>
        .
      </p>
    </div>
  );
}
