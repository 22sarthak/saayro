import Link from "next/link";
import { SaayroLogo } from "@/components/brand/saayro-logo";
import { Magnetic } from "@/components/motion/magnetic";
import { Reveal } from "@/components/motion/reveal";

export function ClosingSection() {
  return (
    <section className="mx-auto max-w-[1400px] px-5 pb-10 lg:px-8">
      <Reveal>
        <div className="relative overflow-hidden rounded-[40px] bg-ink-950 px-8 py-20 text-center lg:py-28">
          <div className="absolute -left-24 -top-24 h-96 w-96 animate-aurora-drift rounded-full bg-sunset-500/50 blur-[110px]" />
          <div className="absolute -bottom-32 right-0 h-[28rem] w-[28rem] animate-aurora-drift rounded-full bg-dusk-500/50 blur-[120px] [animation-delay:-8s]" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 animate-aurora-drift rounded-full bg-lagoon-400/30 blur-[100px] [animation-delay:-4s]" />
          <div className="relative">
            <h2 className="display mx-auto max-w-4xl text-balance text-5xl text-white lg:text-8xl">
              Your next trip deserves a <em className="text-sunset-300">smarter half.</em>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/70">
              Bring the crew, bring the chaos. Saayro turns it into the trip you&apos;ll talk about for years.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Magnetic>
                <Link href="/sign-up" className="block rounded-full bg-white px-8 py-4 text-base font-semibold text-ink-950 transition hover:shadow-glow">
                  Start your trip, free
                </Link>
              </Magnetic>
              <Link href="/sign-in" className="glass-dark rounded-full px-8 py-4 text-base text-white transition hover:bg-white/20">
                I already have an account
              </Link>
            </div>
          </div>
        </div>
      </Reveal>

      <footer className="flex flex-col items-center justify-between gap-4 px-2 pt-10 text-sm text-ink-500 md:flex-row">
        <SaayroLogo compact />
        <p>Made in India, for every road in it.</p>
        <Link href="/credits" className="transition hover:text-ink-900">
          Photo credits
        </Link>
      </footer>
    </section>
  );
}
