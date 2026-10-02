import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bot, DollarSign, PiggyBank, Plus, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { FilterBar } from "@/components/filter-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { useCalls, useTodaySpend } from "@/hooks/use-calls";
import * as api from "@/lib/api";
import { formatUsd } from "@/lib/analytics";

export const Route = createFileRoute("/admin/billing")({
  head: () => ({
    meta: [
      { title: "Billing | Voice Agent Dashboard" },
      { name: "description", content: "Retell spend per client, billing rates, profit and daily spend alerts." },
      { property: "og:title", content: "Billing | Voice Agent Dashboard" },
      { property: "og:description", content: "Retell spend per client, billing rates, profit and daily spend alerts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth adminOnly>
      <BillingPage />
    </RequireAuth>
  ),
});

function parseMoney(v: string): number | null {
  const t = v.trim().replace(/^\$/, "");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) throw new Error("Enter a valid amount, like 0.25");
  return n;
}

function RateInput({ userId, rate }: { userId: string; rate: number | null }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(rate == null ? "" : String(rate));
  useEffect(() => setValue(rate == null ? "" : String(rate)), [rate]);
  const save = useMutation({
    mutationFn: () => api.setClientRate(userId, parseMoney(value)),
    onSuccess: () => {
      toast.success("Price saved");
      qc.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const dirty = value !== (rate == null ? "" : String(rate));
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
        <Input
          aria-label="Price per minute"
          className="h-8 w-24 pl-5 text-sm"
          placeholder="0.00"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>
      {dirty ? (
        <Button size="sm" variant="outline" className="h-8" disabled={save.isPending} onClick={() => save.mutate()}>
          Save
        </Button>
      ) : null}
    </div>
  );
}

function BillingPage() {
  const qc = useQueryClient();
  const { data: calls, isLoading: callsLoading } = useCalls();
  const clients = useQuery({ queryKey: ["subaccounts"], queryFn: () => api.listSubaccounts() });
  const billing = useQuery({ queryKey: ["billing"], queryFn: () => api.getBillingSettings() });
  const today = useTodaySpend();

  const [limit, setLimit] = useState("");
  useEffect(() => {
    const l = billing.data?.dailySpendLimit;
    setLimit(l == null ? "" : String(l));
  }, [billing.data?.dailySpendLimit]);
  const saveLimit = useMutation({
    mutationFn: () => api.setDailySpendLimit(parseMoney(limit)),
    onSuccess: () => {
      toast.success("Daily limit saved");
      qc.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (clients.data ?? []).map((c) => {
    const ids = new Set(c.agents.map((a) => a.retell_agent_id));
    const mine = (calls ?? []).filter((call) => ids.has(call.agent_id));
    const minutes = mine.reduce((s, x) => s + x.duration_ms, 0) / 60000;
    const cost = mine.reduce((s, x) => s + (x.call_cost?.combined_cost ?? 0), 0);
    const rate = billing.data?.rates[c.id] ?? null;
    const revenue = rate == null ? null : rate * minutes;
    return { client: c, calls: mine.length, minutes, cost, rate, revenue, profit: revenue == null ? null : revenue - cost };
  });

  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalRevenue = rows.reduce((s, r) => s + (r.revenue ?? 0), 0);
  const billedCost = rows.filter((r) => r.revenue != null).reduce((s, r) => s + r.cost, 0);
  const totalRetellCost = (calls ?? []).reduce((s, x) => s + (x.call_cost?.combined_cost ?? 0), 0);
  const loading = callsLoading || clients.isLoading || billing.isLoading;
  const shared = new Set<string>();
  const seen = new Set<string>();
  (clients.data ?? []).forEach((c) =>
    c.agents.forEach((a) => (seen.has(a.retell_agent_id) ? shared.add(a.agent_name) : seen.add(a.retell_agent_id))),
  );

  // Group calls by agent for agent-level breakdown
  const agentClientMap = new Map<string, string>();
  (clients.data ?? []).forEach((c) => {
    c.agents.forEach((a) => {
      agentClientMap.set(a.retell_agent_id, c.full_name || c.email);
    });
  });

  const agentMap = new Map<string, { agent_id: string; agent_name: string; calls: number; duration_ms: number; cost: number; client_name: string }>();
  (calls ?? []).forEach((call) => {
    const existing = agentMap.get(call.agent_id) ?? {
      agent_id: call.agent_id,
      agent_name: call.agent_name || call.agent_id,
      calls: 0,
      duration_ms: 0,
      cost: 0,
      client_name: agentClientMap.get(call.agent_id) ?? "Unassigned",
    };
    existing.calls += 1;
    existing.duration_ms += call.duration_ms;
    existing.cost += call.call_cost?.combined_cost ?? 0;
    agentMap.set(call.agent_id, existing);
  });
  const agentRows = [...agentMap.values()].sort((a, b) => b.cost - a.cost);

  return (
    <AppShell title="Billing" description="What each client costs you on Retell, what you charge, and your profit">
      <FilterBar />

      {today.over ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Today's spend is <b>{formatUsd(today.spend)}</b>, over your daily limit of <b>{formatUsd(today.limit ?? 0)}</b>.
          </span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Retell Spend" value={formatUsd(totalRetellCost)} icon={<DollarSign className="size-4" />} loading={loading} />
        <StatCard label="Billed to Clients" value={formatUsd(totalRevenue)} icon={<Wallet className="size-4" />} loading={loading} />
        <StatCard label="Profit" value={formatUsd(totalRevenue - billedCost)} icon={<PiggyBank className="size-4" />} loading={loading} />
        <StatCard label="Spend Today" value={formatUsd(today.spend)} icon={<TrendingUp className="size-4" />} loading={loading} />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h2 className="font-display text-[15px] font-bold text-foreground">Daily spend alert</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Get a warning on Overview and Billing when a day's Retell spend goes over this amount. Leave empty to turn it off.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="limit">Daily limit (USD)</Label>
            <Input id="limit" className="w-40" placeholder="e.g. 25" inputMode="decimal" value={limit} onChange={(e) => setLimit(e.target.value)} />
          </div>
          <Button onClick={() => saveLimit.mutate()} disabled={saveLimit.isPending}>Save limit</Button>
          <span className="text-sm text-muted-foreground">
            Today so far: {formatUsd(today.spend)}
            {today.limit != null ? ` of ${formatUsd(today.limit)}` : ""}
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-[15px] font-bold text-foreground">Spend by client</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Based on calls made by each client's agents in the selected dates. Set a price per minute to see what to bill.
            </p>
          </div>
          <Link to="/admin/subaccounts">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="size-3.5" /> Manage clients
            </Button>
          </Link>
        </div>
        {loading ? (
          <Skeleton className="m-5 h-24" />
        ) : rows.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No client subaccounts yet. Add clients to assign voice agents and set per-minute billing rates.</p>
            <Link to="/admin/subaccounts" className="mt-3 inline-block">
              <Button size="sm" variant="default" className="gap-1.5">
                <Plus className="size-3.5" /> Add client
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-2 font-medium">Client</th>
                  <th className="px-5 py-2 font-medium">Calls</th>
                  <th className="px-5 py-2 font-medium">Minutes</th>
                  <th className="px-5 py-2 font-medium">Retell cost</th>
                  <th className="px-5 py-2 font-medium">Price / min</th>
                  <th className="px-5 py-2 font-medium">To bill</th>
                  <th className="px-5 py-2 font-medium">Profit</th>
                </tr>
              </thead>
              <tbody className="num">
                {rows.map((r) => (
                  <tr key={r.client.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <div className="font-medium">{r.client.full_name || r.client.email}</div>
                      <div className="text-xs text-muted-foreground">{r.client.email}</div>
                    </td>
                    <td className="px-5 py-3">{r.calls}</td>
                    <td className="px-5 py-3">{r.minutes.toFixed(1)}</td>
                    <td className="px-5 py-3">{formatUsd(r.cost)}</td>
                    <td className="px-5 py-3"><RateInput userId={r.client.id} rate={r.rate} /></td>
                    <td className="px-5 py-3">{r.revenue == null ? "—" : formatUsd(r.revenue)}</td>
                    <td className={`px-5 py-3 font-medium ${r.profit != null && r.profit < 0 ? "text-destructive" : "text-success"}`}>
                      {r.profit == null ? "—" : formatUsd(r.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {shared.size ? (
          <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            Note: {[...shared].join(", ")} is shared by more than one client, so its calls count for each of them.
          </p>
        ) : null}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-soft">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-[15px] font-bold text-foreground">Spend by voice agent</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Usage and Retell cost per agent in the selected dates across your account.
          </p>
        </div>
        {loading ? (
          <Skeleton className="m-5 h-24" />
        ) : agentRows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No voice agent calls in the selected date range.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-5 py-2 font-medium">Voice agent</th>
                  <th className="px-5 py-2 font-medium">Assigned client</th>
                  <th className="px-5 py-2 font-medium">Calls</th>
                  <th className="px-5 py-2 font-medium">Minutes</th>
                  <th className="px-5 py-2 font-medium">Retell cost</th>
                  <th className="px-5 py-2 font-medium">Avg cost / call</th>
                </tr>
              </thead>
              <tbody className="num">
                {agentRows.map((a) => {
                  const minutes = a.duration_ms / 60000;
                  const avgCost = a.calls > 0 ? a.cost / a.calls : 0;
                  return (
                    <tr key={a.agent_id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Bot className="size-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">{a.agent_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{a.client_name}</td>
                      <td className="px-5 py-3">{a.calls}</td>
                      <td className="px-5 py-3">{minutes.toFixed(1)}</td>
                      <td className="px-5 py-3 font-medium text-foreground">{formatUsd(a.cost)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{formatUsd(avgCost)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
