import { ButtonLink } from "@/components/ui/button-link";
import { StatePanel } from "@/components/ui/state-panel";

export default function TripNotFoundPage() {
  return (
    <StatePanel
      eyebrow="Trip not found"
      title="This trip shell isn&apos;t in the mock dataset yet."
      description="Unknown trip routes should fail gently and route the user back toward a stable preview surface."
      tone="danger"
      actions={<ButtonLink href="/app" variant="secondary">Return to dashboard</ButtonLink>}
    />
  );
}

