import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { deltaPercent } from "@/lib/analytics";
import { useTheme } from "@/lib/theme";
import { Card, Skeleton, T, type IconName } from "./ui";

/** Change vs the previous period. `invert` flips good/bad (e.g. cost going down is good). */
export function Delta({
  current,
  previous,
  invert,
  onDark,
}: {
  current: number;
  previous: number;
  invert?: boolean;
  onDark?: boolean;
}) {
  const { c } = useTheme();
  const d = deltaPercent(current, previous);
  const muted = onDark ? "rgba(255,255,255,0.7)" : c.muted;
  if (d == null) return <T size={12} weight="600" color={muted}>—</T>;
  if (Math.abs(d) < 0.5) return <T size={12} weight="600" color={muted}>No change</T>;
  const up = d > 0;
  const good = invert ? !up : up;
  const color = onDark ? "#FFFFFF" : good ? c.success : c.danger;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <Ionicons name={up ? "arrow-up" : "arrow-down"} size={12} color={color} />
      <T size={12} weight="700" color={color}>
        {Math.abs(d).toFixed(d >= 100 ? 0 : 1)}%
      </T>
    </View>
  );
}

export function StatTile({
  icon,
  label,
  value,
  loading,
  delta,
}: {
  icon: IconName;
  label: string;
  value: string;
  loading?: boolean;
  delta?: { current: number; previous: number; invert?: boolean } | null;
}) {
  const { c } = useTheme();
  return (
    <Card style={{ flexBasis: "47%", flexGrow: 1, gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={icon} size={16} color={c.primary} />
        </View>
        {delta ? <Delta {...delta} /> : null}
      </View>
      <View style={{ gap: 3 }}>
        {loading ? (
          <Skeleton height={28} width="70%" />
        ) : (
          <T size={24} weight="800">
            {value}
          </T>
        )}
        <T size={12} weight="600" muted>
          {label}
        </T>
      </View>
    </Card>
  );
}
