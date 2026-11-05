"use client";

import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";

const spring = { stiffness: 180, damping: 22, mass: 0.6 };

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  /** Maximum tilt in degrees. */
  maxTilt?: number;
  /** Optional pill that follows the pointer, e.g. "Plan Goa". */
  cursorLabel?: string;
};

/** Perspective tilt with a soft glare that tracks a fine pointer. Flat on touch and for reduced motion. */
export function TiltCard({ children, className, maxTilt = 6, cursorLabel }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [hovering, setHovering] = useState(false);
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const localX = useMotionValue(0);
  const localY = useMotionValue(0);
  const rotateX = useSpring(useTransform(pointerY, [0, 1], [maxTilt, -maxTilt]), spring);
  const rotateY = useSpring(useTransform(pointerX, [0, 1], [-maxTilt, maxTilt]), spring);
  const glareX = useTransform(pointerX, (value) => `${value * 100}%`);
  const glareY = useTransform(pointerY, (value) => `${value * 100}%`);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.28), transparent 55%)`;
  const labelX = useSpring(localX, { stiffness: 400, damping: 32 });
  const labelY = useSpring(localY, { stiffness: 400, damping: 32 });

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    if (reduceMotion || event.pointerType !== "mouse" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width);
    pointerY.set((event.clientY - rect.top) / rect.height);
    localX.set(event.clientX - rect.left);
    localY.set(event.clientY - rect.top);
    if (!hovering) setHovering(true);
  }

  function reset() {
    pointerX.set(0.5);
    pointerY.set(0.5);
    setHovering(false);
  }

  return (
    <div className="[perspective:1100px]">
      <motion.div
        ref={ref}
        onPointerMove={handleMove}
        onPointerLeave={reset}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className={`relative ${className ?? ""}`}
      >
        {children}
        <motion.div
          aria-hidden
          className={`pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light transition-opacity duration-standard ${hovering ? "opacity-100" : "opacity-0"}`}
          style={{ background: glare }}
        />
        {cursorLabel ? (
          <motion.span aria-hidden className="pointer-events-none absolute left-0 top-0 z-10" style={{ x: labelX, y: labelY }}>
            <span
              className={`block -translate-x-1/2 -translate-y-[140%] whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-elevated transition duration-standard ease-entrance ${
                hovering ? "scale-100 opacity-100" : "scale-75 opacity-0"
              }`}
            >
              {cursorLabel}
            </span>
          </motion.span>
        ) : null}
      </motion.div>
    </div>
  );
}
