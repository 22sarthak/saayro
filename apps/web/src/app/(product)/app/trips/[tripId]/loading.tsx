export default function TripLoadingPage() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="section-shell space-y-4">
        <div className="h-6 w-32 rounded-full bg-slate-100" />
        <div className="h-14 w-2/3 rounded-[20px] bg-slate-100" />
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 rounded-[24px] bg-slate-100" />
          ))}
        </div>
      </div>
      <div className="space-y-5">
        <div className="section-shell h-48 animate-pulse bg-slate-100" />
        <div className="section-shell h-64 animate-pulse bg-slate-100" />
      </div>
    </div>
  );
}

