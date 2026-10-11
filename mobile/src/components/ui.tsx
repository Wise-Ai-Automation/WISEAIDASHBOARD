import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { radius, space, useTheme } from "@/lib/theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

export function tap() {
  void Haptics.selectionAsync().catch(() => {});
}

/* ---------------------------- typography --------------------------- */

const FONT = {
  "400": "Inter_400Regular",
  "500": "Inter_500Medium",
  "600": "Inter_600SemiBold",
  "700": "Inter_700Bold",
  "800": "Inter_800ExtraBold",
} as const;

export function T({
  children,
  size = 15,
  weight = "500",
  color,
  muted,
  style,
  numberOfLines,
  tracking,
  upper,
}: {
  children: ReactNode;
  size?: number;
  weight?: keyof typeof FONT;
  color?: string;
  muted?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  tracking?: number;
  upper?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: FONT[weight],
          fontSize: size,
          color: color ?? (muted ? c.muted : c.text),
          letterSpacing: tracking ?? (size >= 26 ? -0.6 : size >= 18 ? -0.25 : 0),
          ...(upper ? { textTransform: "uppercase" as const } : null),
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** Small uppercase label used above values and section groups. */
export function Overline({ children, color }: { children: ReactNode; color?: string }) {
  const { c } = useTheme();
  return (
    <T size={11} weight="700" tracking={0.9} upper color={color ?? c.muted}>
      {children}
    </T>
  );
}

/* ----------------------------- surfaces ---------------------------- */

export function Reveal({ children, index = 0, style }: { children: ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Reanimated.View entering={FadeInDown.duration(380).delay(Math.min(index, 8) * 50)} style={style}>
      {children}
    </Reanimated.View>
  );
}

export function Card({
  children,
  style,
  onPress,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
}) {
  const { c } = useTheme();
  const base: ViewStyle = {
    backgroundColor: c.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: padded ? space.lg + 2 : 0,
    shadowColor: c.shadow,
    shadowOpacity: c.dark ? 0 : 0.05,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: c.dark ? 0 : 1,
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [base, pressed && { opacity: 0.82, transform: [{ scale: 0.985 }] }, style]}
    >
      {children}
    </Pressable>
  );
}

/** A card of rows separated by inset hairlines — the app's list pattern. */
export function Group({ children, style, inset = 74 }: { children: ReactNode; style?: StyleProp<ViewStyle>; inset?: number }) {
  const { c } = useTheme();
  const rows = Array.isArray(children) ? children.flat().filter(Boolean) : [children];
  return (
    <Card padded={false} style={[{ overflow: "hidden" }, style]}>
      {rows.map((row, i) => (
        <View key={i}>
          {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: inset }} /> : null}
          {row}
        </View>
      ))}
    </Card>
  );
}

export function HeroCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <LinearGradient
      colors={c.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: radius.xl, padding: space.xl, overflow: "hidden" }, style]}
    >
      <View style={styles.heroOrbA} />
      <View style={styles.heroOrbB} />
      {children}
    </LinearGradient>
  );
}

export function SectionTitle({ title, hint, action, onAction }: { title: string; hint?: string; action?: string; onAction?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={styles.sectionRow}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <T size={18} weight="700">
          {title}
        </T>
        {hint ? (
          <T size={13} muted weight="500">
            {hint}
          </T>
        ) : null}
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <T size={13} weight="600" color={c.primary}>
            {action}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ---------------------------- controls ----------------------------- */

export function Button({
  label,
  onPress,
  loading,
  disabled,
  variant = "primary",
  icon,
  style,
  small,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "soft" | "outline" | "danger";
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const { c } = useTheme();
  const palette = {
    primary: { bg: c.primary, fg: c.onPrimary, border: c.primary },
    soft: { bg: c.primarySoft, fg: c.primary, border: "transparent" },
    outline: { bg: "transparent", fg: c.text, border: c.border },
    danger: { bg: "transparent", fg: c.danger, border: c.danger + "66" },
  }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      disabled={off}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { minHeight: small ? 42 : 54, backgroundColor: palette.bg, borderColor: palette.border, opacity: off ? 0.5 : pressed ? 0.85 : 1 },
        variant === "primary" && !c.dark && { shadowColor: c.primary, shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={palette.fg} /> : null}
          <T size={small ? 14 : 16} weight="700" color={palette.fg}>
            {label}
          </T>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, size = 42, tone = "card" }: { icon: IconName; onPress: () => void; size?: number; tone?: "card" | "soft" }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      hitSlop={8}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tone === "soft" ? c.primarySoft : c.card,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: c.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={size * 0.46} color={tone === "soft" ? c.primary : c.text} />
    </Pressable>
  );
}

export function Field({
  label,
  icon,
  right,
  ...input
}: TextInputProps & { label: string; icon?: IconName; right?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <T size={13} weight="600" color={c.text2}>
        {label}
      </T>
      <View style={[styles.field, { backgroundColor: c.card, borderColor: c.border }]}>
        {icon ? <Ionicons name={icon} size={19} color={c.muted} /> : null}
        <TextInput
          placeholderTextColor={c.faint}
          style={[{ flex: 1, color: c.text, fontSize: 16, fontFamily: FONT["500"], paddingVertical: 0 }, { outlineStyle: "none" } as object]}
          {...input}
        />
        {right}
      </View>
    </View>
  );
}

/** Filter-style pill: optional icon, label, optional chevron. */
export function Pill({
  label,
  icon,
  active,
  onPress,
  chevron,
  dot,
}: {
  label: string;
  icon?: IconName;
  active?: boolean;
  onPress: () => void;
  chevron?: boolean;
  dot?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: active ? c.primary : c.card,
          borderColor: active ? c.primary : c.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: active ? c.onPrimary : dot }} /> : null}
      {icon ? <Ionicons name={icon} size={15} color={active ? c.onPrimary : c.muted} /> : null}
      <T size={13} weight="600" color={active ? c.onPrimary : c.text}>
        {label}
      </T>
      {chevron ? <Ionicons name="chevron-down" size={13} color={active ? c.onPrimary : c.muted} /> : null}
    </Pressable>
  );
}

/** Segmented control (2–4 options). */
export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", backgroundColor: c.cardAlt, borderRadius: 14, padding: 3 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => {
              tap();
              onChange(o.key);
            }}
            style={{
              flex: 1,
              height: 34,
              borderRadius: 11,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: on ? c.card : "transparent",
              shadowColor: c.shadow,
              shadowOpacity: on && !c.dark ? 0.1 : 0,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <T size={13} weight={on ? "700" : "600"} color={on ? c.text : c.muted}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Badge({ label, color, icon, dot }: { label: string; color: string; icon?: IconName; dot?: boolean }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + "1A" }]}>
      {dot ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} /> : null}
      {icon ? <Ionicons name={icon} size={11} color={color} /> : null}
      <T size={11} weight="700" color={color}>
        {label}
      </T>
    </View>
  );
}

export function Avatar({ name, size = 44, color }: { name: string; size?: number; color?: string }) {
  const { c } = useTheme();
  const tint = color ?? c.primary;
  const initials = name
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.36,
        backgroundColor: tint + "1F",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <T size={size * 0.36} weight="700" color={tint}>
        {initials || "·"}
      </T>
    </View>
  );
}

/* --------------------------- bottom sheet -------------------------- */

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(4,6,18,0.5)" }} onPress={onClose} />
      <View
        style={{
          backgroundColor: c.card,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          paddingHorizontal: space.xl,
          paddingTop: 10,
          paddingBottom: insets.bottom + space.xl,
          maxHeight: "78%",
        }}
      >
        <View style={{ alignSelf: "center", width: 38, height: 4, borderRadius: 2, backgroundColor: c.border, marginBottom: space.lg }} />
        <T size={22} weight="800">
          {title}
        </T>
        {subtitle ? (
          <T size={13} muted style={{ marginTop: 3 }}>
            {subtitle}
          </T>
        ) : null}
        <View style={{ marginTop: space.lg }}>{children}</View>
      </View>
    </Modal>
  );
}

/** Selectable row used inside sheets. */
export function OptionRow({
  label,
  hint,
  selected,
  onPress,
  dot,
  multi,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
  dot?: string;
  multi?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 }}
    >
      {dot ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot }} /> : null}
      <View style={{ flex: 1 }}>
        <T size={15} weight="600">
          {label}
        </T>
        {hint ? (
          <T size={12} muted>
            {hint}
          </T>
        ) : null}
      </View>
      <Ionicons
        name={multi ? (selected ? "checkbox" : "square-outline") : selected ? "checkmark-circle" : "ellipse-outline"}
        size={22}
        color={selected ? c.primary : c.faint}
      />
    </Pressable>
  );
}

/* --------------------------- feedback ------------------------------ */

export function Skeleton({ height = 16, width, style }: { height?: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ height, width: width ?? "100%", borderRadius: 10, backgroundColor: c.cardAlt, opacity: pulse }, style]} />;
}

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.primarySoft }]}>
        <Ionicons name={icon} size={26} color={c.primary} />
      </View>
      <T size={17} weight="700" style={{ marginTop: space.lg, textAlign: "center" }}>
        {title}
      </T>
      {body ? (
        <T size={14} muted style={{ marginTop: 6, textAlign: "center", maxWidth: 290, lineHeight: 21 }}>
          {body}
        </T>
      ) : null}
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { c } = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: c.danger + "12", borderColor: c.danger + "33" }]}>
      <Ionicons name="alert-circle" size={20} color={c.danger} />
      <View style={{ flex: 1 }}>
        <T size={13} weight="500" color={c.danger}>
          {message}
        </T>
      </View>
      {onRetry ? (
        <Pressable onPress={onRetry} hitSlop={10}>
          <T size={13} weight="700" color={c.danger}>
            Retry
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ----------------------------- layout ------------------------------ */

/** Scrollable page with a header, pull-to-refresh and safe-area padding (clears the floating tab bar). */
export function Screen({
  title,
  subtitle,
  overline,
  right,
  children,
  refreshing,
  onRefresh,
  tabBar = true,
  back,
}: {
  title?: string;
  subtitle?: string;
  overline?: string;
  right?: ReactNode;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  tabBar?: boolean;
  back?: () => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + space.lg,
          paddingBottom: (tabBar ? 118 : insets.bottom + space.xl) + space.lg,
          paddingHorizontal: space.xl,
          gap: space.xl,
        }}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.primary} /> : undefined}
      >
        {title || right || back ? (
          <View style={{ gap: space.md }}>
            {back ? <IconButton icon="chevron-back" onPress={back} /> : null}
            <View style={styles.header}>
              <View style={{ flex: 1, gap: 4 }}>
                {overline ? <Overline>{overline}</Overline> : null}
                {title ? (
                  <T size={30} weight="800">
                    {title}
                  </T>
                ) : null}
                {subtitle ? (
                  <T size={14} muted>
                    {subtitle}
                  </T>
                ) : null}
              </View>
              {right}
            </View>
          </View>
        ) : null}
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  heroOrbA: {
    position: "absolute",
    right: -50,
    top: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  heroOrbB: {
    position: "absolute",
    left: -40,
    bottom: -90,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  button: {
    borderRadius: radius.md + 2,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: space.xl,
  },
  field: {
    minHeight: 56,
    borderRadius: radius.md + 2,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
  empty: { alignItems: "center", paddingVertical: 56, paddingHorizontal: 24 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
});
