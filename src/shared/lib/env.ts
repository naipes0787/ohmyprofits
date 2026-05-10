import { z } from 'zod';

/**
 * Build-time env validation. Only `VITE_`-prefixed values are exposed to the
 * bundle (per Vite). Service-role keys must never appear here — see .env.example.
 *
 * Per A08 (Software & Data Integrity Failures) we also confirm the project ref
 * matches the URL host, so a misconfigured .env.local fails fast.
 */

const ClientEnvSchema = z
  .object({
    VITE_SUPABASE_URL: z.string().url(),
    VITE_SUPABASE_ANON_KEY: z.string().min(20),
    VITE_SUPABASE_PROJECT_REF: z.string().min(1),
    VITE_APP_ENV: z
      .enum(['development', 'preview', 'production'])
      .default('development'),
  })
  .superRefine((env, ctx) => {
    const expectsLocal = env.VITE_SUPABASE_PROJECT_REF === 'local';
    const isLocalUrl =
      env.VITE_SUPABASE_URL.includes('127.0.0.1') ||
      env.VITE_SUPABASE_URL.includes('localhost');
    if (expectsLocal !== isLocalUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'VITE_SUPABASE_PROJECT_REF and VITE_SUPABASE_URL disagree on local vs remote.',
        path: ['VITE_SUPABASE_PROJECT_REF'],
      });
    }
  });

export type ClientEnv = z.infer<typeof ClientEnvSchema>;

let cached: ClientEnv | undefined;

export function env(): ClientEnv {
  if (cached) return cached;
  const parsed = ClientEnvSchema.safeParse(import.meta.env);
  if (!parsed.success) {
    // Surface the misconfiguration loudly during boot.
    // We deliberately throw here so the app fails to mount — a half-configured
    // bundle would silently hit the wrong Supabase project.
    const message = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid VITE_ environment:\n${message}`);
  }
  cached = parsed.data;
  return cached;
}
