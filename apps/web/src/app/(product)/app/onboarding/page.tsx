import { StatePanel } from "@/components/ui/state-panel";
import { ProfileSetupForm } from "@/components/profile/profile-setup-form";
import { fetchServerSession } from "@/lib/auth-server";

export default async function OnboardingPage() {
  const session = await fetchServerSession();

  return (
    <div className="space-y-5">
      <StatePanel
        eyebrow="Profile setup"
        title={session?.needsOnboarding ? "Confirm the traveler behind this workspace." : "Edit your traveler profile."}
        description="Full name is required and must be confirmed by the traveler. Everything else stays optional, skippable, and editable later."
        tone="connected"
      />
      <ProfileSetupForm />
    </div>
  );
}
