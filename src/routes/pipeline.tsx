import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarCheck,
  CalendarDays,
  CalendarX,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Kanban,
  Mail,
  MoreHorizontal,
  Phone,
  Search,
  Table as TableIcon,
  User,
  Voicemail,
  XCircle,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCalls } from "@/hooks/use-calls";
import {
  callAppointmentBooked,
  callAppointmentTiming,
  callBookingId,
  callCustomerName,
  callEmail,
  callLeadStage,
  callPhoneNumber,
  downloadCsv,
  formatDateTime,
  formatDuration,
  setLeadStageOverride,
  STAGE_CONFIG,
  type LeadStage,
} from "@/lib/format";
import type { RetellCall } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Lead Pipeline | Voice Agent Dashboard" },
      { name: "description", content: "Track client leads, upcoming appointments and pipeline stages automatically from call conversations." },
      { property: "og:title", content: "Lead Pipeline | Voice Agent Dashboard" },
      { property: "og:description", content: "Track client leads and upcoming appointments automatically." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <LeadPipelinePage />
    </RequireAuth>
  ),
});

const ALL_STAGES: LeadStage[] = [
  "contacted",
  "appointment_booked",
  "not_booked",
  "appointment_done",
  "closed",
];

function LeadPipelinePage() {
  const { data: calls, isLoading, isError } = useCalls();
  const [search, setSearch] = useState("");
  const [selectedStage, setSelectedStage] = useState<LeadStage | "all">("all");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [selectedCall, setSelectedCall] = useState<RetellCall | null>(null);
  const [stageOverridesVersion, setStageOverridesVersion] = useState(0);

  // Group and enrich calls into leads
  const allLeads = useMemo(() => {
    return (calls ?? []).map((call) => {
      const customerName = callCustomerName(call);
      const email = callEmail(call);
      const phone = callPhoneNumber(call);
      const booked = callAppointmentBooked(call);
      const timing = callAppointmentTiming(call);
      const bookingId = callBookingId(call);
      const stage = callLeadStage(call);

      return {
        call,
        customerName: customerName || "Caller " + phone.slice(-4),
        hasExplicitName: Boolean(customerName),
        email,
        phone,
        booked,
        timing,
        bookingId,
        stage,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calls, stageOverridesVersion]);

  // Filtered leads by search and stage
  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allLeads.filter((lead) => {
      if (selectedStage !== "all" && lead.stage !== selectedStage) {
        return false;
      }
      if (!q) return true;
      return (
        lead.customerName.toLowerCase().includes(q) ||
        lead.phone.toLowerCase().includes(q) ||
        (lead.email ?? "").toLowerCase().includes(q) ||
        lead.call.agent_name.toLowerCase().includes(q) ||
        (lead.timing ?? "").toLowerCase().includes(q)
      );
    });
  }, [allLeads, search, selectedStage]);

  // Stage distribution counts
  const stageCounts = useMemo(() => {
    const counts: Record<LeadStage, number> = {
      contacted: 0,
      appointment_booked: 0,
      not_booked: 0,
      appointment_done: 0,
      closed: 0,
    };
    for (const lead of allLeads) {
      counts[lead.stage] = (counts[lead.stage] || 0) + 1;
    }
    return counts;
  }, [allLeads]);

  const bookedCount = stageCounts.appointment_booked + stageCounts.appointment_done + stageCounts.closed;
  const bookingRate = allLeads.length ? (bookedCount / allLeads.length) * 100 : 0;

  function handleStageChange(callId: string, newStage: LeadStage) {
    setLeadStageOverride(callId, newStage);
    setStageOverridesVersion((v) => v + 1);
    toast.success(`Lead moved to "${STAGE_CONFIG[newStage].label}"`);
  }

  function handleExportCsv() {
    if (!filteredLeads.length) {
      toast.error("No leads to export.");
      return;
    }
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const headers = [
      "Client Name",
      "Phone Number",
      "Email",
      "Pipeline Stage",
      "Appointment Timing",
      "Booking ID",
      "Agent Name",
      "Call Date",
      "Call Duration (s)",
      "Sentiment",
    ];
    const rows = [
      headers.join(","),
      ...filteredLeads.map((l) => [
        escape(l.customerName),
        escape(l.phone),
        escape(l.email ?? ""),
        escape(STAGE_CONFIG[l.stage].label),
        escape(l.timing ?? ""),
        escape(l.bookingId ?? ""),
        escape(l.call.agent_name),
        escape(new Date(l.call.start_timestamp).toISOString()),
        Math.round(l.call.duration_ms / 1000),
        escape(l.call.call_analysis?.user_sentiment ?? "Unknown"),
      ].join(",")),
    ];
    downloadCsv(`lead-pipeline-${new Date().toISOString().slice(0, 10)}.csv`, rows.join("\n"));
    toast.success(`Exported ${filteredLeads.length} leads`);
  }

  return (
    <AppShell
      title="Lead Pipeline"
      description="Track client contacts, scheduled appointments, and deal stages automatically from voice agent calls"
    >
      <FilterBar />

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-soft">
          <div className="text-xs font-medium text-muted-foreground">Total Leads</div>
          <div className="num mt-1.5 text-2xl font-bold text-foreground">
            {allLeads.length.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">From voice calls</div>
        </div>

        {ALL_STAGES.map((stg) => {
          const cfg = STAGE_CONFIG[stg];
          const count = stageCounts[stg];
          return (
            <button
              key={stg}
              type="button"
              onClick={() => setSelectedStage(selectedStage === stg ? "all" : stg)}
              className={cn(
                "rounded-xl border p-3.5 text-left transition-all shadow-soft",
                selectedStage === stg
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card hover:bg-muted/30",
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-medium text-muted-foreground truncate">{cfg.label}</span>
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: cfg.color }}
                />
              </div>
              <div className="num mt-1.5 text-2xl font-bold text-foreground">{count}</div>
              <div className="mt-1 text-[11px] text-muted-foreground truncate">
                {allLeads.length ? `${Math.round((count / allLeads.length) * 100)}% of total` : "0%"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Controls Bar: Search, Stage Filter, View Mode, Export */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-64">
          <div className="relative flex-1 min-w-56 max-w-md">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client name, phone, email, or agent..."
              className="pl-9 h-9"
            />
          </div>

          {selectedStage !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedStage("all")}
              className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Filter className="size-3" /> Clear filter ({STAGE_CONFIG[selectedStage].label})
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === "kanban"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Kanban className="size-3.5" /> Pipeline Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                viewMode === "table"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <TableIcon className="size-3.5" /> Table View
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={handleExportCsv} className="h-9 gap-1.5">
            <Download className="size-3.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Main Content: Kanban or Table */}
      {isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center text-sm text-destructive">
          Unable to load lead pipeline. Please refresh and try again.
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ALL_STAGES.map((s) => (
            <div key={s} className="space-y-3 rounded-xl border border-border bg-card p-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ))}
        </div>
      ) : allLeads.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <CalendarDays className="mx-auto size-10 text-muted-foreground/60" />
          <h3 className="mt-3 font-display text-base font-semibold text-foreground">No leads in this date range</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Widen your filter in the top bar to see leads and appointments from earlier dates.
          </p>
        </div>
      ) : viewMode === "kanban" ? (
        /* Kanban Board View */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 items-start">
          {ALL_STAGES.map((stageKey) => {
            const config = STAGE_CONFIG[stageKey];
            const stageLeads = filteredLeads.filter((l) => l.stage === stageKey);

            return (
              <div
                key={stageKey}
                className="flex flex-col rounded-xl border border-border bg-card/60 shadow-soft backdrop-blur-xs min-h-[500px]"
              >
                {/* Stage Column Header */}
                <div className="border-b border-border/80 p-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      <h4 className="font-display text-xs font-bold text-foreground truncate">
                        {config.label}
                      </h4>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                      {stageLeads.length}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground truncate">
                    {config.description}
                  </p>
                </div>

                {/* Cards List */}
                <div className="flex-1 space-y-3 p-3 overflow-y-auto max-h-[70vh]">
                  {stageLeads.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
                      No leads in this stage
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.call.call_id}
                        className="group relative rounded-xl border border-border bg-card p-3.5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
                      >
                        {/* Top row: Name & Stage Mover */}
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCall(lead.call)}
                            className="text-left font-semibold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1.5 truncate"
                          >
                            <User className="size-3.5 text-primary shrink-0" />
                            <span className="truncate">{lead.customerName}</span>
                          </button>

                          {/* Quick stage changer */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                              >
                                <MoreHorizontal className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel className="text-xs">Move stage to</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {ALL_STAGES.map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={() => handleStageChange(lead.call.call_id, s)}
                                  disabled={s === lead.stage}
                                  className="text-xs flex items-center gap-2"
                                >
                                  <span
                                    className="size-2 rounded-full"
                                    style={{ backgroundColor: STAGE_CONFIG[s].color }}
                                  />
                                  <span>{STAGE_CONFIG[s].label}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Contact details */}
                        <div className="mt-2 space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="size-3 text-muted-foreground/80 shrink-0" />
                            <span className="font-mono text-[11px] truncate">{lead.phone}</span>
                          </div>
                          {lead.email && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Mail className="size-3 text-muted-foreground/80 shrink-0" />
                              <span className="truncate text-[11px]">{lead.email}</span>
                            </div>
                          )}
                        </div>

                        {/* Appointment Timing Banner if available */}
                        {lead.timing && (
                          <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                            <CalendarDays className="size-3 shrink-0" />
                            <span className="truncate font-semibold">{lead.timing}</span>
                          </div>
                        )}

                        {/* Footer Badges & Actions */}
                        <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-[11px]">
                          <span className="text-muted-foreground truncate">{lead.call.agent_name}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedCall(lead.call)}
                            className="font-medium text-primary hover:underline"
                          >
                            View call →
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Client Name</th>
                  <th className="px-4 py-3 font-medium">Phone Number</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">Appointment Timing</th>
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Call Date</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.call.call_id}
                    onClick={() => setSelectedCall(lead.call)}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {lead.customerName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-foreground">{lead.customerName}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{lead.phone}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {lead.email || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                          STAGE_CONFIG[lead.stage].badgeClass,
                        )}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: STAGE_CONFIG[lead.stage].color }}
                        />
                        {STAGE_CONFIG[lead.stage].label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {lead.timing ? (
                        <span className="inline-flex items-center gap-1 font-medium text-foreground">
                          <CalendarDays className="size-3 text-primary" /> {lead.timing}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">{lead.call.agent_name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {formatDateTime(lead.call.start_timestamp)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCall(lead.call);
                        }}
                        className="text-xs h-7 text-primary hover:text-primary/80"
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer */}
      <CallDetailDrawer call={selectedCall} onClose={() => setSelectedCall(null)} />
    </AppShell>
  );
}
