import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { AreaChart, HBars, Sparkline, StackedBar } from "@/components/charts";
import { CallRow } from "@/components/call-row";
import { FilterBar } from "@/components/filter-bar";
import { Delta, StatTile } from "@/components/stat";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  ErrorBanner,
  Group,
  HeroCard,
  Overline,
  Reveal,
  Screen,
  SectionTitle,
  Skeleton,
  T,
} from "@/components/ui";
import { agentStats, buildSeries, computeKpis, formatUsd, sentimentSplit } from "@/lib/analytics";
import { useAuth } from "@/lib/auth";
import { callAppointmentBooked, callAppointmentTiming, callCustomerName, callPhoneNumber, formatDuration, formatTiming } from "@/lib/format";
import { useCalls, usePreviousCalls, useTodaySpend } from "@/lib/hooks";
import { space, useTheme } from "@/lib/theme";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function OverviewScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const { user, viewingAs, setViewingAs, isAdmin } = useAuth();
  const { data: calls, isLoading, isError, refetch, isRefetching } = useCalls();
  const prev = usePreviousCalls();
  const today = useTodaySpend();

  const list = calls ?? [];
  const k = useMemo(() => computeKpis(list), [list]);
  const pk = useMemo(() => computeKpis(prev.data ?? []), [prev.data]);
  const series = useMemo(() => buildSeries(list, "day"), [list]);
  const agents = useMemo(() => agentStats(list), [list]);
  const sentiment = useMemo(() => sentimentSplit(list), [list]);
  const recent = useMemo(() => [...list].sort((a, b) => b.start_timestamp - a.start_timestamp).slice(0, 5), [list]);
  const appointments = useMemo(
    () =>
      list
        .filter((x) => callAppointmentBooked(x) === true || callAppointmentTiming(x) != null)
        .sort((a, b) => b.start_timestamp - a.start_timestamp)
        .slice(0, 4),
    [list],
  );

  const profile = viewingAs ?? user;
  const first = profile?.full_name.split(" ")[0] ?? "there";
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const open = (id: string) => router.push({ pathname: "/call/[id]", params: { id } });
  const hasPrev = !prev.isLoading && (prev.data?.length ?? 0) > 0;

  return (
    <Screen
      overline={`${greeting()} · ${dateLabel}`}
      title={`Hi, ${first}`}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      right={
        <Pressable
          onPress={() => router.push("/more")}
          hitSlop={8}
          style={{ marginTop: 2 }}
        >
          <Avatar name={profile?.full_name ?? "?"} size={44} />
        </Pressable>
      }
    >
      {viewingAs ? (
        <Pressable
          onPress={() => setViewingAs(null)}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 16, backgroundColor: c.warning + "1A", borderWidth: 1, borderColor: c.warning + "44" }}
        >
          <Ionicons name="eye" size={17} color={c.warning} />
          <T size={13} weight="600" style={{ flex: 1 }}>
            Viewing as {viewingAs.full_name}
          </T>
          <T size={13} weight="700" color={c.primary}>
            Exit
          </T>
        </Pressable>
      ) : null}

      <FilterBar />

      {isAdmin && today.over ? (
        <ErrorBanner message={`Today's Retell spend is ${formatUsd(today.spend)}, over your ${formatUsd(today.limit ?? 0)} daily limit.`} />
      ) : null}

      {isError ? (
        <ErrorBanner message="We couldn't load your calls. Pull down to try again." onRetry={() => void refetch()} />
      ) : (
        <>
          <Reveal index={0}>
            <HeroCard>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ gap: 6 }}>
                  <Overline color="rgba(255,255,255,0.72)">{isAdmin ? "Total Retell spend" : "Total calls"}</Overline>
                  {isLoading ? (
                    <Skeleton height={48} width={170} style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
                  ) : (
                    <T size={44} weight="800" color="#fff" tracking={-1.4}>
                      {isAdmin ? formatUsd(k.totalCost) : k.totalCalls.toLocaleString()}
                    </T>
                  )}
                </View>
                {hasPrev ? (
                  <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.16)" }}>
                    <Delta onDark current={isAdmin ? k.totalCost : k.totalCalls} previous={isAdmin ? pk.totalCost : pk.totalCalls} />
                  </View>
                ) : null}
              </View>

              <View style={{ marginTop: 14, marginHorizontal: -4 }}>
                <Sparkline values={series.map((p) => (isAdmin ? p.cost : p.calls))} />
              </View>

              <View style={{ flexDirection: "row", marginTop: 14, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.18)" }}>
                {(isAdmin
                  ? [
                      ["Today", formatUsd(k.costToday)],
                      ["Avg / call", formatUsd(k.avgCost)],
                      ["Calls", k.totalCalls.toLocaleString()],
                    ]
                  : [
                      ["Today", k.callsToday.toLocaleString()],
                      ["Avg duration", formatDuration(k.avgDurationMs)],
                      ["Success", `${k.successRate.toFixed(0)}%`],
                    ]
                ).map(([label, value]) => (
                  <View key={label} style={{ flex: 1, gap: 3 }}>
                    <T size={12} weight="600" color="rgba(255,255,255,0.7)">
                      {label}
                    </T>
                    <T size={17} weight="700" color="#fff">
                      {isLoading ? "—" : value}
                    </T>
                  </View>
                ))}
              </View>
            </HeroCard>
          </Reveal>

          <Reveal index={1}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
              <StatTile icon="time" label="Talk time" value={formatDuration(k.totalTalkMs)} loading={isLoading} delta={hasPrev ? { current: k.totalTalkMs, previous: pk.totalTalkMs } : null} />
              <StatTile icon="checkmark-done" label="Success rate" value={`${k.successRate.toFixed(1)}%`} loading={isLoading} delta={hasPrev ? { current: k.successRate, previous: pk.successRate } : null} />
              <StatTile icon="happy" label="Positive sentiment" value={`${k.positiveRate.toFixed(1)}%`} loading={isLoading} delta={hasPrev ? { current: k.positiveRate, previous: pk.positiveRate } : null} />
              <StatTile icon="speedometer" label="Avg duration" value={formatDuration(k.avgDurationMs)} loading={isLoading} delta={hasPrev ? { current: k.avgDurationMs, previous: pk.avgDurationMs } : null} />
            </View>
          </Reveal>

          <Reveal index={2}>
            <Card style={{ gap: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ gap: 2 }}>
                  <T size={16} weight="700">
                    {isAdmin ? "Daily spend" : "Call volume"}
                  </T>
                  <T size={12} muted>
                    {isAdmin ? "Retell cost per day" : "Calls per day"} · touch to inspect
                  </T>
                </View>
              </View>
              {isLoading ? (
                <Skeleton height={190} />
              ) : series.length ? (
                <AreaChart
                  data={series.map((p) => ({ label: p.label, value: isAdmin ? p.cost : p.calls }))}
                  format={isAdmin ? (v) => `$${v >= 10 ? Math.round(v) : v.toFixed(1)}` : undefined}
                  unit={isAdmin ? "" : " calls"}
                />
              ) : (
                <EmptyState icon="stats-chart" title="No calls in this range" body="Try a wider date range." />
              )}
            </Card>
          </Reveal>

          {list.length ? (
            <Reveal index={3}>
              <Card style={{ gap: 18 }}>
                <T size={16} weight="700">
                  Caller sentiment
                </T>
                <StackedBar
                  segments={[
                    { label: "Positive", value: sentiment[0]!.value, color: c.success },
                    { label: "Neutral", value: sentiment[1]!.value, color: c.faint },
                    { label: "Negative", value: sentiment[2]!.value, color: c.danger },
                  ]}
                />
              </Card>
            </Reveal>
          ) : null}

          {agents.length ? (
            <Reveal index={4}>
              <Card style={{ gap: 18 }}>
                <T size={16} weight="700">
                  Agent performance
                </T>
                <HBars data={agents.slice(0, 5).map((a) => ({ label: a.agent, value: a.calls }))} format={(v) => `${v} calls`} />
              </Card>
            </Reveal>
          ) : null}

          {appointments.length ? (
            <View style={{ gap: space.md }}>
              <SectionTitle title="Appointments" action="Pipeline" onAction={() => router.push("/pipeline")} />
              <Group>
                {appointments.map((a) => (
                  <Pressable key={a.call_id} onPress={() => open(a.call_id)} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}>
                    <Avatar name={callCustomerName(a) ?? callPhoneNumber(a) ?? "?"} color={c.success} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <T size={15} weight="700" numberOfLines={1}>
                        {callCustomerName(a) ?? callPhoneNumber(a)}
                      </T>
                      <T size={12} muted numberOfLines={1}>
                        {formatTiming(callAppointmentTiming(a) ?? "") || "Time not captured"}
                      </T>
                    </View>
                    <Badge label="Booked" color={c.success} dot />
                  </Pressable>
                ))}
              </Group>
            </View>
          ) : null}

          <View style={{ gap: space.md }}>
            <SectionTitle title="Recent calls" action="See all" onAction={() => router.push("/calls")} />
            {isLoading ? (
              <Skeleton height={140} style={{ borderRadius: 22 }} />
            ) : recent.length ? (
              <Group>
                {recent.map((call) => (
                  <CallRow key={call.call_id} call={call} onPress={() => open(call.call_id)} />
                ))}
              </Group>
            ) : (
              <EmptyState icon="call" title="No calls yet" body="Calls will appear here as soon as your agents take them." />
            )}
          </View>
        </>
      )}
    </Screen>
  );
}
