interface BrandMarkProps {
  className?: string;
  title?: string;
}

/**
 * Chevron arrow mark used as the favicon/PWA icon and brand presence on auth + empty states.
 */
export function BrandMark({ className, title = 'ohMyProfits' }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d="M14 18 L34 18 L50 32 L34 46 L14 46 L30 32 Z"
        fill="currentColor"
      />
    </svg>
  );
}
