import Image from "next/image";
import { CheckCheck, CloudRain, MapPin, PlaneLanding, PlaneTakeoff, Star } from "lucide-react";
import type { ReactNode } from "react";
import { BuddyMark } from "@/components/brand/buddy-mark";
import type { TripChapterArtifact } from "@/lib/goa-trip-story";
import { AvatarStack } from "./trip-artifacts";

const crew = ["Aarav", "Sara", "Kabir", "Meera", "Rohan"];

function Card({ children }: { children: ReactNode }) {
  return <div className="w-full max-w-[400px] rounded-[22px] bg-white p-4 shadow-soft ring-1 ring-sand-200">{children}</div>;
}

function ArrivalCard() {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lagoon-100 text-lagoon-700">
          <PlaneLanding className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink-900">6E 2134 landed · 07:25</p>
          <p className="text-xs text-ink-500">Bags on belt 3 · Dabolim (GOI)</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-sand-200 pt-3">
        <div>
          <p className="text-sm font-medium text-ink-800">Cab to Casa Saudade</p>
          <p className="text-xs text-ink-500">56 min · ₹1,850 · split 6 ways</p>
        </div>
        <AvatarStack names={crew} size="sm" />
      </div>
    </Card>
  );
}

const checkIns = [
  { place: "Anjuna", time: "10:40", done: true },
  { place: "Vagator", time: "15:05", done: true },
  { place: "Chapora Fort", time: "17:32", done: false }
];

function CheckInsCard() {
  return (
    <Card>
      <ul className="space-y-2.5">
        {checkIns.map((stop) => (
          <li key={stop.place} className="flex items-center gap-3">
            {stop.done ? (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-palm-100 text-palm-600">
                <CheckCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
              </span>
            ) : (
              <span className="relative flex h-7 w-7 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-sunset-300/60" />
                <span className="relative h-3 w-3 rounded-full bg-sunset-500 ring-2 ring-white" />
              </span>
            )}
            <span className={`flex-1 text-sm ${stop.done ? "text-ink-600" : "font-semibold text-ink-900"}`}>{stop.place}</span>
            <span className="font-mono text-[11px] text-ink-400">{stop.done ? `visited ${stop.time}` : "you're here"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-xl bg-marigold-100 px-3 py-2 text-xs text-marigold-700">Sunset around 6:10 pm. Grab the west wall.</p>
    </Card>
  );
}

function PlaceCard() {
  return (
    <Card>
      <div className="flex gap-3">
        <div className="relative h-[72px] w-[88px] shrink-0 overflow-hidden rounded-xl">
          <Image src="/destinations/goa-aguada.jpg" alt="Fort Aguada lighthouse" fill sizes="88px" className="object-cover" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900">Fort Aguada</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
            <Star className="h-3 w-3 fill-marigold-400 text-marigold-400" /> 4.5 · Open till 5:30 pm
          </p>
          <p className="mt-1 text-xs leading-5 text-ink-500">17th-century Portuguese fort and lighthouse</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2.5 border-t border-sand-200 pt-3">
        <BuddyMark size={24} />
        <p className="text-xs text-ink-600">
          <span className="font-semibold text-ink-900">Thalassa, 7:30 pm</span> · table for 6, held on 8 Dec
        </p>
      </div>
    </Card>
  );
}

function RainSwapCard() {
  return (
    <Card>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-lagoon-100 px-2.5 py-1 text-[11px] font-medium text-lagoon-700">
        <CloudRain className="h-3.5 w-3.5" /> Wed 30 Dec · 80% rain
      </span>
      <p className="mt-3 text-sm text-ink-400 line-through">Palolem beach day</p>
      <p className="mt-1 text-sm font-semibold text-ink-900">Fontainhas walk + Goan lunch in Panjim</p>
      <div className="mt-3 flex items-center justify-between border-t border-sand-200 pt-3">
        <AvatarStack names={crew} size="sm" />
        <span className="text-xs font-medium text-palm-700">5 of 6 voted yes</span>
      </div>
    </Card>
  );
}

function SettledCard() {
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-ink-500">Trip total</p>
        <p className="display text-2xl text-ink-950">₹1,08,600</p>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-ink-500">₹18,100 each</span>
        <span className="inline-flex items-center gap-1 font-medium text-palm-700">
          <CheckCheck className="h-3.5 w-3.5" /> Everyone settled
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-sand-200 pt-3 text-xs text-ink-600">
        <span className="flex items-center gap-1.5">
          <PlaneTakeoff className="h-3.5 w-3.5 text-lagoon-600" /> 6E 5318 · 21:40
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-sunset-500" /> 9 of 14 places visited
        </span>
      </div>
    </Card>
  );
}

export function TripStoryCard({ artifact }: { artifact: TripChapterArtifact }) {
  switch (artifact) {
    case "arrival":
      return <ArrivalCard />;
    case "check-ins":
      return <CheckInsCard />;
    case "place":
      return <PlaceCard />;
    case "rain-swap":
      return <RainSwapCard />;
    case "settled":
      return <SettledCard />;
  }
}
