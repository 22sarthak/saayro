import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";

export default function IndexPage() {
  const { session, status } = useAuth();

  if (status === "loading") {
    return null;
  }

  if (session?.authenticated) {
    return <Redirect href={session.needsOnboarding ? "/onboarding" : "/(tabs)"} />;
  }

  return <Redirect href="/sign-in" />;
}
