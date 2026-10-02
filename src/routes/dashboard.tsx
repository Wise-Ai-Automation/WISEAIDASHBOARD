import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock3, DollarSign, Gauge, PhoneCall, Smile, Target } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { FilterBar, SentimentBadge, SuccessBadge } from "@/components/filter-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalls, useTodaySpend } from "@/hooks/use-calls";
import { AlertTriangle } from "lucide-react";
import {
  agentStats,
  buildSeries,
  computeKpis,
  formatUsd,
} from "@/lib/analytics";
import { callPhoneNumber, formatDateTime, formatDuration } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Overview | Voice Agent Dashboard" },
      { name: "description", content: "Key call metrics, spend and trends for your Retell AI voice agents." },
      { property: "og:title", content: "Overview | Voice Agent Dashboard" },
      { property: "og:description", content: "Key call metrics, spend and trends for your Retell AI voice agents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  ),
});

function DashboardPage() {
  const { data: calls, isLoading, isError } = useCalls();
  const today = useTodaySpend();

  const kpis = computeKpis(calls ?? []);
  const series = buildSeries(calls ?? [], "day");
  const agents = agentStats(calls ?? []);
  const recent = [...(calls ?? [])].sort((a, b) => b.start_timestamp - a.start_timestamp).slice(0, 5);

  return (
    <AppShell title="Overview" description="Live call performance across your voice agents">
      <FilterBar />

      {today.over ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Spend alert: today's Retell spend is <b>{formatUsd(today.spend)}</b>, over your daily limit of{" "}
            <b>{formatUsd(today.limit ?? 0)}</b>.{" "}
            <Link to="/admin/billing" className="underline">Open Billing</Link>
          </span>
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          We couldn't load your calls. Please try refreshing in a moment.
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <section className="min-w-0 overflow-hidden rounded-lg bg-primary p-6 text-primary-foreground shadow-card sm:p-8" aria-label="Retell spending">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-primary-foreground/75">Total Retell spend</p>
                  {isLoading ? <Skeleton className="mt-3 h-12 w-40 bg-primary-foreground/20" /> : <p className="num mt-3 break-words text-4xl font-bold sm:text-5xl">{formatUsd(kpis.totalCost)}</p>}
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-foreground/15"><DollarSign className="size-5" /></span>
              </div>
              <div className="mt-7 grid grid-cols-2 gap-4 border-t border-primary-foreground/25 pt-5">
                <div><p className="text-xs text-primary-foreground/75">Spend today</p><p className="num mt-1 text-lg font-semibold">{isLoading ? "—" : formatUsd(kpis.costToday)}</p></div>
                <div><p className="text-xs text-primary-foreground/75">Average per call</p><p className="num mt-1 text-lg font-semibold">{isLoading ? "—" : formatUsd(kpis.avgCost)}</p></div>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-soft sm:p-5">
                <div className="flex items-center gap-2 text-muted-foreground"><PhoneCall className="size-4 shrink-0 text-primary" /><span className="text-xs font-medium">Total calls</span></div>
                <p className="num mt-4 text-3xl font-bold text-foreground">{isLoading ? "—" : kpis.totalCalls.toLocaleString()}</p>
              </div>
              <div className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-soft sm:p-5">
                <div className="flex items-center gap-2 text-muted-foreground"><Clock3 className="size-4 shrink-0 text-primary" /><span className="text-xs font-medium">Talk time</span></div>
                <p className="num mt-4 text-2xl font-bold text-foreground sm:text-3xl">{isLoading ? "—" : formatDuration(kpis.totalTalkMs)}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <section className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-soft sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">Daily Retell spend</h2>
                <span className="text-xs text-muted-foreground">USD</span>
              </div>
            {isLoading ? (
              <Skeleton className="mt-4 h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={210} className="mt-4">
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" tickFormatter={(v: number) => `$${v}`} />
                  <Tooltip formatter={(v: number) => formatUsd(v)} contentStyle={{ borderRadius: 12, borderColor: "var(--border)", backgroundColor: "var(--popover)", color: "var(--popover-foreground)" }} />
                  <Bar dataKey="cost" name="Retell spend" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            </section>

            <section className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-soft sm:p-6">
              <h2 className="text-base font-semibold text-foreground">Performance</h2>
              <div className="mt-3 divide-y divide-border">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <span className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground"><Target className="size-4 shrink-0 text-primary" />Success rate</span>
                  <span className="num text-sm font-semibold text-foreground">{isLoading ? "—" : `${kpis.successRate.toFixed(1)}%`}</span>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <span className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground"><Smile className="size-4 shrink-0 text-primary" />Positive sentiment</span>
                  <span className="num text-sm font-semibold text-foreground">{isLoading ? "—" : `${kpis.positiveRate.toFixed(1)}%`}</span>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <span className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground"><Gauge className="size-4 shrink-0 text-primary" />Cost per minute</span>
                  <span className="num text-sm font-semibold text-foreground">{isLoading ? "—" : formatUsd(kpis.costPerMinute)}</span>
                </div>
              </div>
              <Button variant="link" className="mt-2 px-0" asChild><Link to="/analytics">View analytics →</Link></Button>
            </section>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card shadow-soft">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-display text-[15px] font-bold text-foreground">Agent performance</h2>
            </div>
            {isLoading ? (
              <Skeleton className="m-5 h-24" />
            ) : agents.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No calls in this date range.</p>
            ) : (
              <>
              <div className="divide-y divide-border sm:hidden">
                {agents.map((a) => (
                  <div key={a.agent} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0"><p className="font-medium text-foreground">{a.agent}</p><p className="mt-1 text-xs text-muted-foreground">{a.calls} calls · {a.successRate.toFixed(0)}% success</p></div>
                    <span className="num shrink-0 font-semibold text-foreground">{formatUsd(a.cost)}</span>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-5 py-2 font-medium">Agent</th>
                      <th className="px-5 py-2 font-medium">Calls</th>
                      <th className="px-5 py-2 font-medium">Minutes</th>
                      <th className="px-5 py-2 font-medium">Success</th>
                      <th className="px-5 py-2 font-medium">Positive</th>
                      <th className="px-5 py-2 font-medium">Retell cost</th>
                    </tr>
                  </thead>
                  <tbody className="num">
                    {agents.map((a) => (
                      <tr key={a.agent} className="border-b border-border last:border-0">
                        <td className="px-5 py-3 font-medium">{a.agent}</td>
                        <td className="px-5 py-3">{a.calls}</td>
                        <td className="px-5 py-3">{a.minutes.toFixed(1)}</td>
                        <td className="px-5 py-3">{a.successRate.toFixed(0)}%</td>
                        <td className="px-5 py-3">{a.positiveRate.toFixed(0)}%</td>
                        <td className="px-5 py-3">{formatUsd(a.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card shadow-soft">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-[15px] font-bold text-foreground">Recent calls</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/calls">View all</Link>
              </Button>
            </div>
            {isLoading ? (
              <div className="space-y-3 p-5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No calls in this date range. Try widening the filter.
              </p>
            ) : (
              <>
              <div className="divide-y divide-border sm:hidden">
                {recent.map((call) => (
                  <div key={call.call_id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0"><p className="truncate font-medium text-foreground">{call.agent_name}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(call.start_timestamp)} · {formatDuration(call.duration_ms)}</p></div>
                    <span className="num shrink-0 font-semibold text-foreground">{call.call_cost ? formatUsd(call.call_cost.combined_cost) : "—"}</span>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-5 py-2 font-medium">Date</th>
                      <th className="px-5 py-2 font-medium">Agent</th>
                      <th className="px-5 py-2 font-medium">Phone</th>
                      <th className="px-5 py-2 font-medium">Duration</th>
                      <th className="px-5 py-2 font-medium">Sentiment</th>
                      <th className="px-5 py-2 font-medium">Success</th>
                      <th className="px-5 py-2 font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((call) => (
                      <tr key={call.call_id} className="border-b border-border last:border-0 hover:bg-muted/50">
                        <td className="whitespace-nowrap px-5 py-3">{formatDateTime(call.start_timestamp)}</td>
                        <td className="px-5 py-3">{call.agent_name}</td>
                        <td className="whitespace-nowrap px-5 py-3">{callPhoneNumber(call)}</td>
                        <td className="whitespace-nowrap px-5 py-3">{formatDuration(call.duration_ms)}</td>
                        <td className="px-5 py-3">
                          <SentimentBadge sentiment={call.call_analysis.user_sentiment} />
                        </td>
                        <td className="px-5 py-3">
                          <SuccessBadge successful={call.call_analysis.call_successful} />
                        </td>
                        <td className="num whitespace-nowrap px-5 py-3 font-medium">
                          {call.call_cost ? formatUsd(call.call_cost.combined_cost) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
