import { Stack } from "expo-router";
import { Platform } from "react-native";

// Each tab owns a tiny single-screen Stack so it can have a real native
// header on iOS (large title, native search bar) — see components/ui.tsx's
// Screen component, which wires the actual header options per screen.
// Android/web keep the header hidden; the screen draws its own title block,
// unchanged from before this file existed.
export const unstable_settings = { anchor: "index" };

export default function TabStackLayout() {
  return <Stack screenOptions={{ headerShown: Platform.OS === "ios" }} />;
}
