import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { CallRow } from "@/components/call-row";
import { FilterBar } from "@/components/filter-bar";
import { Button, EmptyState, ErrorBanner, Group, Overline, Pill, Reveal, Screen, Skeleton, T } from "@/components/ui";
import { callAppointmentBooked, callCustomerName, callEmail, callPhoneNumber } from "@/lib/format";
import { useCalls } from "@/lib/hooks";
import { radius, space, useTheme } from "@/lib/theme";
import type { RetellCall } from "@/lib/types";

type Outcome = "all" | "successful" | "unsuccessful" | "booked";
const PAGE = 25;

function dayLabel(ms: number) {
  const d = new Date(ms);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date()) - start(d)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export default function CallsScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useCalls();
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("all");
  const [shown, setShown] = useState(PAGE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...(data ?? [])]
      .sort((a, b) => b.start_timestamp - a.start_timestamp)
      .filter((call) => {
        if (outcome === "successful" && !call.call_analysis?.call_successful) return false;
        if (outcome === "unsuccessful" && call.call_analysis?.call_successful) return false;
        if (outcome === "booked" && callAppointmentBooked(call) !== true) return false;
        if (!q) return true;
        return [callCustomerName(call), callEmail(call), callPhoneNumber(call), call.agent_name, call.call_analysis?.call_summary]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      });
  }, [data, query, outcome]);

  const groups = useMemo(() => {
    const out: { label: string; calls: RetellCall[] }[] = [];
    for (const call of filtered.slice(0, shown)) {
      const label = dayLabel(call.start_timestamp);
      const last = out[out.length - 1];
      if (last && last.label === label) last.calls.push(call);
      else out.push({ label, calls: [call] });
    }
    return out;
  }, [filtered, shown]);

  const OUTCOMES: [Outcome, string][] = [
    ["all", "All"],
    ["successful", "Successful"],
    ["unsuccessful", "Unsuccessful"],
    ["booked", "Booked"],
  ];

  return (
    <Screen
      title="Calls"
      subtitle={isLoading ? "Loading…" : `${filtered.length.toLocaleString()} call${filtered.length === 1 ? "" : "s"} in range`}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
    >
      <View style={{ gap: space.md }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 16,
            height: 52,
            borderRadius: radius.md + 2,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Ionicons name="search" size={18} color={c.faint} />
          <TextInput
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              setShown(PAGE);
            }}
            placeholder="Search name, phone, summary"
            placeholderTextColor={c.faint}
            style={[{ flex: 1, color: c.text, fontSize: 15, fontFamily: "Inter_500Medium" }, { outlineStyle: "none" } as object]}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query ? <Ionicons name="close-circle" size={18} color={c.faint} onPress={() => setQuery("")} /> : null}
        </View>
        <FilterBar />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: 8 }}>
          {OUTCOMES.map(([key, label]) => (
            <Pill
              key={key}
              label={label}
              active={outcome === key}
              onPress={() => {
                setOutcome(key);
                setShown(PAGE);
              }}
            />
          ))}
        </ScrollView>
      </View>

      {isError ? (
        <ErrorBanner message="We couldn't load your calls." onRetry={() => void refetch()} />
      ) : isLoading ? (
        <Skeleton height={320} style={{ borderRadius: 22 }} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="search" title="No calls match" body="Adjust your search, filters or date range." />
      ) : (
        <>
          {groups.map((g, gi) => (
            <Reveal key={g.label} index={gi} style={{ gap: space.sm }}>
              <Overline>{g.label}</Overline>
              <Group>
                {g.calls.map((call) => (
                  <CallRow key={call.call_id} call={call} onPress={() => router.push({ pathname: "/call/[id]", params: { id: call.call_id } })} />
                ))}
              </Group>
            </Reveal>
          ))}
          {shown < filtered.length ? (
            <Button label={`Show ${Math.min(PAGE, filtered.length - shown)} more`} variant="soft" onPress={() => setShown((s) => s + PAGE)} />
          ) : (
            <T size={12} muted style={{ textAlign: "center" }}>
              You've reached the end
            </T>
          )}
        </>
      )}
    </Screen>
  );
}
