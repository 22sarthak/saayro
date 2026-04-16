import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";

export default function IndexPage() {
  const { session, status } = useAuth();

  if (status === "loading") {
    return null;
  }

  return <Redirect href={session?.authenticated ? "/(tabs)" : "/sign-in"} />;
}
