import { ClosingSection } from "@/components/marketing/closing-section";
import { DestinationMarquee } from "@/components/marketing/destination-marquee";
import { DestinationsGallery } from "@/components/marketing/destinations-gallery";
import { FeatureBento } from "@/components/marketing/feature-bento";
import { GatherSection } from "@/components/marketing/gather-section";
import { Hero } from "@/components/marketing/hero";
import { TripStory } from "@/components/marketing/trip-story";

export default function LandingPage() {
  return (
    <main className="relative">
      <Hero />
      <DestinationMarquee />
      <GatherSection />
      <TripStory />
      <FeatureBento />
      <DestinationsGallery />
      <ClosingSection />
    </main>
  );
}
