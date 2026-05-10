import { Link } from 'react-router';
import { BrandMark } from './BrandMark';

interface EmptyStateProps {
  headline: string;
  description: string;
  cta: { label: string; to: string };
}

/**
 * Per §4.5: oversized condensed headline + one sentence + a single primary CTA,
 * with the chevron mark used as a quiet brand presence.
 */
export function EmptyState({ headline, description, cta }: EmptyStateProps) {
  return (
    <div className="mt-16 max-w-2xl">
      <BrandMark className="text-accent mb-8 h-10 w-10" />
      <h2 className="text-step-4 leading-[0.95]">{headline}</h2>
      <p className="text-ink-muted mt-4 max-w-prose">{description}</p>
      <Link
        to={cta.to}
        className="bg-ink text-bg mt-10 inline-block px-5 py-3 font-display text-sm uppercase tracking-[0.18em]"
      >
        {cta.label}
      </Link>
    </div>
  );
}
