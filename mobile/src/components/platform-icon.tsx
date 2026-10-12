import { Ionicons } from "@expo/vector-icons";
import { SymbolView } from "expo-symbols";
import type { SFSymbol } from "sf-symbols-typescript";
import { Platform, type ColorValue } from "react-native";
import type { IconName } from "./ui";

/**
 * Renders a real SF Symbol on iOS (matching Apple's own icon set and weight)
 * and falls back to Ionicons on Android/web. Used for native chrome — the tab
 * bar and a few primary actions — where authentic platform iconography matters
 * most; most in-content icons stay Ionicons on every platform for one visual
 * language inside the app's own cards and lists.
 */
export function PlatformIcon({
  ios,
  android,
  size = 22,
  color,
  weight = "regular",
}: {
  ios: SFSymbol;
  android: IconName;
  size?: number;
  color: ColorValue;
  weight?: "regular" | "medium" | "semibold" | "bold";
}) {
  if (Platform.OS === "ios") {
    return <SymbolView name={ios} size={size} tintColor={color} weight={weight} resizeMode="scaleAspectFit" />;
  }
  return <Ionicons name={android} size={size} color={color as string} />;
}
