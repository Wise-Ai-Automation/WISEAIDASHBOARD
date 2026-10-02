import type { RetellCall } from "./types";
import { formatReason } from "./format";

export type GroupBy = "day" | "week" | "month";

export interface Kpis {
  totalCalls: number;
  totalTalkMs: number;
  avgDurationMs: number;
  successRate: number;
  positiveRate: number;
  callsToday: number;
  /** Dollars (Retell cents already converted server-side). */
  totalCost: number;
  avgCost: number;
  costPerMinute: number;
  costToday: number;
  costPerSuccess: number;
}

const cost = (c: RetellCall) => c.call_cost?.combined_cost ?? 0;

export function computeKpis(calls: RetellCall[]): Kpis {
  const totalCalls = calls.length;
  const totalTalkMs = calls.reduce((sum, c) => sum + c.duration_ms, 0);
  const success = calls.filter((c) => c.call_analysis.call_successful).length;
  const positive = calls.filter((c) => c.call_analysis.user_sentiment === "Positive").length;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = calls.filter((c) => c.start_timestamp >= startOfToday.getTime());
  const totalCost = calls.reduce((s, c) => s + cost(c), 0);
  const minutes = totalTalkMs / 60000;

  return {
    totalCalls,
    totalTalkMs,
    avgDurationMs: totalCalls ? totalTalkMs / totalCalls : 0,
    successRate: totalCalls ? (success / totalCalls) * 100 : 0,
    positiveRate: totalCalls ? (positive / totalCalls) * 100 : 0,
    callsToday: today.length,
    totalCost,
    avgCost: totalCalls ? totalCost / totalCalls : 0,
    costPerMinute: minutes ? totalCost / minutes : 0,
    costToday: today.reduce((s, c) => s + cost(c), 0),
    costPerSuccess: success ? totalCost / success : 0,
  };
}

export function formatUsd(n: number) {
  return `$${n.toFixed(n !== 0 && Math.abs(n) < 1 ? 3 : 2)}`;
}

export interface AgentStat {
  agent: string;
  calls: number;
  minutes: number;
  successRate: number;
  positiveRate: number;
  cost: number;
}

export function agentStats(calls: RetellCall[]): AgentStat[] {
  const map = new Map<string, RetellCall[]>();
  calls.forEach((c) => map.set(c.agent_name, [...(map.get(c.agent_name) ?? []), c]));
  return [...map.entries()]
    .map(([agent, list]) => {
      const k = computeKpis(list);
      return {
        agent,
        calls: k.totalCalls,
        minutes: k.totalTalkMs / 60000,
        successRate: k.successRate,
        positiveRate: k.positiveRate,
        cost: k.totalCost,
      };
    })
    .sort((a, b) => b.calls - a.calls);
}

export function deltaPercent(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function bucketKey(ms: number, groupBy: GroupBy) {
  const d = new Date(ms);
  if (groupBy === "month") return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  if (groupBy === "week") {
    const monday = new Date(d);
    const offset = (d.getDay() + 6) % 7;
    monday.setDate(d.getDate() - offset);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().slice(0, 10);
  }
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function bucketLabel(key: string, groupBy: GroupBy) {
  if (groupBy === "month") {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  const d = new Date(key + "T00:00:00");
  const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return groupBy === "week" ? `Wk ${label}` : label;
}

export interface SeriesPoint {
  key: string;
  label: string;
  calls: number;
  minutes: number;
  avgMinutes: number;
  successful: number;
  unsuccessful: number;
  positive: number;
  neutral: number;
  negative: number;
  cost: number;
}

export function buildSeries(calls: RetellCall[], groupBy: GroupBy): SeriesPoint[] {
  const map = new Map<string, SeriesPoint>();
  for (const call of calls) {
    const key = bucketKey(call.start_timestamp, groupBy);
    const point =
      map.get(key) ??
      {
        key,
        label: bucketLabel(key, groupBy),
        calls: 0,
        minutes: 0,
        avgMinutes: 0,
        successful: 0,
        unsuccessful: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        cost: 0,
      };
    point.calls += 1;
    point.minutes += call.duration_ms / 60000;
    point.cost += cost(call);
    if (call.call_analysis.call_successful) point.successful += 1;
    else point.unsuccessful += 1;
    const s = call.call_analysis.user_sentiment;
    if (s === "Positive") point.positive += 1;
    else if (s === "Negative") point.negative += 1;
    else point.neutral += 1;
    map.set(key, point);
  }
  return [...map.values()]
    .map((p) => ({
      ...p,
      minutes: Math.round(p.minutes * 10) / 10,
      avgMinutes: Math.round((p.minutes / p.calls) * 10) / 10,
      cost: Math.round(p.cost * 1000) / 1000,
    }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));
}

export function byHour(calls: RetellCall[]) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ label: `${hour}:00`, calls: 0 }));
  calls.forEach((c) => {
    const bucket = buckets[new Date(c.start_timestamp).getHours()];
    if (bucket) bucket.calls += 1;
  });
  return buckets;
}

export function byWeekday(calls: RetellCall[]) {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const buckets = names.map((label) => ({ label, calls: 0 }));
  calls.forEach((c) => {
    const bucket = buckets[new Date(c.start_timestamp).getDay()];
    if (bucket) bucket.calls += 1;
  });
  return buckets;
}

export function byDisconnection(calls: RetellCall[]) {
  const map = new Map<string, number>();
  calls.forEach((c) => map.set(c.disconnection_reason, (map.get(c.disconnection_reason) ?? 0) + 1));
  return [...map.entries()]
    .map(([reason, count]) => ({ label: formatReason(reason), calls: count }))
    .sort((a, b) => b.calls - a.calls);
}

export function byAgent(calls: RetellCall[]) {
  const map = new Map<string, number>();
  calls.forEach((c) => map.set(c.agent_name, (map.get(c.agent_name) ?? 0) + 1));
  return [...map.entries()].map(([label, count]) => ({ label, calls: count })).sort((a, b) => b.calls - a.calls);
}

export function sentimentSplit(calls: RetellCall[]) {
  const counts = { Positive: 0, Neutral: 0, Negative: 0 };
  calls.forEach((c) => {
    const s = c.call_analysis.user_sentiment;
    if (s === "Positive") counts.Positive += 1;
    else if (s === "Negative") counts.Negative += 1;
    else counts.Neutral += 1;
  });
  return [
    { name: "Positive", value: counts.Positive },
    { name: "Neutral", value: counts.Neutral },
    { name: "Negative", value: counts.Negative },
  ];
}

export const CHART_COLORS = {
  primary: "var(--chart-1)",
  primarySoft: "var(--chart-2)",
  success: "var(--chart-3)",
  warning: "var(--chart-4)",
  danger: "var(--chart-5)",
  neutral: "var(--muted-foreground)",
};
