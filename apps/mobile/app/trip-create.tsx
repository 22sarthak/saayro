import { buildDestinationLabel, searchIndiaDestinations, type BackendTripListItem, type BackendTripRead, type TravelerParty } from "@saayro/types";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AppTabShell } from "@/components/layout/app-tab-shell";
import { EmptyStateBlock } from "@/components/layout/empty-state-block";
import { LoadingBlock } from "@/components/layout/loading-block";
import { ActionButton } from "@/components/primitives/action-button";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { useAuth } from "@/lib/auth";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

type TripDraft = {
  title: string;
  destinationCity: string;
  destinationRegion: string;
  destinationCountry: string;
  startDate: string;
  endDate: string;
  party: TravelerParty;
  overview: string;
  highlights: string;
};

const defaultDraft: TripDraft = {
  title: "",
  destinationCity: "",
  destinationRegion: "",
  destinationCountry: "India",
  startDate: "",
  endDate: "",
  party: "couple",
  overview: "",
  highlights: "",
};

const allowedParties: TravelerParty[] = ["solo", "couple", "family", "friends", "business"];

function normalizeDraft(trip: BackendTripRead): TripDraft {
  return {
    title: trip.title,
    destinationCity: trip.destination_city,
    destinationRegion: trip.destination_region,
    destinationCountry: trip.destination_country,
    startDate: trip.start_date,
    endDate: trip.end_date,
    party: trip.party,
    overview: trip.overview,
    highlights: trip.highlights.join(", "),
  };
}

export default function TripCreateScreen() {
  const theme = useMobileTheme();
  const {
    session,
    status,
    listTrips,
    getTrip,
    createTrip,
    updateTrip,
    attachPreTripBuddyToTrip,
  } = useAuth();
  const params = useLocalSearchParams<{ create?: string | string[]; tripId?: string | string[]; source?: string | string[] }>();
  const createRequested = Array.isArray(params.create) ? params.create[0] === "1" : params.create === "1";
  const selectedTripParam = Array.isArray(params.tripId) ? (params.tripId[0] ?? null) : (params.tripId ?? null);
  const source = Array.isArray(params.source) ? (params.source[0] ?? null) : (params.source ?? null);
  const [trips, setTrips] = useState<BackendTripListItem[]>([]);
  const [mode, setMode] = useState<"browse" | "create" | "edit">("browse");
  const [selectedTripId, setSelectedTripId] = useState<string | null>(selectedTripParam);
  const [draft, setDraft] = useState<TripDraft>(defaultDraft);
  const [destinationQuery, setDestinationQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const matches = useMemo(() => searchIndiaDestinations(destinationQuery).slice(0, 8), [destinationQuery]);
  const inputStyle = {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.body,
    fontSize: 14,
  } as const;

  useEffect(() => {
    if (status !== "ready") {
      setLoading(true);
      return;
    }

    if (!session?.authenticated) {
      setLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      setLoading(true);
      try {
        const nextTrips = await listTrips();
        if (!active) {
          return;
        }
        setTrips(nextTrips);

        if (nextTrips.length === 0 || createRequested) {
          setMode("create");
          setSelectedTripId(null);
          setDraft(defaultDraft);
          setLoading(false);
          return;
        }

        if (selectedTripParam) {
          const selected = nextTrips.find((trip) => trip.id === selectedTripParam);
          if (selected) {
            setMode("edit");
            setSelectedTripId(selected.id);
          } else {
            setMode("browse");
            setSelectedTripId(nextTrips[0]?.id ?? null);
          }
        } else {
          setMode("browse");
          setSelectedTripId(nextTrips[0]?.id ?? null);
        }
        setLoading(false);
      } catch (error) {
        if (!active) {
          return;
        }
        setMessage(error instanceof Error ? error.message : "Trip Hub could not load right now.");
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [createRequested, listTrips, selectedTripParam, session?.authenticated, status]);

  useEffect(() => {
    if (status !== "ready" || !session?.authenticated || mode !== "edit" || !selectedTripId) {
      return;
    }

    let active = true;
    void getTrip(selectedTripId)
      .then((trip) => {
        if (!active) {
          return;
        }
        setDraft(normalizeDraft(trip));
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setMessage(error instanceof Error ? error.message : "Trip details could not load right now.");
      });

    return () => {
      active = false;
    };
  }, [getTrip, mode, selectedTripId, session?.authenticated, status]);

  const applyDestination = (destination: ReturnType<typeof searchIndiaDestinations>[number]) => {
    setDestinationQuery(`${destination.city}, ${destination.region}`);
    setDraft((current) => ({
      ...current,
      title: current.title || `${destination.city} trip`,
      destinationCity: destination.city,
      destinationRegion: destination.region,
      destinationCountry: destination.country,
      overview: current.overview || `A premium ${destination.city} plan shaped around ${destination.highlights.slice(0, 2).join(" and ")}.`,
      highlights: current.highlights || destination.highlights.slice(0, 3).join(", "),
    }));
  };

  const routeToTrip = (tripId: string) => {
    router.push(`/(tabs)/trips?tripId=${encodeURIComponent(tripId)}`);
  };

  const openCreateMode = () => {
    setMode("create");
    setSelectedTripId(null);
    setDraft(defaultDraft);
    setMessage(null);
    const nextSource = source ? `&source=${encodeURIComponent(source)}` : "";
    router.replace(`/trip-create?create=1${nextSource}`);
  };

  const startEditMode = (tripId: string) => {
    setMode("edit");
    setSelectedTripId(tripId);
    setMessage(null);
    router.replace(`/trip-create?tripId=${encodeURIComponent(tripId)}`);
  };

  const handleSubmit = () => {
    if (!allowedParties.includes(draft.party)) {
      setMessage("Choose a valid traveler party before saving the trip.");
      return;
    }

    setPending(true);
    setMessage(null);
    const payload = {
      title: draft.title,
      destinationCity: draft.destinationCity,
      destinationRegion: draft.destinationRegion,
      destinationCountry: draft.destinationCountry,
      startDate: draft.startDate,
      endDate: draft.endDate,
      party: draft.party,
      overview: draft.overview,
      highlights: draft.highlights.split(",").map((item) => item.trim()).filter(Boolean),
    };

    void (mode === "edit" && selectedTripId ? updateTrip(selectedTripId, payload) : createTrip(payload))
      .then(async (trip) => {
        if (mode !== "edit" && source === "buddy") {
          await attachPreTripBuddyToTrip(trip.id);
        }
        routeToTrip(trip.id);
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Trip Hub could not save this trip yet.");
      })
      .finally(() => {
        setPending(false);
      });
  };

  if (status !== "ready" || loading) {
    return (
      <AppTabShell
        section="Trip Hub"
        title="Loading the trip bridge."
        subtitle="Trip Hub should stay calm while the live trip list and planner draft settle into place."
      >
        <LoadingBlock lines={4} tone="connected" />
        <LoadingBlock lines={5} />
      </AppTabShell>
    );
  }

  if (!session?.authenticated) {
    return (
      <AppTabShell
        section="Trip Hub"
        title="Sign in to open Trip Hub."
        subtitle="Trip creation and editing stay tied to the signed-in planning workspace."
      >
        <EmptyStateBlock
          eyebrow="Authentication required"
          title="Open the planning workspace first"
          description="Sign in, complete onboarding if needed, and Trip Hub becomes the bridge into live planning."
          actionLabel="Sign in"
          onAction={() => router.replace("/sign-in")}
          tone="connected"
        />
      </AppTabShell>
    );
  }

  return (
    <AppTabShell
      section="Trip Hub"
      title={trips.length ? "Open or shape a live trip." : "Create the first live trip."}
      subtitle={
        source === "buddy"
          ? "This create path stays linked to Buddy so the pre-trip planning thread can move into the new trip."
          : "Search stays intentionally curated for India in this step so the product does not pretend to be a live places API."
      }
    >
      <SurfaceCard tone="connected">
        <View style={{ gap: theme.spacing.md }}>
          <View style={{ gap: theme.spacing.xs }}>
            <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>Trip Hub</Text>
            <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 19 }}>
              {trips.length
                ? "Open a trip, tighten the details, or start a new destination-first plan."
                : "This is now the real mobile bridge into planning instead of a dead-end escape hatch."}
            </Text>
          </View>
          <ActionButton label="Create trip" variant={mode === "create" ? "primary" : "secondary"} onPress={openCreateMode} />
        </View>
      </SurfaceCard>

      <SurfaceCard tone="raised">
        <View style={{ gap: theme.spacing.md }}>
          <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>Existing trips</Text>
          {trips.length ? (
            <View style={{ gap: theme.spacing.sm }}>
              {trips.map((trip) => (
                <SurfaceCard key={trip.id} tone="raised">
                  <View style={{ gap: theme.spacing.sm }}>
                    <View style={{ gap: theme.spacing.xs }}>
                      <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 15 }}>{trip.title}</Text>
                      <Text style={{ color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: 13 }}>
                        {buildDestinationLabel(trip.destination_city, trip.destination_region, trip.destination_country)}
                      </Text>
                      <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 12 }}>
                        {trip.start_date} to {trip.end_date}
                      </Text>
                    </View>
                    <View style={{ gap: theme.spacing.sm }}>
                      <ActionButton label="Open trip" variant="secondary" onPress={() => routeToTrip(trip.id)} />
                      <ActionButton
                        label={selectedTripId === trip.id && mode === "edit" ? "Editing this trip" : "Edit trip"}
                        variant={selectedTripId === trip.id && mode === "edit" ? "primary" : "secondary"}
                        onPress={() => startEditMode(trip.id)}
                      />
                    </View>
                  </View>
                </SurfaceCard>
              ))}
            </View>
          ) : (
            <EmptyStateBlock
              eyebrow="No live trip yet"
              title="Create the first trip here"
              description="Trip Hub is now the practical bridge into planning. Start with a curated India destination and shape the basics before the trip opens."
              actionLabel="Start first trip"
              onAction={openCreateMode}
              tone="connected"
            />
          )}
        </View>
      </SurfaceCard>

      {(mode === "create" || mode === "edit") ? (
        <SurfaceCard tone="raised">
          <View style={{ gap: theme.spacing.md }}>
            <Text style={{ color: theme.colors.textPrimary, fontFamily: theme.fonts.bodyMedium, fontSize: 16 }}>
              {mode === "create" ? "Build a destination-first plan" : "Tighten the trip details"}
            </Text>
            <TextInput value={destinationQuery} onChangeText={setDestinationQuery} placeholder="Search curated India destinations" style={inputStyle} />
            <View style={{ gap: theme.spacing.sm }}>
              {matches.map((destination) => (
                <ActionButton
                  key={destination.id}
                  label={`${destination.city}, ${destination.region}`}
                  variant="secondary"
                  onPress={() => applyDestination(destination)}
                />
              ))}
            </View>
            <TextInput value={draft.title} onChangeText={(value) => setDraft((current) => ({ ...current, title: value }))} placeholder="Trip title" style={inputStyle} />
            <TextInput value={draft.destinationCity} onChangeText={(value) => setDraft((current) => ({ ...current, destinationCity: value }))} placeholder="Destination city" style={inputStyle} />
            <TextInput value={draft.destinationRegion} onChangeText={(value) => setDraft((current) => ({ ...current, destinationRegion: value }))} placeholder="State / region" style={inputStyle} />
            <TextInput value={draft.startDate} onChangeText={(value) => setDraft((current) => ({ ...current, startDate: value }))} placeholder="Start date (YYYY-MM-DD)" style={inputStyle} />
            <TextInput value={draft.endDate} onChangeText={(value) => setDraft((current) => ({ ...current, endDate: value }))} placeholder="End date (YYYY-MM-DD)" style={inputStyle} />
            <TextInput value={draft.party} onChangeText={(value) => setDraft((current) => ({ ...current, party: value as TravelerParty }))} placeholder="Party (solo, couple, family, friends, business)" style={inputStyle} />
            <TextInput value={draft.overview} onChangeText={(value) => setDraft((current) => ({ ...current, overview: value }))} placeholder="Trip overview" style={inputStyle} multiline />
            <TextInput value={draft.highlights} onChangeText={(value) => setDraft((current) => ({ ...current, highlights: value }))} placeholder="Highlights, comma separated" style={inputStyle} />
            <ActionButton
              label={pending ? "Saving..." : mode === "create" ? "Create trip" : "Save trip"}
              onPress={handleSubmit}
              disabled={pending}
            />
            {mode === "edit" ? <ActionButton label="Start a new trip" variant="secondary" onPress={openCreateMode} /> : null}
            {message ? (
              <Text style={{ color: "#9C3D34", fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 20 }}>{message}</Text>
            ) : null}
          </View>
        </SurfaceCard>
      ) : null}
    </AppTabShell>
  );
}
