import { redirect } from "next/navigation";
import { TripHubEntry } from "@/components/trips/trip-hub-entry";
import { fetchServerSession } from "@/lib/auth-server";
import { getFeaturedTrip } from "@/lib/mock-selectors";
import { fetchServerTripSummaries } from "@/lib/trip-server";

export default async function TripsIndexPage() {
  const session = await fetchServerSession();

  if (session?.authenticated) {
    const trips = (await fetchServerTripSummaries()) ?? [];
    return <TripHubEntry initialTrips={trips} />;
  }

  const fallbackTrip = getFeaturedTrip();
  redirect(`/app/trips/${fallbackTrip.id}`);
}
