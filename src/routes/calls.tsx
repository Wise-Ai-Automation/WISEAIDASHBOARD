import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpDown, Clock, DollarSign, Download, PhoneCall, Receipt, Search, Target, Timer } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { FilterBar, SentimentBadge, SuccessBadge } from "@/components/filter-bar";
import { CallDetailDrawer } from "@/components/call-detail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalls } from "@/hooks/use-calls";
import { callEmail, callPhoneNumber, downloadCsv, formatDateTime, formatDuration, formatReason, toCsv } from "@/lib/format";
import type { RetellCall } from "@/lib/types";
import { formatUsd } from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/calls")({
  head: () => ({
    meta: [
      { title: "Call Logs | Voice Agent Dashboard" },
      { name: "description", content: "Search, review and export every voice agent call with transcripts." },
      { property: "og:title", content: "Call Logs | Voice Agent Dashboard" },
      { property: "og:description", content: "Search, review and export every voice agent call." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <CallsPage />
    </RequireAuth>
  ),
});

type SortKey = "start_timestamp" | "duration_ms" | "agent_name";
const PAGE_SIZE = 15;

function CallsPage() {
  const { isAdmin } = useAuth();
  const { data: calls, isLoading, isError } = useCalls();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("start_timestamp");
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<RetellCall | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = (calls ?? []).filter((c) => {
      if (!term) return true;
      return [
        c.agent_name,
        callPhoneNumber(c),
        callEmail(c) ?? "",
        c.call_analysis.call_summary,
        c.disconnection_reason,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
    return list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return asc ? cmp : -cmp;
    });
  }, [calls, search, sortKey, asc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const totalCost = filtered.reduce((sum, call) => sum + (call.call_cost?.combined_cost ?? 0), 0);
  const totalTalkMs = filtered.reduce((sum, call) => sum + call.duration_ms, 0);
  const pricedCalls = filtered.filter((call) => call.call_cost != null).length;
  const averageCost = pricedCalls ? totalCost / pricedCalls : 0;
  const avgDurationMs = filtered.length ? totalTalkMs / filtered.length : 0;
  const successCount = filtered.filter((c) => c.call_analysis?.call_successful).length;
  const successRate = filtered.length ? (successCount / filtered.length) * 100 : 0;

  function sortBy(key: SortKey) {
    if (key === sortKey) setAsc(!asc);
    else {
      setSortKey(key);
      setAsc(false);
    }
  }

  return (
    <AppShell title="Call Logs" description="Every call in the selected range, straight from Retell">
      <FilterBar />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search phone, email, agent or summary"
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            if (!filtered.length) {
              toast.error("Nothing to export in this view.");
              return;
            }
            downloadCsv(`calls-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(filtered, isAdmin));
            toast.success(`Exported ${filtered.length} calls`);
          }}
        >
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><PhoneCall className="size-3.5 text-primary" />Calls shown</div>
          <div className="num mt-2 font-display text-xl font-bold text-foreground">{filtered.length.toLocaleString()}</div>
        </div>
        {isAdmin ? (
          <>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><DollarSign className="size-3.5 text-primary" />Total cost</div>
              <div className="num mt-2 font-display text-xl font-bold text-foreground">{formatUsd(totalCost)}</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Receipt className="size-3.5 text-primary" />Average cost</div>
              <div className="num mt-2 font-display text-xl font-bold text-foreground">{pricedCalls ? formatUsd(averageCost) : "—"}</div>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Timer className="size-3.5 text-primary" />Avg duration</div>
              <div className="num mt-2 font-display text-xl font-bold text-foreground">{formatDuration(avgDurationMs)}</div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Target className="size-3.5 text-primary" />Success rate</div>
              <div className="num mt-2 font-display text-xl font-bold text-foreground">{`${successRate.toFixed(1)}%`}</div>
            </div>
          </>
        )}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Clock className="size-3.5 text-primary" />Talk time</div>
          <div className="num mt-2 font-display text-xl font-bold text-foreground">{formatDuration(totalTalkMs)}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {isError ? (
          <p className="p-8 text-center text-sm text-destructive">
            We couldn't load your calls. Please refresh and try again.
          </p>
        ) : isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No calls match your filters. Try a wider date range or a different search.
          </p>
        ) : (
          <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">
                    <button className="flex items-center gap-1" onClick={() => sortBy("start_timestamp")}>
                      Date / Time <ArrowUpDown className="size-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <button className="flex items-center gap-1" onClick={() => sortBy("agent_name")}>
                      Agent <ArrowUpDown className="size-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">
                    <button className="flex items-center gap-1" onClick={() => sortBy("duration_ms")}>
                      Duration <ArrowUpDown className="size-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Sentiment</th>
                  <th className="px-4 py-3 font-medium">Success</th>
                  {isAdmin && <th className="px-4 py-3 font-medium">Cost</th>}
                  <th className="min-w-64 px-4 py-3 font-medium">Summary</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((call) => (
                  <tr
                    key={call.call_id}
                    onClick={() => setSelected(call)}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-muted/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3">{formatDateTime(call.start_timestamp)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{call.agent_name}</td>
                    <td className="whitespace-nowrap px-4 py-3">{callPhoneNumber(call)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{callEmail(call) ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDuration(call.duration_ms)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="whitespace-nowrap font-normal">
                        {formatReason(call.disconnection_reason)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <SentimentBadge sentiment={call.call_analysis.user_sentiment} />
                    </td>
                    <td className="px-4 py-3">
                      <SuccessBadge successful={call.call_analysis.call_successful} />
                    </td>
                    {isAdmin && (
                      <td className="num whitespace-nowrap px-4 py-3 font-medium">
                        {call.call_cost ? formatUsd(call.call_cost.combined_cost) : "—"}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className="line-clamp-2 max-w-md text-muted-foreground">
                        {call.call_analysis.call_summary}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="divide-y divide-border md:hidden">
            {rows.map((call) => (
              <Button
                key={call.call_id}
                type="button"
                variant="ghost"
                onClick={() => setSelected(call)}
                className="block h-auto w-full rounded-none p-4 text-left transition-colors hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{call.agent_name}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(call.start_timestamp)}</div>
                  </div>
                  {isAdmin && (
                    <div className="num shrink-0 text-right text-sm font-bold text-foreground">
                      {call.call_cost ? formatUsd(call.call_cost.combined_cost) : "—"}
                      <div className="mt-0.5 text-[11px] font-normal text-muted-foreground">Retell cost</div>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">{formatDuration(call.duration_ms)}</span>
                  <SuccessBadge successful={call.call_analysis.call_successful} />
                  <SentimentBadge sentiment={call.call_analysis.user_sentiment} />
                </div>
                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {call.call_analysis.call_summary || "No summary available."}
                </p>
              </Button>
            ))}
          </div>
          </>
        )}
      </div>

      {filtered.length > PAGE_SIZE ? (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <CallDetailDrawer call={selected} onClose={() => setSelected(null)} />
    </AppShell>
  );
}
