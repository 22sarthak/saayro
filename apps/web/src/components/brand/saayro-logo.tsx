import Link from "next/link";

export function SaayroLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-soft">
        S
      </span>
      <span className="flex flex-col">
        <span className="font-['Iowan_Old_Style','Palatino_Linotype','Book_Antiqua',Georgia,serif] text-xl tracking-[0.08em] text-slate-950">
          Saayro
        </span>
        {!compact ? <span className="text-xs text-slate-500">Your trip&apos;s smarter half</span> : null}
      </span>
    </Link>
  );
}

