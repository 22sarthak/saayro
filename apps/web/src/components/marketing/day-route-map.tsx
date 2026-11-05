"use client";

import { motion } from "motion/react";
import { northGoaMap } from "@/lib/north-goa-route";

/** Real North Goa map with the OSRM driving route drawn in as the tile scrolls into view. */
export function DayRouteMap() {
  const { src, width, height, viewBox, stops, routePath } = northGoaMap;

  return (
    <div className="relative h-full overflow-hidden rounded-[22px] ring-1 ring-black/5">
      <svg viewBox={viewBox} preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label="Route map of North Goa">
        <image href={src} width={width} height={height} />
        <path d={routePath} fill="none" stroke="#ffffff" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        <motion.path
          d={routePath}
          fill="none"
          stroke="#f25f3a"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={{ duration: 2.4, ease: [0.65, 0, 0.35, 1] }}
        />
        {stops.map((stop, index) => (
          <g key={stop.name}>
            <circle cx={stop.x} cy={stop.y} r="30" fill="#ffffff" />
            <circle cx={stop.x} cy={stop.y} r="23" fill={index === 0 ? "#131021" : "#f25f3a"} />
            <text x={stop.x} y={stop.y + 9} textAnchor="middle" fontSize="26" fontWeight="700" fill="#ffffff" fontFamily="var(--font-body)">
              {index + 1}
            </text>
          </g>
        ))}
      </svg>
      <span className="absolute bottom-2 right-3 rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-ink-500">© OpenStreetMap contributors</span>
    </div>
  );
}
