"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useRef, type PointerEvent, type ReactNode } from "react";

const spring = { stiffness: 220, damping: 18, mass: 0.5 };

type MagneticProps = {
  children: ReactNode;
  /** Share of the pointer's offset from centre the element follows. */
  strength?: number;
  className?: string;
};

/** Pulls its child gently toward a fine pointer. Inert on touch and for reduced motion. */
export function Magnetic({ children, strength = 0.28, className }: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();
  const x = useSpring(useMotionValue(0), spring);
  const y = useSpring(useMotionValue(0), spring);

  function handleMove(event: PointerEvent<HTMLSpanElement>) {
    if (reduceMotion || event.pointerType !== "mouse" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((event.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((event.clientY - (rect.top + rect.height / 2)) * strength);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.span ref={ref} onPointerMove={handleMove} onPointerLeave={reset} style={{ x, y }} className={`inline-block ${className ?? ""}`}>
      {children}
    </motion.span>
  );
}
