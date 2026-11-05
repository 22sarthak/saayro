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
    theme: createTripTheme("#2f93d0", "#22a378")
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
    theme: createTripTheme("#e09312", "#d9445a")
  },
  {
    slug: "hampi",
    name: "Hampi",
    region: "Karnataka",
    mood: "Boulders & ruined empires",
    image: "/destinations/hampi-virupaksha.jpg",
    theme: createTripTheme("#e09312", "#8466e8")
  }
];

export type MarqueeDestination = {
  name: string;
  latitude: string;
  image: string;
};

export const marqueeDestinations: MarqueeDestination[] = [
  { name: "Goa", latitude: "15.3° N", image: "/destinations/goa-anjuna.jpg" },
  { name: "Ladakh", latitude: "34.2° N", image: "/destinations/ladakh-pangong.jpg" },
  { name: "Kerala", latitude: "9.9° N", image: "/destinations/kerala-backwaters.jpg" },
  { name: "Jaipur", latitude: "26.9° N", image: "/destinations/jaipur-hawa-mahal.jpg" },
  { name: "Spiti", latitude: "32.2° N", image: "/destinations/spiti-key-monastery.jpg" },
  { name: "Varanasi", latitude: "25.3° N", image: "/destinations/varanasi-ghats.jpg" },
  { name: "Pondicherry", latitude: "11.9° N", image: "/destinations/pondicherry-auroville.jpg" },
  { name: "Hampi", latitude: "15.3° N", image: "/destinations/hampi-virupaksha.jpg" },
  { name: "Meghalaya", latitude: "25.6° N", image: "/destinations/meghalaya-falls.jpg" },
  { name: "Udaipur", latitude: "24.6° N", image: "/destinations/udaipur-lake-palace.jpg" },
  { name: "Gokarna", latitude: "14.6° N", image: "/destinations/gokarna-coast.jpg" },
  { name: "Andaman", latitude: "11.6° N", image: "/destinations/andaman-island.jpg" },
  { name: "Darjeeling", latitude: "27.0° N", image: "/destinations/darjeeling-monastery.jpg" },
  { name: "Kutch", latitude: "23.2° N", image: "/destinations/kutch-white-rann.jpg" }
];
