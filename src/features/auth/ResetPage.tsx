import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Input } from '@shared/ui/Field';
import { Button } from '@shared/ui/Button';
import { supabase } from '@shared/lib/supabase';

import { ResetSchema, type ResetInput } from './schemas';
import { useAuth } from './use-auth';

/**
 * Set a new password after clicking the recovery link in email. The recovery
 * token is exchanged into a session by VerifyPage; this screen runs only after
 * that exchange has succeeded — so we require a session here, but redirect to
 * /forgot if there isn't one (link expired, user navigated here directly).
 */
export default function ResetPage() {
  const { isReady, session } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetInput>({
    resolver: zodResolver(ResetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  if (isReady && !session) {
    return <Navigate to="/forgot" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const { error } = await supabase().auth.updateUser({
      password: values.password,
    });
    if (error) {
      setSubmitError('We couldn’t update your password. Try again.');
      return;
    }
    setSuccess(true);
    window.setTimeout(() => {
      void navigate('/clients', { replace: true });
    }, 900);
  });

  if (success) {
    return (
      <div>
        <p className="text-ink-muted font-mono text-xs uppercase tracking-[0.24em]">
          Updated
        </p>
        <h2 className="mt-3 text-step-4 leading-[0.92]">Password set.</h2>
        <p className="text-ink-muted mt-4 max-w-md text-sm">
          Heading to your workspace…
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-ink-muted font-mono text-xs uppercase tracking-[0.24em]">
        Reset password
      </p>
      <h2 className="mt-3 text-step-4 leading-[0.92]">Pick a new one.</h2>
      <p className="text-ink-muted mt-3 max-w-md text-sm">
        At least 12 characters. Mix letters with at least one number or symbol.
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-10 space-y-6" noValidate>
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          // Single-purpose form page.
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          {...register('password')}
          error={errors.password?.message}
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
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
          Update password
        </Button>
      </form>

      <p className="text-ink-muted mt-10 text-sm">
        Changed your mind?{' '}
        <Link to="/clients" className="text-ink underline underline-offset-[6px]">
          Skip
        </Link>
        .
      </p>
    </div>
  );
}
