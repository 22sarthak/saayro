"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { BuddyMark } from "@/components/brand/buddy-mark";
import { SaayroLogo } from "@/components/brand/saayro-logo";
import { AvatarStack, BoardingPass, BudgetMeter } from "./trip-artifacts";

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative isolate h-[100svh] min-h-[760px] overflow-hidden bg-ink-950">
      <motion.div className="absolute inset-0 -z-10" style={{ y: imageY }}>
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.18 }}
          animate={{ scale: 1.04 }}
          transition={{ duration: 2.6, ease }}
        >
          <Image src="/destinations/goa-anjuna.jpg" alt="Anjuna beach in Goa at golden hour" fill priority sizes="100vw" className="object-cover" />
        </motion.div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(19,16,33,0.55)_0%,rgba(19,16,33,0.05)_32%,rgba(242,95,58,0.18)_62%,rgba(19,16,33,0.9)_100%)]" />
        <div className="absolute -left-40 top-1/3 h-[38rem] w-[38rem] animate-aurora-drift rounded-full bg-sunset-400/30 blur-[120px]" />
        <div className="absolute -right-20 bottom-0 h-[30rem] w-[30rem] animate-aurora-drift rounded-full bg-dusk-500/30 blur-[120px] [animation-delay:-6s]" />
      </motion.div>

      <nav className="absolute inset-x-0 top-0 z-20 px-4 pt-4 lg:px-8 lg:pt-6">
        <div className="glass-dark mx-auto flex max-w-[1400px] items-center justify-between rounded-full py-2.5 pl-5 pr-2.5">
          <SaayroLogo tone="light" compact />
          <div className="hidden items-center gap-8 text-sm text-white/80 md:flex">
            <a href="#how" className="transition hover:text-white">How it works</a>
            <a href="#features" className="transition hover:text-white">Features</a>
            <a href="#destinations" className="transition hover:text-white">Destinations</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="rounded-full px-4 py-2 text-sm text-white/85 transition hover:text-white">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink-950 transition hover:scale-[1.03] hover:shadow-glow"
            >
              Start a trip
            </Link>
          </div>
        </div>
      </nav>

      <motion.div style={{ y: contentY, opacity: fade }} className="relative z-10 mx-auto flex h-full max-w-[1400px] items-end px-5 pb-16 lg:px-8 lg:pb-24">
        <div className="grid w-full items-end gap-12 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease }}
              className="eyebrow mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white/90 backdrop-blur"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sunset-300" />
              Every city, beach & backroad in India
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, delay: 0.45, ease }}
              className="display text-[clamp(3.2rem,7.4vw,7.2rem)] text-white"
            >
              Every trip,
              <br />
              finally in
              <br />
              <em className="text-gradient-golden pr-3">one place.</em>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.7, ease }}
              className="mt-6 max-w-xl text-lg leading-8 text-white/80"
            >
              Tickets, stays, the cafés from that reel, the plan from the group chat, and who owes whom. Saayro gathers it all and Buddy
              keeps your crew moving.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.85, ease }}
              className="mt-9 flex flex-wrap items-center gap-3"
            >
              <Link
                href="/sign-up"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-base font-semibold text-ink-950 shadow-elevated transition hover:shadow-glow"
              >
                Start your trip
                <span className="transition-transform duration-standard group-hover:translate-x-1">→</span>
              </Link>
              <a href="#how" className="glass-dark inline-flex items-center gap-2 rounded-full px-6 py-4 text-base text-white transition hover:bg-white/20">
                See how it works
              </a>
            </motion.div>
          </div>

          <div className="relative hidden h-[460px] lg:block">
            <motion.div
              initial={{ opacity: 0, y: 40, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: -2 }}
              transition={{ duration: 1.1, delay: 0.9, ease }}
              className="absolute right-6 top-0 w-[380px] animate-float"
            >
              <BoardingPass />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.1, delay: 1.1, ease }}
              className="glass-strong absolute -left-10 top-[200px] w-[300px] rounded-[22px] p-4 [animation-delay:-2s] animate-float"
            >
              <div className="flex items-start gap-3">
                <BuddyMark size={30} />
                <div>
                  <p className="text-sm font-semibold text-ink-900">Buddy</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-ink-600">
                    Thalassa books out on New Year&apos;s week. Want me to hold a 7:30 table for six on the 29th?
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, delay: 1.3, ease }}
              className="glass-strong absolute bottom-0 right-0 w-[330px] rounded-[22px] p-4 [animation-delay:-4s] animate-float"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink-900">Goa, with the gang</p>
                  <p className="text-xs text-ink-500">27 Dec – 1 Jan · 52 days to go</p>
                </div>
                <AvatarStack names={["Aarav", "Sara", "Kabir", "Meera", "Rohan"]} size="sm" />
              </div>
              <BudgetMeter spent={18400} total={25000} />
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
        <span className="flex h-10 w-6 items-start justify-center rounded-full border border-white/40 p-1.5">
          <span className="h-2 w-1 animate-bounce rounded-full bg-white/80" />
        </span>
      </div>
    </section>
  );
}
