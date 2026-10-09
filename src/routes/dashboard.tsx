import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  CalendarX,
  Clock,
  Clock3,
  DollarSign,
  Gauge,
  Kanban,
  Mail,
  PhoneCall,
  Smile,
  Target,
  User,
  Voicemail,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { CallDetailDrawer } from "@/components/call-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalls, useTodaySpend } from "@/hooks/use-calls";
import {
  agentStats,
  buildSeries,
  computeKpis,
  formatUsd,
} from "@/lib/analytics";
import {
  callAppointmentBooked,
  callAppointmentTiming,
  callCustomerName,
  callEmail,
  callLeadStage,
  callPhoneNumber,
  formatDateTime,
  formatDuration,
  STAGE_CONFIG,
  type LeadStage,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import type { RetellCall } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const { isAdmin } = useAuth();
  const { data: calls, isLoading, isError } = useCalls();
  const today = useTodaySpend();
  const [selected, setSelected] = useState<RetellCall | null>(null);

  const kpis = computeKpis(calls ?? []);
  const series = buildSeries(calls ?? [], "day");
  const agents = agentStats(calls ?? []);
  const recent = [...(calls ?? [])].sort((a, b) => b.start_timestamp - a.start_timestamp).slice(0, 5);

  const bookedAppointments = useMemo(() => {
    return (calls ?? [])
      .filter((c) => callAppointmentBooked(c) === true || callAppointmentTiming(c) != null)
      .sort((a, b) => b.start_timestamp - a.start_timestamp);
  }, [calls]);

  const stageStats = useMemo(() => {
    const counts: Record<LeadStage, number> = {
      contacted: 0,
      appointment_booked: 0,
      not_booked: 0,
      appointment_done: 0,
      closed: 0,
    };
    for (const c of calls ?? []) {
      const stg = callLeadStage(c);
      counts[stg] = (counts[stg] || 0) + 1;
    }
    return counts;
  }, [calls]);

  return (
    <AppShell title="Overview" description="Live call performance across your voice agents">
      <FilterBar />

      {isAdmin && today.over ? (
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
            {isAdmin ? (
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
            ) : (
              <section className="min-w-0 overflow-hidden rounded-lg bg-primary p-6 text-primary-foreground shadow-card sm:p-8" aria-label="Call volume">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-primary-foreground/75">Total calls</p>
                    {isLoading ? <Skeleton className="mt-3 h-12 w-40 bg-primary-foreground/20" /> : <p className="num mt-3 break-words text-4xl font-bold sm:text-5xl">{kpis.totalCalls.toLocaleString()}</p>}
                  </div>
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-foreground/15"><PhoneCall className="size-5" /></span>
                </div>
                <div className="mt-7 grid grid-cols-2 gap-4 border-t border-primary-foreground/25 pt-5">
                  <div><p className="text-xs text-primary-foreground/75">Calls today</p><p className="num mt-1 text-lg font-semibold">{isLoading ? "—" : kpis.callsToday.toLocaleString()}</p></div>
                  <div><p className="text-xs text-primary-foreground/75">Average duration</p><p className="num mt-1 text-lg font-semibold">{isLoading ? "—" : formatDuration(kpis.avgDurationMs)}</p></div>
                </div>
              </section>
            )}

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-soft sm:p-5">
                <div className="flex items-center gap-2 text-muted-foreground"><Clock3 className="size-4 shrink-0 text-primary" /><span className="text-xs font-medium">Talk time</span></div>
                <p className="num mt-4 text-2xl font-bold text-foreground sm:text-3xl">{isLoading ? "—" : formatDuration(kpis.totalTalkMs)}</p>
              </div>
              {isAdmin ? (
                <div className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-soft sm:p-5">
                  <div className="flex items-center gap-2 text-muted-foreground"><PhoneCall className="size-4 shrink-0 text-primary" /><span className="text-xs font-medium">Total calls</span></div>
                  <p className="num mt-4 text-3xl font-bold text-foreground">{isLoading ? "—" : kpis.totalCalls.toLocaleString()}</p>
                </div>
              ) : (
                <div className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-soft sm:p-5">
                  <div className="flex items-center gap-2 text-muted-foreground"><Target className="size-4 shrink-0 text-primary" /><span className="text-xs font-medium">Success rate</span></div>
                  <p className="num mt-4 text-3xl font-bold text-foreground">{isLoading ? "—" : `${kpis.successRate.toFixed(1)}%`}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <section className="min-w-0 rounded-lg border border-border bg-card p-5 shadow-soft sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">{isAdmin ? "Daily Retell spend" : "Daily call volume"}</h2>
                <span className="text-xs text-muted-foreground">{isAdmin ? "USD" : "Calls"}</span>
              </div>
            {isLoading ? (
              <Skeleton className="mt-4 h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={210} className="mt-4">
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" tickFormatter={isAdmin ? ((v: number) => `$${v}`) : ((v: number) => String(v))} allowDecimals={false} />
                  <Tooltip formatter={isAdmin ? ((v: number) => formatUsd(v)) : ((v: number) => [`${v} calls`, "Calls"])} contentStyle={{ borderRadius: 12, borderColor: "var(--border)", backgroundColor: "var(--popover)", color: "var(--popover-foreground)" }} />
                  <Bar dataKey={isAdmin ? "cost" : "calls"} name={isAdmin ? "Retell spend" : "Calls"} fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
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
                  {isAdmin ? (
                    <>
                      <span className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground"><Gauge className="size-4 shrink-0 text-primary" />Cost per minute</span>
                      <span className="num text-sm font-semibold text-foreground">{isLoading ? "—" : formatUsd(kpis.costPerMinute)}</span>
                    </>
                  ) : (
                    <>
                      <span className="flex min-w-0 items-center gap-3 text-sm text-muted-foreground"><Clock3 className="size-4 shrink-0 text-primary" />Avg duration</span>
                      <span className="num text-sm font-semibold text-foreground">{isLoading ? "—" : formatDuration(kpis.avgDurationMs)}</span>
                    </>
                  )}
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
                    {isAdmin && (
                      <span className="num shrink-0 font-semibold text-foreground">{formatUsd(a.cost)}</span>
                    )}
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
                      {isAdmin && <th className="px-5 py-2 font-medium">Retell cost</th>}
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
                        {isAdmin && <td className="px-5 py-3">{formatUsd(a.cost)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>

          {/* Lead Pipeline Summary */}
          <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Kanban className="size-4" />
                </div>
                <div>
                  <h2 className="font-display text-[15px] font-bold text-foreground">
                    Lead Pipeline Stages
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Automatically extracted from AI voice calls and appointment outcomes
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/pipeline">Open Pipeline Board →</Link>
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {(
                [
                  "contacted",
                  "appointment_booked",
                  "not_booked",
                  "appointment_done",
                  "closed",
                ] as LeadStage[]
              ).map((stg) => {
                const cfg = STAGE_CONFIG[stg];
                const count = stageStats[stg] || 0;
                const total = (calls ?? []).length;
                const pct = total ? Math.round((count / total) * 100) : 0;

                return (
                  <Link
                    key={stg}
                    to="/pipeline"
                    className="group rounded-xl border border-border bg-muted/20 p-3.5 transition-all hover:border-primary/40 hover:bg-muted/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground truncate">
                        {cfg.label}
                      </span>
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: cfg.color }}
                      />
                    </div>
                    <div className="num mt-2 font-display text-2xl font-bold text-foreground">
                      {count}
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{pct}% of calls</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Upcoming Appointments & Calendar Section */}
          <div className="mt-6 rounded-xl border border-border bg-card shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                  <CalendarDays className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-[15px] font-bold text-foreground">
                      Upcoming Appointments & Schedule
                    </h2>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      {bookedAppointments.length} Booked
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Confirmed appointments scheduled during voice conversations
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/pipeline">View calendar in pipeline</Link>
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-3 p-5">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : bookedAppointments.length === 0 ? (
              <div className="p-8 text-center">
                <CalendarDays className="mx-auto size-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm font-medium text-foreground">
                  No appointments scheduled yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  When your voice agents book appointments, client names, contact details, and timing will automatically show up here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {bookedAppointments.slice(0, 6).map((call) => {
                  const customerName = callCustomerName(call) || `Caller ${callPhoneNumber(call).slice(-4)}`;
                  const email = callEmail(call);
                  const timing = callAppointmentTiming(call);
                  const phone = callPhoneNumber(call);

                  return (
                    <div
                      key={call.call_id}
                      onClick={() => setSelected(call)}
                      className="group flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40 cursor-pointer"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                          <CalendarCheck className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {customerName}
                            </span>
                            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.2 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                              Booked
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              <PhoneCall className="size-3 text-muted-foreground" /> {phone}
                            </span>
                            {email && (
                              <span className="flex items-center gap-1">
                                <Mail className="size-3 text-muted-foreground" /> {email}
                              </span>
                            )}
                            <span className="text-[11px]">via {call.agent_name}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {timing && (
                          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            <Clock className="size-3.5" />
                            <span>{timing}</span>
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {formatDateTime(call.start_timestamp)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(call);
                          }}
                          className="h-8 text-xs text-primary hover:text-primary/80"
                        >
                          View Call
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
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
                {recent.map((call) => {
                  const customerName = callCustomerName(call);
                  const booked = callAppointmentBooked(call);
                  const inVoicemail = call.call_analysis?.in_voicemail;

                  return (
                    <Button
                      key={call.call_id}
                      type="button"
                      variant="ghost"
                      onClick={() => setSelected(call)}
                      className="block h-auto w-full rounded-none p-4 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{call.agent_name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDateTime(call.start_timestamp)} · {formatDuration(call.duration_ms)}
                          </p>
                        </div>
                        {isAdmin && (
                          <span className="num shrink-0 font-semibold text-foreground">
                            {call.call_cost ? formatUsd(call.call_cost.combined_cost) : "—"}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {customerName && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
                            <User className="size-3 text-primary" /> {customerName}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{callPhoneNumber(call)}</span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {booked !== null && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              booked
                                ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                : "border border-muted bg-muted/60 text-muted-foreground",
                            )}
                          >
                            {booked ? <CalendarCheck className="size-3" /> : <CalendarX className="size-3" />}
                            {booked ? "Booked" : "Not booked"}
                          </span>
                        )}
                        {inVoicemail && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                            <Voicemail className="size-3" /> Voicemail
                          </span>
                        )}
                        <SentimentBadge sentiment={call.call_analysis?.user_sentiment ?? "Unknown"} />
                        <SuccessBadge successful={Boolean(call.call_analysis?.call_successful)} />
                      </div>
                    </Button>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-5 py-2 font-medium">Date</th>
                      <th className="px-5 py-2 font-medium">Agent</th>
                      <th className="px-5 py-2 font-medium">Caller / Contact</th>
                      <th className="px-5 py-2 font-medium">Post-Call Analysis</th>
                      <th className="px-5 py-2 font-medium">Duration</th>
                      <th className="px-5 py-2 font-medium">Sentiment</th>
                      <th className="px-5 py-2 font-medium">Success</th>
                      {isAdmin && <th className="px-5 py-2 font-medium">Cost</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((call) => {
                      const customerName = callCustomerName(call);
                      const booked = callAppointmentBooked(call);
                      const inVoicemail = call.call_analysis?.in_voicemail;

                      return (
                        <tr
                          key={call.call_id}
                          onClick={() => setSelected(call)}
                          className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/50"
                        >
                          <td className="whitespace-nowrap px-5 py-3 text-xs">{formatDateTime(call.start_timestamp)}</td>
                          <td className="px-5 py-3 font-medium">{call.agent_name}</td>
                          <td className="whitespace-nowrap px-5 py-3">
                            <div className="flex flex-col">
                              {customerName ? (
                                <span className="flex items-center gap-1 font-semibold text-foreground">
                                  <User className="size-3 text-primary" /> {customerName}
                                </span>
                              ) : null}
                              <span className="text-xs text-muted-foreground">{callPhoneNumber(call)}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {booked !== null && (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                    booked
                                      ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                      : "border border-muted bg-muted/60 text-muted-foreground",
                                  )}
                                >
                                  {booked ? <CalendarCheck className="size-3" /> : <CalendarX className="size-3" />}
                                  {booked ? "Booked" : "Not booked"}
                                </span>
                              )}
                              {inVoicemail && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                  <Voicemail className="size-3" /> Voicemail
                                </span>
                              )}
                              {booked === null && !inVoicemail && (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3">{formatDuration(call.duration_ms)}</td>
                          <td className="px-5 py-3">
                            <SentimentBadge sentiment={call.call_analysis?.user_sentiment ?? "Unknown"} />
                          </td>
                          <td className="px-5 py-3">
                            <SuccessBadge successful={Boolean(call.call_analysis?.call_successful)} />
                          </td>
                          {isAdmin && (
                            <td className="num whitespace-nowrap px-5 py-3 font-medium">
                              {call.call_cost ? formatUsd(call.call_cost.combined_cost) : "—"}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        </>
      )}

      <CallDetailDrawer call={selected} onClose={() => setSelected(null)} />
    </AppShell>
  );
}
