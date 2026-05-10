import { z } from 'zod';

/**
 * Auth Zod schemas. Per §3.3 A04 — same schema runs on the client AND in the
 * Edge Function. Per §3.1 — passwords ≥ 12 chars; HIBP-checked in Supabase
 * (auth.password_min_length is enforced server-side too).
 */

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Enter your email.')
  .max(254, 'Email is too long.')
  .email('That doesn’t look like an email.');

export const PasswordSchema = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(128, 'Password is too long.')
  // Encourage mixed character classes without being draconian. The 12-char
  // floor + Supabase's HIBP check is the real guardrail.
  .refine((s) => /[a-zA-Z]/.test(s) && /[0-9\W]/.test(s), {
    message: 'Mix letters with at least one number or symbol.',
  });

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Enter your password.'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const SignupSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  displayName: z
    .string()
    .trim()
    .min(1, 'Tell us what to call you.')
    .max(80, 'Display name is too long.'),
});
export type SignupInput = z.infer<typeof SignupSchema>;

export const MagicLinkSchema = z.object({
  email: EmailSchema,
});
export type MagicLinkInput = z.infer<typeof MagicLinkSchema>;

export const ForgotSchema = z.object({
  email: EmailSchema,
});
export type ForgotInput = z.infer<typeof ForgotSchema>;

export const ResetSchema = z
  .object({
    password: PasswordSchema,
    confirmPassword: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords don’t match.',
      });
    }
  });
export type ResetInput = z.infer<typeof ResetSchema>;
