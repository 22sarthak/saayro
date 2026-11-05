import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowRight, Bike, Check, Clock, CloudRain, Fuel, MapPin, Navigation, PlaneLanding, Star, UtensilsCrossed } from "lucide-react";
import { BuddyMark } from "@/components/brand/buddy-mark";
import { Reveal } from "@/components/motion/reveal";
import { northGoaMap } from "@/lib/north-goa-route";
import { DayRouteMap } from "./day-route-map";
import { AvatarStack, BoardingPass } from "./trip-artifacts";

/** Corner washes keyed to each tile's meaning: sky = maps/flights, amber = discovery, violet = Buddy, mint = money/success. */
const washes = {
  sky: "radial-gradient(120% 90% at 100% 0%, rgba(90, 175, 226, 0.22), transparent 55%)",
  amber: "radial-gradient(120% 90% at 100% 0%, rgba(245, 176, 46, 0.2), transparent 55%)",
  violet: "radial-gradient(120% 90% at 100% 0%, rgba(162, 139, 244, 0.32), transparent 60%)",
  mint: "radial-gradient(120% 90% at 100% 0%, rgba(71, 190, 147, 0.22), transparent 55%)",
  dusk: "radial-gradient(120% 90% at 100% 0%, rgba(90, 175, 226, 0.2), transparent 50%), radial-gradient(90% 70% at 0% 100%, rgba(162, 139, 244, 0.16), transparent 60%)"
} as const;

type TileProps = { children: ReactNode; className?: string; delay?: number; wash: keyof typeof washes };

function Tile({ children, className = "", delay = 0, wash }: TileProps) {
  return (
    <Reveal delay={delay} className={className}>
      <div className="group relative h-full overflow-hidden rounded-[32px] border border-porcelain-200 bg-white p-7 shadow-soft transition duration-leisurely ease-entrance hover:-translate-y-1 hover:shadow-elevated">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: washes[wash] }} />
        <div className="relative h-full">{children}</div>
      </div>
    </Reveal>
  );
}

function TileHeading({ eyebrow, title, tone }: { eyebrow: string; title: string; tone: string }) {
  return (
    <div>
      <p className={`eyebrow ${tone}`}>{eyebrow}</p>
      <h3 className="display mt-3 text-3xl text-slate-900 lg:text-[2.4rem]">{title}</h3>
    </div>
  );
}

const dayStops = [
  { time: "10:00", place: "Casa Saudade, Assagao", note: "Scooters ready at the gate", leg: "18 min" },
  { time: "11:00", place: "Anjuna Beach", note: "Late breakfast at a shack", leg: "9 min" },
  { time: "15:00", place: "Vagator", note: "Cliff views, swim if calm", leg: "4 min" },
  { time: "17:30", place: "Chapora Fort", note: "Sunset around 6:10 pm" }
];

function DayPlannerTile() {
  return (
    <Tile className="lg:col-span-6" wash="sky">
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <TileHeading eyebrow="Day planner" title="Days that flow, not zig-zag." tone="text-sky-700" />
          <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
            Places are grouped by area and travel time, then every leg hands off to Google Maps, Apple Maps or a cab app.
          </p>

          <div className="mt-7 rounded-[22px] border border-porcelain-200 p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold text-slate-900">Day 2 · Mon 28 Dec</p>
              <p className="font-mono text-[11px] text-slate-400">
                {northGoaMap.distanceKm} km · {northGoaMap.durationMin} min riding
              </p>
            </div>
            <ol className="mt-4">
              {dayStops.map((stop, index) => (
                <li key={stop.place} className="relative flex gap-4 pb-4 last:pb-0">
                  {index < dayStops.length - 1 ? <span className="absolute left-[13px] top-7 h-[calc(100%-20px)] w-px bg-porcelain-300" /> : null}
                  <span
                    className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                      index === 0 ? "bg-slate-900" : "bg-sky-600"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{stop.place}</p>
                      <p className="font-mono text-xs text-slate-500">{stop.time}</p>
                    </div>
                    <p className="text-xs text-slate-500">{stop.note}</p>
                    {stop.leg ? (
                      <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-porcelain-100 px-2 py-0.5 text-[11px] text-slate-600">
                        <Bike className="h-3 w-3" /> {stop.leg}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["Google Maps", "Apple Maps", "Uber"].map((app) => (
              <span key={app} className="inline-flex items-center gap-1.5 rounded-full border border-porcelain-300 px-3.5 py-1.5 text-xs font-medium text-slate-700">
                <Navigation className="h-3 w-3" /> {app}
              </span>
            ))}
          </div>
        </div>

        <div className="min-h-[420px] lg:min-h-0">
          <DayRouteMap />
        </div>
      </div>
    </Tile>
  );
}

function PlacesTile() {
  return (
    <Tile className="lg:col-span-3" delay={0.1} wash="amber">
      <TileHeading eyebrow="Places & votes" title="Every reel, ranked by your crew." tone="text-amber-600" />

      <div className="mt-7 overflow-hidden rounded-[22px] border border-porcelain-200">
        <div className="relative h-44">
          <Image src="/destinations/goa-aguada.jpg" alt="Fort Aguada lighthouse" fill sizes="(min-width: 1024px) 600px, 100vw" className="object-cover" />
          <span className="absolute left-3 top-3 rounded-full bg-mint-500 px-2.5 py-1 text-[11px] font-semibold text-white">Locked in · Day 3</span>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-slate-900">Fort Aguada</p>
              <p className="text-xs text-slate-500">Fort & lighthouse · Candolim</p>
            </div>
            <div className="text-right">
              <p className="flex items-center justify-end gap-1 text-sm font-semibold text-slate-900">
                4.5 <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              </p>
              <p className="flex items-center gap-1 text-[11px] text-mint-600">
                <Clock className="h-3 w-3" /> Open · closes 5:30 pm
              </p>
            </div>
          </div>
          <div className="mt-3 rounded-[14px] bg-porcelain-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">From reviews & Reddit</p>
            <p className="mt-1 text-[13px] leading-5 text-slate-700">Best before 5 pm, weekends get crowded, and the lighthouse closes early. Pair with Sinquerim beach.</p>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <AvatarStack names={["Sara", "Kabir", "Meera", "Rohan", "Aarav"]} size="sm" />
            <p className="text-xs text-slate-600">
              <span className="font-semibold text-slate-900">5 of 6</span> want to go
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {[
          { name: "Dudhsagar Falls", kind: "Waterfall · Mollem", votes: "4 of 6", image: "/destinations/goa-dudhsagar.jpg" },
          { name: "Palolem Beach", kind: "Beach · Canacona", votes: "6 of 6", image: "/destinations/goa-palolem.jpg" }
        ].map((place) => (
          <div key={place.name} className="flex items-center gap-3 rounded-[16px] border border-porcelain-200 p-2 pr-4">
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[12px]">
              <Image src={place.image} alt="" fill sizes="48px" className="object-cover" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">{place.name}</p>
              <p className="text-xs text-slate-500">{place.kind}</p>
            </div>
            <span className="text-xs text-slate-500">{place.votes} votes</span>
          </div>
        ))}
      </div>
    </Tile>
  );
}

function WalletTile() {
  return (
    <Tile className="lg:col-span-3" wash="sky">
      <TileHeading eyebrow="Bookings wallet" title="Drop a ticket. Get a boarding pass." tone="text-sky-600" />
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
        Flights, trains, buses, stays, rentals and cruises, read from PDFs, screenshots or your inbox. Available offline.
      </p>
      <div className="mt-7 space-y-3">
        <div className="transition duration-leisurely group-hover:-rotate-1">
          <BoardingPass variant="paper" />
        </div>
        <div className="flex items-center gap-4 rounded-[22px] border border-porcelain-200 p-3 pr-4">
          <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-[14px]">
            <Image src="/destinations/goa-anjuna.jpg" alt="" fill sizes="96px" className="object-cover object-[50%_70%]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-rose-500">Airbnb · confirmed from email</p>
            <p className="truncate text-base font-semibold text-slate-900">Casa Saudade, Assagao</p>
            <p className="text-xs text-slate-500">Check-in Sun 27 Dec, 2 pm · 5 nights · 4BR</p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-[18px] bg-porcelain-50 px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-slate-800">
            <Bike className="h-4 w-4 text-slate-500" /> 3 × scooters, pickup at the villa
          </span>
          <span className="font-mono text-xs text-slate-500">27 Dec 11:00</span>
        </div>
        <div className="flex items-center justify-between rounded-[18px] bg-porcelain-50 px-4 py-3">
          <span className="flex items-center gap-2 text-sm text-slate-800">
            <PlaneLanding className="h-4 w-4 text-slate-500" /> Return · 6E 5318 · GOI → BLR
          </span>
          <span className="font-mono text-xs text-slate-500">1 Jan 21:40</span>
        </div>
      </div>
    </Tile>
  );
}

function BuddyTile() {
  return (
    <Tile className="lg:col-span-2" delay={0} wash="violet">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-200/60 blur-3xl" />
      <div className="relative">
        <TileHeading eyebrow="Buddy" title="Guides, not just answers." tone="text-violet-600" />
        <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] text-sky-700 shadow-soft">
          <CloudRain className="h-3.5 w-3.5" /> Forecast for Wed 30 Dec · 80% rain
        </p>
        <div className="mt-4 flex gap-2.5">
          <BuddyMark size={28} />
          <p className="text-[13px] leading-5 text-slate-700">Rain is likely on your beach day. I&apos;d swap it with something covered nearby:</p>
        </div>
        <div className="mt-4 rounded-[18px] bg-white p-4 shadow-soft ring-1 ring-violet-100">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Day 4 · Wed 30 Dec</p>
          <p className="mt-2 text-sm text-slate-400 line-through">Palolem beach day</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <ArrowRight className="h-3.5 w-3.5 text-violet-500" /> Fontainhas walk + Goa Chitra
          </p>
          <div className="mt-4 flex gap-2">
            <span className="flex-1 rounded-full bg-slate-900 py-2 text-center text-xs font-semibold text-white">Swap it</span>
            <span className="flex-1 rounded-full border border-porcelain-300 py-2 text-center text-xs font-medium text-slate-700">Keep plan</span>
          </div>
        </div>
      </div>
    </Tile>
  );
}

const expenses = [
  { label: "Thalassa dinner", meta: "Kabir paid · split 6", amount: "₹9,600", Icon: UtensilsCrossed },
  { label: "Scooters × 3", meta: "Rohan paid · split 6", amount: "₹2,700", Icon: Bike },
  { label: "Petrol", meta: "You paid · split 3", amount: "₹600", Icon: Fuel }
];

function MoneyTile() {
  return (
    <Tile className="lg:col-span-2" delay={0.08} wash="mint">
      <TileHeading eyebrow="Money" title="Split it. Settle in one tap." tone="text-mint-600" />
      <div className="mt-6 divide-y divide-porcelain-200">
        {expenses.map(({ label, meta, amount, Icon }) => (
          <div key={label} className="flex items-center gap-3 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-porcelain-100 text-slate-600">
              <Icon className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">{label}</p>
              <p className="text-[11px] text-slate-500">{meta}</p>
            </div>
            <span className="font-mono text-sm text-slate-900">{amount}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-[18px] bg-mint-100 p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-mint-700">Sara owes you</p>
          <p className="font-mono text-lg font-semibold text-mint-700">₹1,240</p>
        </div>
        <p className="mt-3 rounded-full bg-slate-950 py-2.5 text-center text-xs font-semibold text-white">Request via UPI</p>
        <p className="mt-2 text-center text-[11px] text-mint-700/80">Opens GPay, PhonePe or Paytm</p>
      </div>
    </Tile>
  );
}

function OnTripTile() {
  return (
    <Tile className="lg:col-span-2" delay={0.16} wash="dusk">
      <TileHeading eyebrow="On the trip" title="It knows where you are." tone="text-sky-600" />
      <div className="relative mt-6 overflow-hidden rounded-[24px]">
        <Image src="/destinations/goa-palolem.jpg" alt="" fill sizes="(min-width: 1024px) 400px, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-slate-950/45" />
        <div className="relative px-4 pb-4 pt-5 text-center text-white">
          <p className="text-[11px] text-white/75">Monday, 28 December</p>
          <p className="display text-5xl">17:48</p>
          <div className="glass-strong mt-4 rounded-[18px] p-3 text-left">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="flex h-4 w-4 items-center justify-center rounded-[5px] bg-aurora text-[9px] font-bold text-white">S</span>
              SAAYRO · now
            </div>
            <p className="mt-1.5 text-sm font-semibold text-slate-900">You&apos;re at Chapora Fort</p>
            <p className="text-xs text-slate-600">Sunset in 22 minutes. Mark it visited?</p>
            <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-xs font-semibold">
              <span className="flex items-center justify-center gap-1 rounded-[10px] bg-sky-500 py-1.5 text-white">
                <Check className="h-3.5 w-3.5" /> Visited
              </span>
              <span className="rounded-[10px] bg-slate-950/5 py-1.5 text-center text-slate-700">Later</span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex -space-x-2">
          {["goa-aguada", "goa-anjuna", "goa-dudhsagar"].map((slug) => (
            <span key={slug} className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-white">
              <Image src={`/destinations/${slug}.jpg`} alt="" fill sizes="36px" className="object-cover" />
            </span>
          ))}
        </div>
        <p className="flex items-center gap-1 text-xs text-slate-600">
          <MapPin className="h-3.5 w-3.5 text-sky-500" />
          <span className="font-semibold text-slate-900">9 of 14</span> places visited
        </p>
      </div>
    </Tile>
  );
}

export function FeatureBento() {
  return (
    <section id="features" className="mx-auto max-w-[1400px] px-5 pb-28 lg:px-8 lg:pb-36">
      <Reveal className="mb-14 max-w-3xl">
        <p className="eyebrow text-sky-600">Everything for the trip</p>
        <h2 className="hues-fresh display mt-4 text-balance text-5xl text-slate-950 lg:text-7xl">
          From the first idea to <em>the last settle-up.</em>
        </h2>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-6">
        <WalletTile />
        <PlacesTile />
        <DayPlannerTile />
        <BuddyTile />
        <MoneyTile />
        <OnTripTile />
      </div>
    </section>
  );
}
