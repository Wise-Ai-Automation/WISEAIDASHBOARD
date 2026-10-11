import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Pressable, View } from "react-native";
import { formatClock } from "@/lib/format";
import { radius, useTheme } from "@/lib/theme";
import { T, tap } from "./ui";

export function AudioPlayer({ uri }: { uri: string }) {
  const { c } = useTheme();
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  const duration = status.duration || 0;
  const pct = duration ? Math.min(100, (status.currentTime / duration) * 100) : 0;

  const toggle = () => {
    tap();
    if (status.playing) player.pause();
    else {
      if (duration && status.currentTime >= duration - 0.25) void player.seekTo(0);
      player.play();
    }
  };
  const skip = (delta: number) => {
    tap();
    void player.seekTo(Math.max(0, Math.min(duration || Infinity, status.currentTime + delta)));
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <Pressable onPress={() => skip(-10)} hitSlop={10}>
          <Ionicons name="play-back" size={22} color={c.muted} />
        </Pressable>
        <Pressable
          onPress={toggle}
          style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name={status.playing ? "pause" : "play"} size={26} color={c.onPrimary} style={{ marginLeft: status.playing ? 0 : 3 }} />
        </Pressable>
        <Pressable onPress={() => skip(10)} hitSlop={10}>
          <Ionicons name="play-forward" size={22} color={c.muted} />
        </Pressable>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ height: 6, borderRadius: radius.pill, backgroundColor: c.cardAlt, overflow: "hidden" }}>
            <View style={{ width: `${pct}%`, height: 6, backgroundColor: c.primary }} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <T size={11} muted>
              {formatClock(status.currentTime)}
            </T>
            <T size={11} muted>
              {status.isLoaded ? formatClock(duration) : "Loading…"}
            </T>
          </View>
        </View>
      </View>
    </View>
  );
}
