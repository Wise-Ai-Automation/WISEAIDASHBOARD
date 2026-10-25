import { Image, View } from "react-native";
import { T } from "./ui";

const mark = require("../../assets/brand/onewise-mark.png");

/** ONEWISE AI mark: the brand's "1" + maple-leaf icon. */
export function WiseMark({ size = 40 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.275, backgroundColor: "#fff", padding: size * 0.05, overflow: "hidden" }}>
      <Image source={mark} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
    </View>
  );
}

export function WiseLogo({ subtitle = "Voice analytics", light = false }: { subtitle?: string; light?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <WiseMark />
      <View>
        <T size={17} weight="800" color={light ? "#fff" : "#0D2A54"} style={{ letterSpacing: -0.3 }}>
          onewise<T size={17} weight="800" color={light ? "rgba(255,255,255,0.85)" : "#E6001E"}>AI</T>
        </T>
        <T size={12} color={light ? "rgba(255,255,255,0.7)" : undefined} muted={!light}>
          {subtitle}
        </T>
      </View>
    </View>
  );
}
