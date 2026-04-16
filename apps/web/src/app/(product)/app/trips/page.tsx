import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/ui/button-link";
import { StatePanel } from "@/components/ui/state-panel";
import { fetchServerSession } from "@/lib/auth-server";
import { getFeaturedTrip } from "@/lib/mock-selectors";
import { fetchServerTripSummaries } from "@/lib/trip-server";

export default async function TripsIndexPage() {
  const session = await fetchServerSession();

  if (session?.authenticated) {
    const trips = await fetchServerTripSummaries();
    const firstTrip = trips?.[0];
    if (firstTrip) {
      redirect(`/app/trips/${firstTrip.id}`);
    }

    return (
      <div className="space-y-5">
        <StatePanel
          eyebrow="Trip hub"
          title="No live trip yet, but the structure is ready."
          description="Once a trip exists, this route becomes the active planner hub for itinerary flow, exports, and connected travel review."
          tone="connected"
          actions={<ButtonLink href="/app" variant="primary">Return to dashboard</ButtonLink>}
        />
      </div>
    );
  }

  const fallbackTrip = getFeaturedTrip();
  redirect(`/app/trips/${fallbackTrip.id}`);
}
