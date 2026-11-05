import { Reveal } from "@/components/motion/reveal";
import { AvatarStack, BuddySpark } from "./trip-artifacts";

const steps = [
  { title: "Drop it in", body: "Tickets, Airbnb links, reels, voice notes, even your exported WhatsApp chat." },
  { title: "Buddy sorts it", body: "Flights become boarding passes, links become places with photos, reviews and hours." },
  { title: "Your crew decides", body: "Vote on places, split who books what, and lock the plan together." },
  { title: "Live it", body: "Today's plan, directions, check-ins and who owes whom, right when you need them." }
];

function ScatteredInputs() {
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-[440px]">
      <Reveal delay={0} className="absolute left-0 top-2 w-[260px] -rotate-3">
        <div className="rounded-[20px] rounded-tl-md bg-[#dcf8c6] p-3.5 shadow-soft">
          <p className="text-[11px] font-semibold text-palm-700">Kabir · Goa Gang 🌴</p>
          <p className="mt-1 text-sm text-ink-900">guys final hai: 27th morning flight, back on 1st 🙏 book karo</p>
          <p className="mt-1 text-right text-[10px] text-ink-400">11:42 pm</p>
        </div>
      </Reveal>

      <Reveal delay={0.12} className="absolute right-0 top-0 w-[170px] rotate-6">
        <div className="relative aspect-[9/14] overflow-hidden rounded-[22px] bg-[linear-gradient(160deg,#ffb37a,#ff7e8a_55%,#7e62ec)] p-3 shadow-elevated">
          <span className="absolute inset-0 flex items-center justify-center text-4xl text-white/90">▶</span>
          <p className="absolute bottom-3 left-3 right-3 text-[11px] font-semibold leading-4 text-white">
            @goafoodtrail
            <br />
            <span className="font-normal opacity-90">10 Assagao cafés you can&apos;t miss</span>
          </p>
        </div>
      </Reveal>

      <Reveal delay={0.24} className="absolute left-6 top-[150px] w-[230px] rotate-2">
        <div className="flex items-center gap-3 rounded-[18px] bg-white p-3 shadow-soft">
          <span className="flex h-11 w-9 items-center justify-center rounded-md bg-rose-100 text-[10px] font-bold text-rose-600">PDF</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-900">IndiGo_e-ticket.pdf</p>
            <p className="text-xs text-ink-500">212 KB · from Gmail</p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.36} className="absolute right-2 top-[262px] w-[250px] -rotate-2">
        <div className="rounded-[18px] bg-white p-3 shadow-soft">
          <p className="text-[11px] font-semibold text-rose-500">airbnb.co.in</p>
          <p className="truncate text-sm text-ink-900">rooms/8841… Villa in Assagao · 4BR pool</p>
        </div>
      </Reveal>

      <Reveal delay={0.48} className="absolute bottom-0 left-2 w-[220px] rotate-1">
        <div className="flex items-center gap-3 rounded-full bg-ink-950 py-2.5 pl-2.5 pr-4 shadow-elevated">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sunset-500 text-xs text-white">▶</span>
          <div className="flex h-5 flex-1 items-center gap-[3px]">
            {[6, 12, 18, 10, 16, 8, 14, 20, 9, 13, 7, 15, 11].map((height, index) => (
              <span key={index} className="w-[3px] rounded-full bg-white/70" style={{ height }} />
            ))}
          </div>
          <span className="text-[11px] text-white/70">0:24</span>
        </div>
      </Reveal>
    </div>
  );
}

function OrganisedTrip() {
  const rows = [
    { label: "Bookings", value: "2 flights · 1 stay", tone: "bg-lagoon-100 text-lagoon-700", icon: "✈" },
    { label: "Places", value: "14 saved · 6 voted in", tone: "bg-marigold-100 text-marigold-700", icon: "◉" },
    { label: "Plan", value: "5 days · balanced by area", tone: "bg-sunset-100 text-sunset-700", icon: "☰" },
    { label: "Money", value: "₹18.4k spent · 2 to settle", tone: "bg-palm-100 text-palm-700", icon: "₹" }
  ];

  return (
    <Reveal delay={0.2}>
      <div className="relative mx-auto w-full max-w-[420px] rounded-[32px] bg-white p-6 shadow-elevated">
        <div className="absolute -inset-px -z-10 rounded-[33px] bg-golden-hour opacity-60 blur-xl" />
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow text-sunset-600">Your trip</p>
            <p className="display mt-1 text-3xl text-ink-950">Goa, with the gang</p>
          </div>
          <AvatarStack names={["Aarav", "Sara", "Kabir", "Meera"]} size="sm" />
        </div>
        <div className="mt-6 space-y-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 rounded-[18px] border border-sand-200 p-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-[12px] text-base font-semibold ${row.tone}`}>{row.icon}</span>
              <div>
                <p className="text-sm font-semibold text-ink-900">{row.label}</p>
                <p className="text-xs text-ink-500">{row.value}</p>
              </div>
              <span className="ml-auto text-palm-500">✓</span>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-[18px] bg-dusk-100 p-3">
          <BuddySpark />
          <p className="text-[13px] leading-5 text-dusk-700">Nobody has booked the return cab yet. Want me to remind Rohan?</p>
        </div>
      </div>
    </Reveal>
  );
}

export function GatherSection() {
  return (
    <section id="how" className="relative mx-auto max-w-[1400px] px-5 py-28 lg:px-8 lg:py-36">
      <Reveal className="mx-auto max-w-3xl text-center">
        <p className="eyebrow text-sunset-600">How Saayro works</p>
        <h2 className="display mt-4 text-balance text-5xl text-ink-950 lg:text-7xl">
          Your trip is scattered. <em className="text-gradient-golden pr-1">Saayro gathers it.</em>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-ink-600">
          Half the plan lives in the group chat, the rest in saved reels and inbox tickets. Drop everything in and watch it become one trip.
        </p>
      </Reveal>

      <div className="mt-20 grid items-center gap-16 lg:grid-cols-[1fr_auto_1fr]">
        <ScatteredInputs />
        <div className="hidden flex-col items-center gap-3 lg:flex">
          <span className="h-24 w-px bg-gradient-to-b from-transparent via-sunset-300 to-transparent" />
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-buddy-sheen text-xl text-white shadow-buddyGlow">✦</span>
          <span className="h-24 w-px bg-gradient-to-b from-transparent via-dusk-300 to-transparent" />
        </div>
        <OrganisedTrip />
      </div>

      <div className="mt-24 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <Reveal key={step.title} delay={index * 0.1}>
            <div className="h-full rounded-[24px] border border-sand-200 bg-white/70 p-6 backdrop-blur transition duration-standard hover:-translate-y-1 hover:shadow-soft">
              <span className="display text-5xl text-sand-400">0{index + 1}</span>
              <p className="mt-4 text-lg font-semibold text-ink-900">{step.title}</p>
              <p className="mt-2 text-sm leading-6 text-ink-600">{step.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
