import { createFileRoute } from "@tanstack/react-router";
import { Clock, PhoneCall, Smile, Target } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { FilterBar } from "@/components/filter-bar";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCalls, usePreviousCalls } from "@/hooks/use-calls";
import {
  buildSeries,
  byAgent,
  byDisconnection,
  byHour,
  byWeekday,
  CHART_COLORS,
  computeKpis,
  deltaPercent,
  type GroupBy,
} from "@/lib/analytics";
import { formatDuration } from "@/lib/format";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics | Voice Agent Dashboard" },
      { name: "description", content: "Trends, peak hours and outcomes across your Retell AI voice agent calls." },
      { property: "og:title", content: "Analytics | Voice Agent Dashboard" },
      { property: "og:description", content: "Trends, peak hours and outcomes across your voice agent calls." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AnalyticsPage />
    </RequireAuth>
  ),
});

const axis = { tickLine: false, axisLine: false, fontSize: 12, stroke: "var(--muted-foreground)" };
const tooltipStyle = { borderRadius: 12, borderColor: "var(--border)", backgroundColor: "var(--popover)", color: "var(--popover-foreground)" };

function ChartCard({
  title,
  children,
  loading,
  height = 260,
}: {
  title: string;
  children: ReactNode;
  loading: boolean;
  height?: number;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <h2 className="font-display text-[15px] font-bold text-foreground">{title}</h2>
      {loading ? (
        <Skeleton className="mt-4 w-full" style={{ height }} />
      ) : (
        <ResponsiveContainer width="100%" height={height} className="mt-4">
          {children as React.ReactElement}
        </ResponsiveContainer>
      )}
    </div>
  );
}

function AnalyticsPage() {
  const [groupBy, setGroupBy] = useState<GroupBy>("day");
  const { data: calls, isLoading, isError } = useCalls();
  const { data: prevCalls } = usePreviousCalls();

  const list = calls ?? [];
  const kpis = computeKpis(list);
  const prev = computeKpis(prevCalls ?? []);
  const series = buildSeries(list, groupBy);
  const hours = byHour(list);
  const weekdays = byWeekday(list);
  const reasons = byDisconnection(list);
  const agents = byAgent(list);

  return (
    <AppShell title="Analytics" description="Deep dive into call volume, outcomes and sentiment">
      <FilterBar
        extra={
          <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          Analytics couldn't be loaded. Please try refreshing.
        </div>
      ) : (
        <>
           <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              label="Total Calls"
              value={kpis.totalCalls.toLocaleString()}
              icon={<PhoneCall className="size-4" />}
              delta={deltaPercent(kpis.totalCalls, prev.totalCalls)}
              loading={isLoading}
            />
            <StatCard
              label="Total Talk Time"
              value={formatDuration(kpis.totalTalkMs)}
              icon={<Clock className="size-4" />}
              delta={deltaPercent(kpis.totalTalkMs, prev.totalTalkMs)}
              loading={isLoading}
            />
            <StatCard
              label="Successful Call Rate"
              value={`${kpis.successRate.toFixed(1)}%`}
              icon={<Target className="size-4" />}
              delta={deltaPercent(kpis.successRate, prev.successRate)}
              loading={isLoading}
            />
            <StatCard
              label="Positive Sentiment"
              value={`${kpis.positiveRate.toFixed(1)}%`}
              icon={<Smile className="size-4" />}
              delta={deltaPercent(kpis.positiveRate, prev.positiveRate)}
              loading={isLoading}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartCard title="Volume trend" loading={isLoading} height={280}>
                <AreaChart data={series}>
                  <defs>
                    <linearGradient id="aCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" {...axis} />
                  <YAxis {...axis} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="calls" name="Calls" stroke={CHART_COLORS.primary} strokeWidth={2.5} fill="url(#aCalls)" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="avgMinutes" name="Avg minutes" stroke={CHART_COLORS.success} strokeWidth={2} dot={false} strokeDasharray="5 4" />
                </AreaChart>
              </ChartCard>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-soft">
              <h2 className="font-display text-[15px] font-bold text-foreground">Success rate</h2>
              {isLoading ? (
                <Skeleton className="mt-4 h-[280px] w-full" />
              ) : (
                <div className="relative mt-4">
                  <ResponsiveContainer width="100%" height={280}>
                    <RadialBarChart innerRadius="72%" outerRadius="100%" startAngle={90} endAngle={-270} data={[{ name: "Success", value: kpis.successRate, fill: CHART_COLORS.primary }]}>
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar dataKey="value" cornerRadius={12} background={{ fill: "var(--accent)" }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="num font-display text-4xl font-bold text-foreground">{kpis.successRate.toFixed(0)}%</div>
                    <div className="text-xs text-muted-foreground">calls marked successful</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ChartCard title="Weekly rhythm" loading={isLoading} height={280}>
              <RadarChart data={weekdays} outerRadius="75%">
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="label" fontSize={12} stroke="var(--muted-foreground)" />
                <Radar dataKey="calls" name="Calls" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.25} strokeWidth={2} />
                <Tooltip contentStyle={tooltipStyle} />
              </RadarChart>
            </ChartCard>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <ChartCard title="Calls per period" loading={isLoading}>
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={tooltipStyle} />
                <Bar dataKey="calls" name="Calls" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Total minutes per period" loading={isLoading}>
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} />
                <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={tooltipStyle} />
                <Bar dataKey="minutes" name="Minutes" fill={CHART_COLORS.primarySoft} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Average call duration (minutes)" loading={isLoading}>
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} />
                <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={tooltipStyle} />
                <Bar dataKey="avgMinutes" name="Avg minutes" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Successful vs unsuccessful" loading={isLoading}>
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={tooltipStyle} />
                <Legend iconType="circle" />
                <Bar dataKey="successful" stackId="a" name="Successful" fill={CHART_COLORS.success} />
                <Bar dataKey="unsuccessful" stackId="a" name="Unsuccessful" fill={CHART_COLORS.warning} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Sentiment per period" loading={isLoading}>
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={tooltipStyle} />
                <Legend iconType="circle" />
                <Bar dataKey="positive" stackId="s" name="Positive" fill={CHART_COLORS.success} />
                <Bar dataKey="neutral" stackId="s" name="Neutral" fill={CHART_COLORS.neutral} />
                <Bar dataKey="negative" stackId="s" name="Negative" fill={CHART_COLORS.danger} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Calls by hour of day" loading={isLoading}>
              <BarChart data={hours}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" {...axis} interval={2} />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={tooltipStyle} />
                <Bar dataKey="calls" name="Calls" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Calls by day of week" loading={isLoading}>
              <BarChart data={weekdays}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} allowDecimals={false} />
                <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={tooltipStyle} />
                <Bar dataKey="calls" name="Calls" fill={CHART_COLORS.primarySoft} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Disconnection reasons" loading={isLoading} height={280}>
              <BarChart data={reasons} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis type="number" {...axis} allowDecimals={false} />
                <YAxis type="category" dataKey="label" width={130} {...axis} />
                <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={tooltipStyle} />
                <Bar dataKey="calls" name="Calls" fill={CHART_COLORS.primary} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ChartCard>

            {agents.length > 1 ? (
              <ChartCard title="Calls per agent" loading={isLoading}>
                <BarChart data={agents}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" {...axis} />
                  <YAxis {...axis} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={tooltipStyle} />
                  <Bar dataKey="calls" name="Calls" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartCard>
            ) : null}
          </div>
        </>
      )}
    </AppShell>
  );
}
