import { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Input } from '@shared/ui/Field';
import { Button } from '@shared/ui/Button';
import { supabase } from '@shared/lib/supabase';

import { ForgotSchema, type ForgotInput } from './schemas';

export default function ForgotPage() {
  const [sent, setSent] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotInput>({
    resolver: zodResolver(ForgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    // Per A07: never expose whether the email exists. We simply present the
    // "check your inbox" state regardless of the response.
    await supabase().auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/verify?type=recovery`,
    });
    setSent(values.email);
  });

  if (sent) {
    return (
      <div>
        <p className="text-ink-muted font-mono text-xs uppercase tracking-[0.24em]">
          Reset requested
        </p>
        <h2 className="mt-3 text-step-4 leading-[0.92]">Check your inbox.</h2>
        <p className="text-ink-muted mt-4 max-w-md text-sm">
          If <span className="text-ink font-mono">{sent}</span> matches an
          account, you’ll get a reset link shortly.
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
        Forgot password
      </p>
      <h2 className="mt-3 text-step-4 leading-[0.92]">Reset it.</h2>
      <p className="text-ink-muted mt-3 max-w-md text-sm">
        Tell us your email and we’ll send a recovery link.
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
        <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full">
          Send reset link
        </Button>
      </form>

      <p className="text-ink-muted mt-10 text-sm">
        Remembered it?{' '}
        <Link to="/login" className="text-ink underline underline-offset-[6px]">
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
