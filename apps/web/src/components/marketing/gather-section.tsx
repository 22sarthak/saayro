import Image from "next/image";
import type { ReactNode } from "react";
import { Bookmark, CheckCheck, Heart, MessageCircle, Music2, Play, Send, Star } from "lucide-react";
import { BuddyMark } from "@/components/brand/buddy-mark";
import { Reveal } from "@/components/motion/reveal";
import { AvatarStack } from "./trip-artifacts";

const steps = [
  { title: "Drop it in", body: "Tickets, Airbnb links, reels, voice notes, even your exported WhatsApp chat." },
  { title: "It sorts itself", body: "Flights become boarding passes. Links become places with photos, reviews and hours." },
  { title: "Your crew decides", body: "Vote on places, split who books what, lock the plan together." },
  { title: "Live it", body: "Today's plan, directions, check-ins and who owes whom, right when you need them." }
];

const chat = [
  { name: "Meera", color: "text-[#c2410c]", text: "assagao villa wala link bhejo na", time: "11:38 pm" },
  { name: "Kabir", color: "text-[#0f766e]", text: "final: 27th morning flight, back on 1st. sab book karo 🙏", time: "11:42 pm" },
  { name: "Sara", color: "text-[#7c3aed]", text: "and Thalassa on the 29th, non negotiable", time: "11:43 pm" }
];

function GroupChat() {
  return (
    <div className="w-[300px] overflow-hidden rounded-[22px] bg-white shadow-elevated ring-1 ring-black/5">
      <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3">
        <AvatarStack names={["Kabir", "Meera"]} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-900">Goa Gang 🌴</p>
          <p className="truncate text-[11px] text-ink-400">Aarav, Kabir, Meera, Rohan, Sara, You</p>
        </div>
      </div>
      <div className="space-y-1.5 bg-[#efeae2] px-3 py-3">
        {chat.map((message) => (
          <div key={message.time} className="w-fit max-w-[88%] rounded-[12px] rounded-tl-[4px] bg-white px-2.5 py-1.5 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
            <p className={`text-[11px] font-semibold ${message.color}`}>{message.name}</p>
            <p className="text-[13px] leading-[18px] text-ink-900">{message.text}</p>
            <p className="mt-0.5 text-right text-[10px] text-ink-400">{message.time}</p>
          </div>
        ))}
        <div className="ml-auto w-fit rounded-[12px] rounded-tr-[4px] bg-[#d9fdd3] px-2.5 py-1.5">
          <p className="text-[13px] text-ink-900">putting it all in Saayro</p>
          <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-ink-400">
            11:44 pm <CheckCheck className="h-3 w-3 text-[#53bdeb]" />
          </p>
        </div>
      </div>
    </div>
  );
}

function ReelFrame() {
  return (
    <div className="relative aspect-[9/16] w-[190px] overflow-hidden rounded-[22px] bg-ink-950 shadow-elevated ring-1 ring-black/10">
      <Image src="/destinations/goa-palolem.jpg" alt="" fill sizes="190px" className="object-cover object-[30%_50%]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.35),transparent_25%,transparent_55%,rgba(0,0,0,0.75))]" />
      <p className="absolute left-3 top-3 text-sm font-semibold text-white">Reels</p>
      <div className="absolute bottom-28 right-2.5 flex flex-col items-center gap-3.5 text-white">
        <Heart className="h-5 w-5" />
        <MessageCircle className="h-5 w-5" />
        <Send className="h-5 w-5" />
        <Bookmark className="h-5 w-5 fill-white" />
      </div>
      <div className="absolute inset-x-3 bottom-3 text-white">
        <div className="flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-marigold-300 ring-1 ring-white" />
          <span className="text-[11px] font-semibold">konkan.diaries</span>
          <span className="rounded-md border border-white/60 px-1.5 text-[10px]">Follow</span>
        </div>
        <p className="mt-1.5 text-[11px] leading-4">Palolem at 6pm hits different. Kayak to Butterfly Island 🌅</p>
        <p className="mt-1 flex items-center gap-1 text-[10px] text-white/80">
          <Music2 className="h-3 w-3" /> original audio
        </p>
      </div>
    </div>
  );
}

function TicketPreview() {
  return (
    <div className="w-[210px] rounded-[16px] bg-white p-2 shadow-elevated ring-1 ring-black/5">
      <div className="rounded-[10px] border border-ink-100 bg-[#fcfcfd] p-3">
        <div className="flex items-center justify-between">
          <span className="h-2 w-12 rounded-full bg-ink-800" />
          <span className="font-mono text-[9px] tracking-widest text-ink-400">E-TICKET</span>
        </div>
        <p className="mt-3 font-mono text-[15px] font-semibold text-ink-900">BLR → GOI</p>
        <p className="font-mono text-[9px] text-ink-400">27 DEC 2026 · 06:10 · SEAT 14C</p>
        <div className="mt-3 space-y-1">
          <span className="block h-1.5 w-full rounded-full bg-ink-100" />
          <span className="block h-1.5 w-4/5 rounded-full bg-ink-100" />
          <span className="block h-1.5 w-3/5 rounded-full bg-ink-100" />
        </div>
        <div className="mt-3 flex h-6 items-end gap-[2px]">
          {[3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1, 3, 1, 2, 2, 1, 3, 1].map((width, index) => (
            <span key={index} className="h-full bg-ink-900" style={{ width }} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 px-1 pb-0.5 pt-2">
        <span className="rounded bg-rose-500 px-1 py-0.5 text-[8px] font-bold text-white">PDF</span>
        <span className="truncate text-[11px] font-medium text-ink-700">IndiGo_e-ticket.pdf</span>
      </div>
    </div>
  );
}

function StayLinkPreview() {
  return (
    <div className="w-[250px] overflow-hidden rounded-[16px] bg-white shadow-elevated ring-1 ring-black/5">
      <div className="relative h-[110px]">
        <Image src="/destinations/goa-anjuna.jpg" alt="" fill sizes="250px" className="object-cover object-[50%_70%]" />
      </div>
      <div className="p-3">
        <p className="text-[11px] text-ink-400">airbnb.co.in</p>
        <p className="mt-0.5 text-[13px] font-semibold leading-5 text-ink-900">Casa Saudade · Villa in Assagao</p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-500">
          <Star className="h-3 w-3 fill-ink-900 text-ink-900" /> 4.92 · 4 bedrooms · private pool
        </p>
      </div>
    </div>
  );
}

function VoiceNote() {
  return (
    <div className="flex w-[230px] items-center gap-3 rounded-[16px] bg-white px-3 py-2.5 shadow-elevated ring-1 ring-black/5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-950">
        <Play className="ml-0.5 h-3.5 w-3.5 fill-white text-white" />
      </span>
      <div className="flex-1">
        <div className="flex h-5 items-center gap-[2px]">
          {[5, 9, 14, 8, 12, 6, 11, 16, 7, 10, 5, 13, 9, 6, 11, 8].map((height, index) => (
            <span key={index} className={`w-[2.5px] rounded-full ${index < 6 ? "bg-sunset-500" : "bg-ink-200"}`} style={{ height }} />
          ))}
        </div>
        <p className="mt-0.5 text-[10px] text-ink-400">Rohan · 0:24</p>
      </div>
    </div>
  );
}

function ScatteredInputs() {
  return (
    <div className="relative mx-auto h-[680px] w-full max-w-[540px]">
      <Reveal delay={0} className="absolute left-0 top-0 -rotate-2">
        <GroupChat />
      </Reveal>
      <Reveal delay={0.12} className="absolute right-0 top-10 rotate-3">
        <ReelFrame />
      </Reveal>
      <Reveal delay={0.24} className="absolute left-2 top-[410px] -rotate-1">
        <TicketPreview />
      </Reveal>
      <Reveal delay={0.36} className="absolute right-0 top-[400px] rotate-2">
        <StayLinkPreview />
      </Reveal>
      <Reveal delay={0.48} className="absolute bottom-0 left-[150px] -rotate-1">
        <VoiceNote />
      </Reveal>
    </div>
  );
}

function TripRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-sand-200 py-3.5 first:border-t-0 first:pt-0">
      <p className="eyebrow text-ink-400">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function OrganisedTrip() {
  const days = [
    { day: "D1", area: "Assagao" },
    { day: "D2", area: "North" },
    { day: "D3", area: "South" },
    { day: "D4", area: "Panjim" },
    { day: "D5", area: "Slow" }
  ];

  return (
    <Reveal delay={0.2}>
      <div className="mx-auto w-full max-w-[420px] rounded-[28px] bg-white p-6 shadow-elevated ring-1 ring-black/5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-ink-400">27 Dec – 1 Jan · 6 people</p>
            <p className="display mt-1 text-[2rem] text-ink-950">Goa, with the gang</p>
          </div>
          <AvatarStack names={["Aarav", "Sara", "Kabir", "Meera", "Rohan"]} size="sm" />
        </div>

        <div className="mt-5">
          <TripRow label="Bookings">
            <div className="flex items-center justify-between rounded-[12px] bg-sand-50 px-3 py-2 font-mono text-xs text-ink-800">
              <span>6E 2134 · BLR → GOI</span>
              <span className="text-ink-400">27 Dec 06:10</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between rounded-[12px] bg-sand-50 px-3 py-2 text-xs text-ink-800">
              <span>Casa Saudade, Assagao</span>
              <span className="font-medium text-palm-600">Confirmed</span>
            </div>
          </TripRow>

          <TripRow label="Places">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                {["goa-aguada", "goa-palolem", "goa-dudhsagar"].map((slug) => (
                  <span key={slug} className="relative h-10 w-10 overflow-hidden rounded-[10px] ring-2 ring-white">
                    <Image src={`/destinations/${slug}.jpg`} alt="" fill sizes="40px" className="object-cover" />
                  </span>
                ))}
              </div>
              <p className="text-xs text-ink-600">
                <span className="font-semibold text-ink-900">14 saved</span>, 6 locked in by votes
              </p>
            </div>
          </TripRow>

          <TripRow label="Plan">
            <div className="grid grid-cols-5 gap-1.5">
              {days.map((item) => (
                <div key={item.day} className="rounded-[10px] border border-sand-200 px-1 py-1.5 text-center">
                  <p className="text-[11px] font-semibold text-ink-900">{item.day}</p>
                  <p className="text-[10px] text-ink-400">{item.area}</p>
                </div>
              ))}
            </div>
          </TripRow>

          <TripRow label="Money">
            <div className="flex items-baseline justify-between text-xs text-ink-600">
              <span>
                <span className="font-semibold text-ink-900">₹18.4k</span> of ₹25k
              </span>
              <span>Sara owes you ₹1,240</span>
            </div>
            <div className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-ink-100">
              <span className="w-[33%] bg-sunset-400" />
              <span className="w-[25%] bg-marigold-400" />
              <span className="w-[15%] bg-lagoon-400" />
            </div>
          </TripRow>
        </div>

        <div className="mt-2 flex items-start gap-3 rounded-[16px] bg-dusk-100/70 p-3">
          <BuddyMark size={26} />
          <p className="text-[13px] leading-5 text-ink-800">
            No one has booked the cab back to the airport on the 1st. <span className="font-semibold text-dusk-700">Remind Rohan?</span>
          </p>
        </div>
      </div>
    </Reveal>
  );
}

function FlowConnector() {
  return (
    <div className="hidden w-32 flex-col items-center gap-3 lg:flex">
      <svg viewBox="0 0 120 260" className="h-[260px] w-full" fill="none">
        {[20, 75, 130, 185, 240].map((y) => (
          <path key={y} d={`M0 ${y} C 60 ${y}, 60 130, 120 130`} stroke="#d6bc9a" strokeWidth="1.5" strokeDasharray="4 6" className="animate-dash" />
        ))}
      </svg>
    </div>
  );
}

export function GatherSection() {
  return (
    <section id="how" className="relative mx-auto max-w-[1400px] px-5 py-28 lg:px-8 lg:py-36">
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="eyebrow text-sunset-600">How Saayro works</p>
        <h2 className="display mt-4 text-balance text-5xl text-ink-950 lg:text-7xl">
          Your trip is scattered. <em className="text-sunset-600">Saayro gathers it.</em>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-ink-600">
          Half the plan lives in the group chat, the rest in saved reels and inbox tickets. Drop everything in and watch it become one trip.
        </p>
      </Reveal>

      <div className="mt-20 grid items-center gap-12 lg:grid-cols-[1fr_auto_1fr]">
        <ScatteredInputs />
        <FlowConnector />
        <OrganisedTrip />
      </div>

      <div className="mt-24 grid gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {steps.map((step, index) => (
          <Reveal key={step.title} delay={index * 0.08}>
            <div className="border-t border-ink-900 pt-5">
              <p className="font-mono text-xs text-ink-400">Step {index + 1}</p>
              <p className="display mt-3 text-2xl text-ink-950">{step.title}</p>
              <p className="mt-2 text-sm leading-6 text-ink-600">{step.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
