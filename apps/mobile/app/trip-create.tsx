import { searchIndiaDestinations, type TravelerParty } from "@saayro/types";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AppTabShell } from "@/components/layout/app-tab-shell";
import { ActionButton } from "@/components/primitives/action-button";
import { SurfaceCard } from "@/components/primitives/surface-card";
import { useAuth } from "@/lib/auth";
import { useMobileTheme } from "@/theme/mobile-theme-provider";

export default function TripCreateScreen() {
  const theme = useMobileTheme();
  const { createTrip } = useAuth();
  const [destinationQuery, setDestinationQuery] = useState("");
  const [title, setTitle] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [destinationRegion, setDestinationRegion] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [party, setParty] = useState<TravelerParty>("couple");
  const [overview, setOverview] = useState("");
  const [highlights, setHighlights] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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

  return (
    <AppTabShell
      section="Trip Hub"
      title="Create the first live trip."
      subtitle="Search stays intentionally curated for India in this step so the product does not pretend to be a live places API."
    >
      <SurfaceCard tone="connected">
        <View style={{ gap: theme.spacing.md }}>
          <TextInput value={destinationQuery} onChangeText={setDestinationQuery} placeholder="Search curated India destinations" style={inputStyle} />
          <View style={{ gap: theme.spacing.sm }}>
            {matches.map((destination) => (
              <ActionButton
                key={destination.id}
                label={`${destination.city}, ${destination.region}`}
                variant="secondary"
                onPress={() => {
                  setDestinationQuery(`${destination.city}, ${destination.region}`);
                  setTitle(title || `${destination.city} trip`);
                  setDestinationCity(destination.city);
                  setDestinationRegion(destination.region);
                  setOverview(
                    overview || `A premium ${destination.city} plan shaped around ${destination.highlights.slice(0, 2).join(" and ")}.`,
                  );
                  setHighlights(destination.highlights.slice(0, 3).join(", "));
                }}
              />
            ))}
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard tone="raised">
        <View style={{ gap: theme.spacing.md }}>
          <TextInput value={title} onChangeText={setTitle} placeholder="Trip title" style={inputStyle} />
          <TextInput value={destinationCity} onChangeText={setDestinationCity} placeholder="Destination city" style={inputStyle} />
          <TextInput value={destinationRegion} onChangeText={setDestinationRegion} placeholder="State / region" style={inputStyle} />
          <TextInput value={startDate} onChangeText={setStartDate} placeholder="Start date (YYYY-MM-DD)" style={inputStyle} />
          <TextInput value={endDate} onChangeText={setEndDate} placeholder="End date (YYYY-MM-DD)" style={inputStyle} />
          <TextInput value={party} onChangeText={(value) => setParty(value as TravelerParty)} placeholder="Party (solo, couple, family, friends, business)" style={inputStyle} />
          <TextInput value={overview} onChangeText={setOverview} placeholder="Trip overview" style={inputStyle} multiline />
          <TextInput value={highlights} onChangeText={setHighlights} placeholder="Highlights, comma separated" style={inputStyle} />
          <ActionButton
            label={pending ? "Creating..." : "Create trip"}
            onPress={() => {
              setPending(true);
              setMessage(null);
              void createTrip({
                title,
                destinationCity,
                destinationRegion,
                destinationCountry: "India",
                startDate,
                endDate,
                party,
                overview,
                highlights: highlights.split(",").map((item) => item.trim()).filter(Boolean),
              })
                .then(() => {
                  router.replace("/(tabs)/trips");
                })
                .catch((error) => {
                  setMessage(error instanceof Error ? error.message : "Could not create this trip yet.");
                })
                .finally(() => {
                  setPending(false);
                });
            }}
            disabled={pending}
          />
          {message ? (
            <Text style={{ color: "#9C3D34", fontFamily: theme.fonts.body, fontSize: 13, lineHeight: 20 }}>{message}</Text>
          ) : null}
        </View>
      </SurfaceCard>
    </AppTabShell>
  );
}
