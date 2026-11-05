type BuddyMarkProps = {
  size?: number;
  className?: string;
};

/** Buddy's mark: a sun resting on the horizon. Golden hour, not a generic AI sparkle. */
export function BuddyMark({ size = 28, className = "" }: BuddyMarkProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-ink-950 ${className}`}
      style={{ width: size, height: size }}
      aria-label="Buddy"
    >
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none">
        <path d="M6.5 15a5.5 5.5 0 0 1 11 0" fill="#ff7e54" />
        <path d="M3 15.5h18" stroke="#fffbf5" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12 5.5v2M5.6 8.1l1.4 1.4M18.4 8.1 17 9.5" stroke="#ffce66" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M8 18.5h8" stroke="#fffbf5" strokeOpacity="0.45" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}
