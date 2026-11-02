import { Redirect } from "expo-router";
import { useAuth } from "@/lib/auth";

/**
 * SDK 58 requires an explicit route for "/" — the old implicit fallback to
 * whichever Stack.Protected branch matched is gone. By the time this mounts,
 * the root Gate has already waited for auth to finish loading.
 */
export default function Index() {
  const { user } = useAuth();
  return <Redirect href={user ? "/(tabs)" : "/login"} />;
}
