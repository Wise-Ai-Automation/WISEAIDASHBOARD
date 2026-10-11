import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T, tap, type IconName } from "@/components/ui";
import { useAgents, useCalls, usePreviousCalls } from "@/lib/hooks";
import { useTheme } from "@/lib/theme";

const META: Record<string, { title: string; icon: IconName; active: IconName }> = {
  index: { title: "Overview", icon: "grid-outline", active: "grid" },
  calls: { title: "Calls", icon: "call-outline", active: "call" },
  pipeline: { title: "Pipeline", icon: "funnel-outline", active: "funnel" },
  analytics: { title: "Analytics", icon: "stats-chart-outline", active: "stats-chart" },
  more: { title: "More", icon: "person-circle-outline", active: "person-circle" },
};

type BarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>>[0];

/** Floating, blurred tab bar: icons only, with the active tab expanding into a labelled pill. */
function FloatingTabBar({ state, navigation }: BarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 20, right: 20, bottom: Math.max(insets.bottom, 12) + 4 }}>
      <View
        style={{
          borderRadius: 30,
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: c.border,
          shadowColor: c.shadow,
          shadowOpacity: c.dark ? 0.5 : 0.14,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 8,
          backgroundColor: Platform.OS === "android" ? c.card : c.dark ? "rgba(16,19,31,0.9)" : "rgba(255,255,255,0.9)",
          ...(Platform.OS === "web" ? ({ backdropFilter: "blur(24px) saturate(160%)" } as object) : null),
        }}
      >
        {Platform.OS === "ios" ? <BlurView intensity={60} tint={c.dark ? "dark" : "light"} style={StyleSheet.absoluteFill} /> : null}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 8 }}>
          {state.routes.map((route, i) => {
            const meta = META[route.name];
            if (!meta) return null;
            const focused = state.index === i;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={meta.title}
                onPress={() => {
                  tap();
                  const e = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                  if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
                }}
                style={{
                  height: 48,
                  paddingHorizontal: focused ? 16 : 14,
                  borderRadius: 24,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: focused ? c.primarySoft : "transparent",
                }}
              >
                <Ionicons name={focused ? meta.active : meta.icon} size={22} color={focused ? c.primary : c.muted} />
                {focused ? (
                  <T size={13} weight="700" color={c.primary}>
                    {meta.title}
                  </T>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  // Warm the shared caches once so every tab opens with data already in memory.
  useCalls();
  usePreviousCalls();
  useAgents();

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="calls" />
      <Tabs.Screen name="pipeline" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
