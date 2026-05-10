interface PageHeaderProps {
  eyebrow?: string;
  title: string;
}

/**
 * The "one hero typographic moment per top-level page" called for in §4.4.
 * Title is set huge in the display face, partially clipped by the content
 * below — echoing how "KIRKEN" sits on the cans.
 */
export function PageHeader({ eyebrow, title }: PageHeaderProps) {
  return (
    <header className="relative">
      {eyebrow ? (
        <p className="text-ink-muted font-mono text-xs uppercase tracking-[0.32em]">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-4 text-step-6 leading-[0.85] md:text-[clamp(4rem,9vw,9rem)]">
        {title}
      </h1>
      <hr className="border-line mt-8 border-t md:mt-12" />
    </header>
  );
}
