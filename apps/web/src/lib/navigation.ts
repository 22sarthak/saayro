export interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
}

export const appNavItems: NavItem[] = [
  {
    href: "/app",
    label: "Dashboard",
    shortLabel: "Home",
    description: "Discovery, recent trips, and connected travel."
  },
  {
    href: "/app/buddy",
    label: "Buddy",
    shortLabel: "Buddy",
    description: "Trip-aware guidance and action prompts."
  },
  {
    href: "/app/trips/trip-jaipur-november",
    label: "Trip Hub",
    shortLabel: "Trip",
    description: "Planner, itinerary, exports, and route context."
  },
  {
    href: "/app/saved",
    label: "Saved",
    shortLabel: "Saved",
    description: "Curated places, stays, and keeps."
  },
  {
    href: "/app/profile",
    label: "Profile",
    shortLabel: "Profile",
    description: "Preferences, maps, and connection states."
  }
];

export function getSectionLabel(pathname: string): string {
  if (pathname.startsWith("/app/trips/")) return "Trip hub";
  if (pathname.startsWith("/app/buddy")) return "Buddy";
  if (pathname.startsWith("/app/saved")) return "Saved";
  if (pathname.startsWith("/app/profile")) return "Profile";
  return "Dashboard";
}
