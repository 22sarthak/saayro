"use client";

import { Button } from "@saayro/ui";
import { useState } from "react";
import { useSession } from "@/components/auth/session-provider";

export function LogoutButton({ variant = "ghost" }: { variant?: "primary" | "secondary" | "ghost" }) {
  const { signOut } = useSession();
  const [pending, setPending] = useState(false);

  return (
    <Button
      variant={variant}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await signOut();
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
