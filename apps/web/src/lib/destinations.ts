import { createTripTheme, type TripTheme } from "@saayro/tokens";

export type DestinationShowcase = {
  slug: string;
  name: string;
  region: string;
  mood: string;
  image: string;
  theme: TripTheme;
};

export const destinationShowcase: DestinationShowcase[] = [
  {
    slug: "goa",
    name: "Goa",
    region: "Konkan coast",
    mood: "Shacks, sunsets & scooters",
    image: "/destinations/goa-anjuna.jpg",
    theme: createTripTheme("#f25f3a", "#169e99")
  },
  {
    slug: "ladakh",
    name: "Ladakh",
    region: "Trans-Himalaya",
    mood: "High passes & blue lakes",
    image: "/destinations/ladakh-pangong.jpg",
    theme: createTripTheme("#2f7fd1", "#9f86fa")
  },
  {
    slug: "kerala",
    name: "Kerala",
    region: "Malabar backwaters",
    mood: "Houseboats & monsoon green",
    image: "/destinations/kerala-backwaters.jpg",
    theme: createTripTheme("#2e9e64", "#3fbfb8")
  },
  {
    slug: "jaipur",
    name: "Jaipur",
    region: "Rajasthan",
    mood: "Pink city, palace evenings",
    image: "/destinations/jaipur-hawa-mahal.jpg",
    theme: createTripTheme("#e0607e", "#e39a0e")
  },
  {
    slug: "varanasi",
    name: "Varanasi",
    region: "Ganga plains",
    mood: "Ghats, aarti & old lanes",
    image: "/destinations/varanasi-ghats.jpg",
    theme: createTripTheme("#e39a0e", "#f25f3a")
  },
  {
    slug: "hampi",
    name: "Hampi",
    region: "Karnataka",
    mood: "Boulders & ruined empires",
    image: "/destinations/hampi-virupaksha.jpg",
    theme: createTripTheme("#c9733a", "#7e62ec")
  }
];

export const marqueeDestinations = [
  "Goa",
  "Ladakh",
  "Kerala",
  "Jaipur",
  "Varanasi",
  "Hampi",
  "Spiti",
  "Pondicherry",
  "Meghalaya",
  "Rishikesh",
  "Udaipur",
  "Gokarna",
  "Coorg",
  "Andaman",
  "Darjeeling",
  "Kutch"
];
