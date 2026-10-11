import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { formatUsd } from "@/lib/analytics";
import { useAuth } from "@/lib/auth";
import { callAppointmentBooked, callCustomerName, callPhoneNumber, formatDuration } from "@/lib/format";
import { useTheme } from "@/lib/theme";
import type { RetellCall } from "@/lib/types";
import { sentimentColor } from "./filter-bar";
import { Avatar, Badge, T, tap } from "./ui";

export function clockTime(ms: number) {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** One call in a Group list: avatar, who/when, a two-line summary and status tags. */
export function CallRow({ call, onPress, showDate }: { call: RetellCall; onPress: () => void; showDate?: boolean }) {
  const { c } = useTheme();
  const { isAdmin } = useAuth();
  const name = callCustomerName(call);
  const phone = callPhoneNumber(call);
  const booked = callAppointmentBooked(call);
  const sentiment = call.call_analysis?.user_sentiment ?? "Unknown";
  const tint = sentimentColor(sentiment, c);
  const when = showDate
    ? new Date(call.start_timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ", " + clockTime(call.start_timestamp)
    : clockTime(call.start_timestamp);

  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({ padding: 16, gap: 10, backgroundColor: pressed ? c.cardAlt : "transparent" })}
    >
      <View style={{ flexDirection: "row", gap: 14 }}>
        <Avatar name={name ?? phone ?? "?"} color={tint} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <T size={15} weight="700" numberOfLines={1}>
                {name ?? (phone || "Unknown caller")}
              </T>
            </View>
            <T size={12} weight="600" muted>
              {when}
            </T>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name={call.direction === "inbound" ? "arrow-down-circle" : "arrow-up-circle"} size={13} color={c.faint} />
            <View style={{ flex: 1 }}>
              <T size={12} muted numberOfLines={1}>
                {call.agent_name} · {formatDuration(call.duration_ms)}
              </T>
            </View>
            {isAdmin && call.call_cost ? (
              <T size={12} weight="600" muted>
                {formatUsd(call.call_cost.combined_cost)}
              </T>
            ) : null}
          </View>
        </View>
      </View>
      {call.call_analysis?.call_summary ? (
        <T size={13} color={c.text2} numberOfLines={2} style={{ lineHeight: 19, marginLeft: 58 }}>
          {call.call_analysis.call_summary}
        </T>
      ) : null}
      <View style={{ flexDirection: "row", gap: 6, marginLeft: 58, flexWrap: "wrap" }}>
        <Badge dot label={sentiment} color={tint} />
        {booked === true ? <Badge icon="calendar" label="Booked" color={c.primary} /> : null}
        {!call.call_analysis?.call_successful ? <Badge label="Unsuccessful" color={c.warning} /> : null}
      </View>
    </Pressable>
  );
}
