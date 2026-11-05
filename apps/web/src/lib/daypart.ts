"use client";

import { useEffect, useState } from "react";

export type Daypart = "dawn" | "day" | "golden" | "night";

export type DaypartMood = {
  label: string;
  /** Hero clip to open on, so the first frame matches the light outside. */
  openingClip: string;
  /** Colour wash laid over the hero video. */
  wash: string;
};

export const daypartMoods: Record<Daypart, DaypartMood> = {
  dawn: {
    label: "Early light",
    openingClip: "himalaya-valley",
    wash: "radial-gradient(ellipse at 75% 0%, rgba(255,186,200,0.30), transparent 60%), linear-gradient(180deg, rgba(159,134,250,0.12), transparent 50%)"
  },
  day: {
    label: "Bright skies",
    openingClip: "jaipur-amber",
    wash: "radial-gradient(ellipse at 80% 0%, rgba(255,243,214,0.18), transparent 55%)"
  },
  golden: {
    label: "Golden hour",
    openingClip: "goa-coast",
    wash: "radial-gradient(ellipse at 70% 10%, rgba(253,224,142,0.22), transparent 60%), radial-gradient(ellipse at 15% 85%, rgba(195,179,250,0.16), transparent 55%)"
  },
  night: {
    label: "After dark",
    openingClip: "amritsar-night",
    wash: "linear-gradient(180deg, rgba(30,41,82,0.40), rgba(15,23,42,0.15) 45%, transparent 70%)"
  }
};

const INDIA_TIME = "Asia/Kolkata";

function indiaHour(date: Date): number {
  return Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: INDIA_TIME }).format(date));
}

export function daypartAt(date: Date): Daypart {
  const hour = indiaHour(date);
  if (hour >= 5 && hour < 9) return "dawn";
  if (hour >= 9 && hour < 16) return "day";
  if (hour >= 16 && hour < 19) return "golden";
  return "night";
}

export function formatIndiaTime(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: INDIA_TIME })
    .format(date)
    .toLowerCase();
}

function isDaypart(value: string | null): value is Daypart {
  return value === "dawn" || value === "day" || value === "golden" || value === "night";
}

export type DaypartState = { daypart: Daypart; time: string };

/**
 * Time of day in India, refreshed every minute. Null until mounted so server and client render the same markup.
 * `?daypart=night` (etc.) forces a mood for previews.
 */
export function useDaypart(): DaypartState | null {
  const [state, setState] = useState<DaypartState | null>(null);

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("daypart");
    const read = () => {
      const now = new Date();
      setState({ daypart: isDaypart(forced) ? forced : daypartAt(now), time: formatIndiaTime(now) });
    };
    read();
    const timer = window.setInterval(read, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return state;
}
