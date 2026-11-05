import Link from "next/link";
import { SaayroLogo } from "@/components/brand/saayro-logo";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal } from "@/components/motion/reveal";

export function ClosingSection() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 pb-10 lg:px-8">
      <Reveal>
        <div className="relative overflow-hidden rounded-[40px] border border-porcelain-300 bg-white px-8 py-20 text-center shadow-soft lg:py-28">
          <div className="absolute -left-24 -top-24 h-96 w-96 animate-aurora-drift rounded-full bg-sky-200/70 blur-[110px]" />
          <div className="absolute -bottom-32 right-0 h-[28rem] w-[28rem] animate-aurora-drift rounded-full bg-violet-200/70 blur-[120px] [animation-delay:-8s]" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 animate-aurora-drift rounded-full bg-mint-200/60 blur-[100px] [animation-delay:-4s]" />
          <div className="relative">
            <h2 className="display mx-auto max-w-4xl text-balance text-5xl text-slate-900 lg:text-8xl">
              Your next trip deserves a <em>smarter half.</em>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-600">
              Bring the crew, bring the chaos. Saayro turns it into the trip you&apos;ll talk about for years.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Magnetic>
                <Link href="/sign-up" className="block rounded-full bg-slate-900 px-8 py-4 text-base font-semibold text-white shadow-elevated transition hover:bg-slate-800">
                  Start your trip, free
                </Link>
              </Magnetic>
              <Link href="/sign-in" className="rounded-full border border-porcelain-300 bg-white/80 px-8 py-4 text-base text-slate-800 transition hover:bg-white">
                I already have an account
              </Link>
            </div>
          </div>
        </div>
      </Reveal>

      <footer className="flex flex-col items-center justify-between gap-4 px-2 pt-10 text-sm text-slate-500 md:flex-row">
        <SaayroLogo compact />
        <p>Made in India, for every road in it.</p>
        <Link href="/credits" className="transition hover:text-slate-900">
          Photo credits
        </Link>
      </footer>
    </section>
  );
}
