import Link from "next/link";

type SaayroLogoProps = {
  compact?: boolean;
  tone?: "ink" | "light";
};

export function SaayroLogo({ compact = false, tone = "ink" }: SaayroLogoProps) {
  const wordColor = tone === "light" ? "text-white" : "text-ink-950";
  const taglineColor = tone === "light" ? "text-white/70" : "text-ink-500";

  return (
    <Link href="/" className="group inline-flex items-center gap-3">
      <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-[14px] bg-golden-hour shadow-glow transition-transform duration-standard ease-entrance group-hover:rotate-[-6deg] group-hover:scale-105">
        <span className="display text-[22px] italic text-white">S</span>
        <span className="absolute inset-x-0 top-0 h-1/2 bg-white/20" />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`display text-[22px] ${wordColor}`}>Saayro</span>
        {!compact ? <span className={`mt-1 text-[11px] ${taglineColor}`}>Your trip&apos;s smarter half</span> : null}
      </span>
    </Link>
  );
}
