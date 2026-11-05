import Image from "next/image";
import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { BoardingPass, BuddySpark } from "./trip-artifacts";

function Tile({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <Reveal delay={delay} className={className}>
      <div className="group relative h-full overflow-hidden rounded-[32px] border border-sand-200 bg-white p-7 shadow-soft transition duration-leisurely ease-entrance hover:-translate-y-1 hover:shadow-elevated">
        {children}
      </div>
    </Reveal>
  );
}

function TileHeading({ eyebrow, title, tone }: { eyebrow: string; title: string; tone: string }) {
  return (
    <div>
      <p className={`eyebrow ${tone}`}>{eyebrow}</p>
      <h3 className="display mt-3 text-3xl text-ink-950 lg:text-[2.4rem]">{title}</h3>
    </div>
  );
}

const places = [
  { name: "Fort Aguada", image: "/destinations/goa-aguada.jpg", votes: 5, note: "Go before 5pm, crowds after" },
  { name: "Dudhsagar Falls", image: "/destinations/goa-dudhsagar.jpg", votes: 4, note: "Jeep safari from Mollem" },
  { name: "Palolem Beach", image: "/destinations/goa-palolem.jpg", votes: 6, note: "Kayak to Butterfly Island" }
];

const routeStops = [
  { label: "Anjuna", x: 120, y: 70 },
  { label: "Vagator", x: 230, y: 120 },
  { label: "Chapora Fort", x: 330, y: 92 },
  { label: "Thalassa", x: 440, y: 160 }
];

export function FeatureBento() {
  return (
    <section id="features" className="mx-auto max-w-[1400px] px-5 pb-28 lg:px-8 lg:pb-36">
      <Reveal className="mb-14 max-w-3xl">
        <p className="eyebrow text-lagoon-600">Everything for the trip</p>
        <h2 className="display mt-4 text-balance text-5xl text-ink-950 lg:text-7xl">From the first idea to the last settle-up.</h2>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-6">
        <Tile className="lg:col-span-3" delay={0}>
          <TileHeading eyebrow="Bookings wallet" title="Drop a ticket. Get a boarding pass." tone="text-lagoon-600" />
          <p className="mt-3 max-w-md text-sm leading-6 text-ink-600">
            Flights, trains, buses, stays, car rentals and cruises, read from PDFs, screenshots or your inbox. Works offline.
          </p>
          <div className="mt-8 space-y-4">
            <div className="transition duration-leisurely group-hover:-rotate-1">
              <BoardingPass variant="paper" />
            </div>
            <div className="flex items-center gap-4 rounded-[24px] bg-sand-50 p-3 pr-5">
              <div className="relative h-20 w-28 overflow-hidden rounded-[16px]">
                <Image src="/destinations/goa-palolem.jpg" alt="" fill sizes="112px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-rose-500">Airbnb · Assagao</p>
                <p className="truncate text-base font-semibold text-ink-900">Casa Saudade, 4BR villa with pool</p>
                <p className="text-xs text-ink-500">Check-in 27 Dec, 2pm · 5 nights</p>
              </div>
              <span className="rounded-full bg-palm-100 px-3 py-1 text-xs font-semibold text-palm-700">Confirmed</span>
            </div>
          </div>
        </Tile>

        <Tile className="lg:col-span-3" delay={0.1}>
          <TileHeading eyebrow="Places & votes" title="Every reel, ranked by your crew." tone="text-marigold-600" />
          <p className="mt-3 max-w-md text-sm leading-6 text-ink-600">
            Photos, ratings and hours for any place in India, plus what Reddit and reviewers actually say.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {places.map((place, index) => (
              <div
                key={place.name}
                className="relative aspect-[3/4] overflow-hidden rounded-[22px] transition duration-leisurely ease-entrance group-hover:-translate-y-2"
                style={{ transitionDelay: `${index * 60}ms` }}
              >
                <Image src={place.image} alt={place.name} fill sizes="(min-width: 1024px) 220px, 33vw" className="object-cover" />
                <div className="absolute inset-0 bg-photo-scrim" />
                <span className="absolute right-2.5 top-2.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink-900">
                  👍 {place.votes}
                </span>
                <div className="absolute inset-x-3 bottom-3 text-white">
                  <p className="text-sm font-semibold leading-tight">{place.name}</p>
                  <p className="mt-1 text-[11px] leading-4 text-white/75">{place.note}</p>
                </div>
              </div>
            ))}
          </div>
        </Tile>

        <Tile className="lg:col-span-4" delay={0}>
          <TileHeading eyebrow="Day planner" title="Days that flow, not zig-zag." tone="text-sunset-600" />
          <p className="mt-3 max-w-md text-sm leading-6 text-ink-600">
            Buddy groups places by area and travel time, then hands each leg to Google Maps, Apple Maps or a cab app.
          </p>
          <div className="relative mt-8 overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#e2f6f5,#fbf4ea_60%)]">
            <svg viewBox="0 0 560 230" preserveAspectRatio="xMidYMid meet" className="h-[260px] w-full">
              <path d="M0 200 C 80 170, 60 120, 140 110 S 260 60, 300 40 S 420 10, 560 0 L 560 0 L 0 0 Z" fill="#b8ebe7" opacity="0.7" />
              <path
                d="M120 70 C 160 90, 190 130, 230 120 S 300 80, 330 92 S 410 150, 440 160"
                fill="none"
                stroke="#f25f3a"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="8 8"
                className="animate-dash"
              />
              {routeStops.map((stop, index) => (
                <g key={stop.label}>
                  <circle cx={stop.x} cy={stop.y} r="16" fill="#ffffff" stroke="#f25f3a" strokeWidth="3" />
                  <text x={stop.x} y={stop.y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#131021">
                    {index + 1}
                  </text>
                  <text x={stop.x} y={stop.y + 38} textAnchor="middle" fontSize="13" fill="#3c3654">
                    {stop.label}
                  </text>
                </g>
              ))}
            </svg>
            <div className="glass absolute right-4 top-4 rounded-[16px] px-4 py-2.5">
              <p className="text-xs font-semibold text-ink-900">Day 2 · North Goa</p>
              <p className="text-[11px] text-ink-500">4 stops · 18 km · ends at sunset</p>
            </div>
          </div>
        </Tile>

        <Tile className="lg:col-span-2" delay={0.1}>
          <div className="absolute inset-0 bg-[linear-gradient(160deg,#1e1a30,#4a35a0_70%,#7e62ec)]" />
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sunset-400/40 blur-3xl" />
          <div className="relative">
            <p className="eyebrow text-dusk-200">Buddy</p>
            <h3 className="display mt-3 text-3xl text-white lg:text-[2.4rem]">Guides, not just answers.</h3>
            <div className="mt-7 space-y-3">
              <div className="ml-auto w-fit max-w-[85%] rounded-[18px] rounded-br-md bg-white/15 px-4 py-2.5 text-sm text-white backdrop-blur">
                rainy day backup for the 30th?
              </div>
              <div className="flex gap-2.5">
                <BuddySpark className="shrink-0" />
                <div className="rounded-[18px] rounded-tl-md bg-white px-4 py-3 text-[13px] leading-5 text-ink-800">
                  Swap the beach for Fontainhas walks and Goa Chitra museum. Both indoors-ish, 15 min apart. Shall I update Day 4?
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Update Day 4", "Show on map", "Ask the group"].map((chip) => (
                <span key={chip} className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs text-white backdrop-blur">
                  {chip}
                </span>
              ))}
            </div>
            <p className="mt-8 text-xs leading-5 text-dusk-200">
              Knows your bookings, budget, group votes and the weather. Speaks Hinglish too.
            </p>
          </div>
        </Tile>

        <Tile className="lg:col-span-3" delay={0}>
          <TileHeading eyebrow="Money" title="Split it. Settle in one tap." tone="text-palm-600" />
          <div className="mt-7 space-y-2.5">
            {[
              { who: "Sara owes you", amount: "₹1,240", tone: "text-palm-600" },
              { who: "You owe Kabir", amount: "₹860", tone: "text-rose-500" },
              { who: "Meera owes Rohan", amount: "₹2,100", tone: "text-ink-500" }
            ].map((row) => (
              <div key={row.who} className="flex items-center justify-between rounded-[18px] bg-sand-50 px-4 py-3">
                <span className="text-sm text-ink-800">{row.who}</span>
                <span className={`font-mono text-sm font-semibold ${row.tone}`}>{row.amount}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-[18px] bg-ink-950 px-4 py-3 text-white">
            <span className="text-sm">Settle ₹1,240 with Sara</span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-950">Pay via UPI</span>
          </div>
        </Tile>

        <Tile className="lg:col-span-3" delay={0.1}>
          <TileHeading eyebrow="On the trip" title="It knows where you are." tone="text-lagoon-600" />
          <p className="mt-3 max-w-md text-sm leading-6 text-ink-600">
            Arrive somewhere you saved and Saayro asks if you made it, ready for photos and memories.
          </p>
          <div className="relative mt-7 flex items-center gap-4 rounded-[24px] border border-sand-200 p-4">
            <span className="relative flex h-14 w-14 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-lagoon-300/60" />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-lagoon-500 text-white">◉</span>
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink-900">You&apos;re at Fort Aguada</p>
              <p className="text-xs text-ink-500">Mark it visited and add a photo?</p>
            </div>
            <span className="rounded-full bg-lagoon-500 px-4 py-2 text-xs font-semibold text-white">Visited ✓</span>
          </div>
          <div className="mt-5">
            <div className="flex items-baseline justify-between text-xs text-ink-500">
              <span>Trip progress</span>
              <span>
                <span className="font-semibold text-ink-900">9</span> of 14 places
              </span>
            </div>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: 14 }, (_, index) => (
                <span key={index} className={`h-2 flex-1 rounded-full ${index < 9 ? "bg-lagoon-400" : "bg-ink-100"}`} />
              ))}
            </div>
          </div>
        </Tile>
      </div>
    </section>
  );
}
