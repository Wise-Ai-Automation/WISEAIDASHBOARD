import { useMemo, useState } from "react";
import { View } from "react-native";
import { AreaChart, BarChart, HBars, StackedBar } from "@/components/charts";
import { FilterBar } from "@/components/filter-bar";
import { StatTile } from "@/components/stat";
import { Card, EmptyState, ErrorBanner, Group, Reveal, Screen, Segmented, Skeleton, T } from "@/components/ui";
import { agentStats, buildSeries, byDisconnection, byHour, byWeekday, computeKpis, formatUsd, sentimentSplit, type GroupBy } from "@/lib/analytics";
import { useAuth } from "@/lib/auth";
import { formatDuration } from "@/lib/format";
import { useCalls, usePreviousCalls } from "@/lib/hooks";
import { space, useTheme } from "@/lib/theme";

export default function AnalyticsScreen() {
  const { c } = useTheme();
  const { isAdmin } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching } = useCalls();
  const prev = usePreviousCalls();
  const [groupBy, setGroupBy] = useState<GroupBy>("day");

  const calls = data ?? [];
  const k = useMemo(() => computeKpis(calls), [calls]);
  const pk = useMemo(() => computeKpis(prev.data ?? []), [prev.data]);
  const series = useMemo(() => buildSeries(calls, groupBy), [calls, groupBy]);
  const sentiment = useMemo(() => sentimentSplit(calls), [calls]);
  const hours = useMemo(() => byHour(calls), [calls]);
  const weekdays = useMemo(() => byWeekday(calls), [calls]);
  const reasons = useMemo(() => byDisconnection(calls).slice(0, 6), [calls]);
  const agents = useMemo(() => agentStats(calls), [calls]);
  const hasPrev = !prev.isLoading && (prev.data?.length ?? 0) > 0;
  const empty = !isLoading && calls.length === 0;
  const money = (v: number) => `$${v >= 10 ? Math.round(v) : v.toFixed(1)}`;

  return (
    <Screen title="Analytics" subtitle="Trends and breakdowns" refreshing={isRefetching} onRefresh={() => void refetch()}>
      <FilterBar />
      {isError ? (
        <ErrorBanner message="We couldn't load analytics." onRetry={() => void refetch()} />
      ) : empty ? (
        <EmptyState icon="stats-chart" title="No data for this range" body="Try a wider date range or a different agent." />
      ) : (
        <>
          <Reveal index={0}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.md }}>
              <StatTile icon="call" label="Calls" value={k.totalCalls.toLocaleString()} loading={isLoading} delta={hasPrev ? { current: k.totalCalls, previous: pk.totalCalls } : null} />
              <StatTile icon="checkmark-done" label="Success rate" value={`${k.successRate.toFixed(1)}%`} loading={isLoading} delta={hasPrev ? { current: k.successRate, previous: pk.successRate } : null} />
              <StatTile icon="speedometer" label="Avg duration" value={formatDuration(k.avgDurationMs)} loading={isLoading} delta={hasPrev ? { current: k.avgDurationMs, previous: pk.avgDurationMs } : null} />
              {isAdmin ? (
                <StatTile icon="cash" label="Cost / minute" value={formatUsd(k.costPerMinute)} loading={isLoading} delta={hasPrev ? { current: k.costPerMinute, previous: pk.costPerMinute, invert: true } : null} />
              ) : (
                <StatTile icon="happy" label="Positive rate" value={`${k.positiveRate.toFixed(1)}%`} loading={isLoading} delta={hasPrev ? { current: k.positiveRate, previous: pk.positiveRate } : null} />
              )}
            </View>
          </Reveal>

          <Reveal index={1}>
            <Card style={{ gap: 16 }}>
              <T size={16} weight="700">
                Call volume
              </T>
              <Segmented
                value={groupBy}
                onChange={setGroupBy}
                options={[
                  { key: "day", label: "Day" },
                  { key: "week", label: "Week" },
                  { key: "month", label: "Month" },
                ]}
              />
              {isLoading ? <Skeleton height={190} /> : <AreaChart data={series.map((p) => ({ label: p.label, value: p.calls }))} unit=" calls" />}
            </Card>
          </Reveal>

          {isAdmin ? (
            <Reveal index={2}>
              <Card style={{ gap: 16 }}>
                <T size={16} weight="700">
                  Spend over time
                </T>
                {isLoading ? <Skeleton height={190} /> : <AreaChart color={c.chart[3]!} data={series.map((p) => ({ label: p.label, value: p.cost }))} format={money} />}
              </Card>
            </Reveal>
          ) : null}

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

          <Reveal index={4}>
            <Card style={{ gap: 16 }}>
              <View style={{ gap: 2 }}>
                <T size={16} weight="700">
                  Busiest hours
                </T>
                <T size={12} muted>
                  Calls by hour of day
                </T>
              </View>
              <BarChart data={hours.map((h) => ({ label: h.label.replace(":00", ""), value: h.calls }))} />
            </Card>
          </Reveal>

          <Reveal index={5}>
            <Card style={{ gap: 16 }}>
              <T size={16} weight="700">
                By weekday
              </T>
              <BarChart color={c.chart[2]!} data={weekdays.map((w) => ({ label: w.label, value: w.calls }))} />
            </Card>
          </Reveal>

          <Reveal index={6}>
            <Card style={{ gap: 18 }}>
              <T size={16} weight="700">
                Why calls ended
              </T>
              <HBars data={reasons.map((r) => ({ label: r.label, value: r.calls }))} color={c.chart[3]!} />
            </Card>
          </Reveal>

          <Reveal index={7}>
            <Card style={{ gap: 18 }}>
              <T size={16} weight="700">
                Agents
              </T>
              {agents.map((a) => (
                <View key={a.agent} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T size={14} weight="700" numberOfLines={1}>
                      {a.agent}
                    </T>
                    <T size={12} muted>
                      {a.calls} calls · {a.minutes.toFixed(0)} min{isAdmin ? ` · ${formatUsd(a.cost)}` : ""}
                    </T>
                  </View>
                  <T size={15} weight="800" color={a.successRate >= 60 ? c.success : c.warning}>
                    {a.successRate.toFixed(0)}%
                  </T>
                </View>
              ))}
            </Card>
          </Reveal>
        </>
      )}
    </Screen>
  );
}
