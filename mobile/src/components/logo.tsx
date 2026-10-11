import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { View } from "react-native";
import { T } from "./ui";

export function WiseMark({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id="wg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#6D5CF0" />
          <Stop offset="1" stopColor="#9B4FE0" />
        </LinearGradient>
      </Defs>
      <Rect width="40" height="40" rx="11" fill="url(#wg)" />
      <Path
        d="M9 13 L14.5 28 L20 17 L25.5 28 L31 13"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="31" cy="13" r="2.4" fill="#fff" opacity="0.9" />
    </Svg>
  );
}

export function WiseLogo({ subtitle = "Voice analytics", light = false }: { subtitle?: string; light?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <WiseMark />
      <View>
        <T size={17} weight="800" color={light ? "#fff" : undefined} style={{ letterSpacing: -0.3 }}>
          WISE AI
        </T>
        <T size={12} color={light ? "rgba(255,255,255,0.7)" : undefined} muted={!light}>
          {subtitle}
        </T>
      </View>
    </View>
  );
}
