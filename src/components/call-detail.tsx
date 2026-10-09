import {
  CalendarCheck,
  CalendarX,
  ChevronDown,
  Code2,
  Copy,
  Mail,
  Sparkles,
  User,
  Voicemail,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AudioPlayer } from "@/components/audio-player";
import { SentimentBadge, SuccessBadge } from "@/components/filter-bar";
import {
  callAppointmentBooked,
  callBookingId,
  callCustomerName,
  callEmail,
  callPhoneNumber,
  formatClock,
  formatDateTime,
  formatDuration,
  formatReason,
} from "@/lib/format";
import { formatUsd } from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";
import type { RetellCall } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatKeyName(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function PostCallAnalysisSection({ call }: { call: RetellCall }) {
  const [showRaw, setShowRaw] = useState(false);
  const customData = call.call_analysis?.custom_analysis_data ?? {};
  const collectedVars = call.collected_dynamic_variables ?? {};
  const customerName = callCustomerName(call);
  const email = callEmail(call);
  const appointmentBooked = callAppointmentBooked(call);
  const bookingId = callBookingId(call);
  const inVoicemail = call.call_analysis?.in_voicemail;
  const completionRating = call.call_analysis?.call_completion_rating;

  const customEntries = Object.entries(customData);
  const collectedEntries = Object.entries(collectedVars);

  const hasAnalysis =
    customEntries.length > 0 ||
    collectedEntries.length > 0 ||
    customerName !== null ||
    appointmentBooked !== null ||
    inVoicemail ||
    Boolean(completionRating);

  if (!hasAnalysis) {
    return null;
  }

  const rawJson = JSON.stringify(
    {
      custom_analysis_data: customData,
      collected_dynamic_variables: collectedVars,
      in_voicemail: inVoicemail,
      call_completion_rating: completionRating,
    },
    null,
    2,
  );

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-soft dark:bg-primary/[0.03]">
      <div className="flex items-center justify-between border-b border-border/80 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h3 className="font-display text-[15px] font-bold text-foreground">
            Extracted Post-Call Analysis
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={async () => {
            await navigator.clipboard.writeText(rawJson);
            toast.success("Analysis JSON copied to clipboard");
          }}
        >
          <Copy className="size-3" /> Copy JSON
        </Button>
      </div>

      {/* Highlights badges */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {appointmentBooked !== null && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              appointmentBooked
                ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : "border border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300",
            )}
          >
            {appointmentBooked ? <CalendarCheck className="size-3.5" /> : <CalendarX className="size-3.5" />}
            {appointmentBooked ? "Appointment Booked" : "No Appointment Booked"}
          </span>
        )}

        {customerName && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground shadow-xs">
            <User className="size-3.5 text-primary" />
            <span className="text-muted-foreground">Caller:</span> {customerName}
          </span>
        )}

        {email && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground shadow-xs">
            <Mail className="size-3.5 text-primary" />
            {email}
          </span>
        )}

        {inVoicemail ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
            <Voicemail className="size-3.5" /> Voicemail Detected
          </span>
        ) : null}

        {completionRating ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground shadow-xs">
            <span className="text-muted-foreground">Rating:</span> {completionRating}
          </span>
        ) : null}
      </div>

      {/* Extracted Custom Analysis Variables */}
      {customEntries.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Extracted Variables ({customEntries.length})
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {customEntries.map(([key, val]) => {
              const displayVal =
                typeof val === "boolean"
                  ? val
                    ? "Yes"
                    : "No"
                  : typeof val === "object" && val !== null
                    ? JSON.stringify(val)
                    : String(val ?? "—");

              return (
                <div
                  key={key}
                  className="grid grid-cols-[130px_1fr] items-start gap-3 px-3 py-2 text-xs sm:grid-cols-[170px_1fr]"
                >
                  <span className="font-medium text-muted-foreground break-words">{formatKeyName(key)}</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground break-words">
                      {typeof val === "boolean" ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold",
                            val
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {displayVal}
                        </span>
                      ) : (
                        displayVal
                      )}
                    </span>
                    {typeof val === "string" && val.length > 2 && (
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(val);
                          toast.success(`Copied ${formatKeyName(key)}`);
                        }}
                        className="text-muted-foreground transition-opacity hover:text-foreground"
                        title="Copy value"
                      >
                        <Copy className="size-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Flow Dynamic Variables */}
      {collectedEntries.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Collected Flow Variables ({collectedEntries.length})
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {collectedEntries.map(([key, val]) => (
              <div
                key={key}
                className="grid grid-cols-[130px_1fr] items-start gap-3 px-3 py-2 text-xs sm:grid-cols-[170px_1fr]"
              >
                <span className="font-medium text-muted-foreground break-words">{formatKeyName(key)}</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-foreground break-all">
                    {typeof val === "object" ? JSON.stringify(val) : String(val ?? "—")}
                  </span>
                  {val != null && (
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(String(val));
                        toast.success(`Copied ${formatKeyName(key)}`);
                      }}
                      className="text-muted-foreground transition-opacity hover:text-foreground"
                      title="Copy value"
                    >
                      <Copy className="size-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw JSON expandable */}
      <div className="mt-3 pt-2">
        <button
          type="button"
          onClick={() => setShowRaw(!showRaw)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Code2 className="size-3" />
          <span>{showRaw ? "Hide raw analysis JSON" : "View raw analysis JSON"}</span>
          <ChevronDown className={cn("size-3 transition-transform", !showRaw && "-rotate-90")} />
        </button>
        {showRaw && (
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-border bg-muted p-2.5 font-mono text-[11px] text-foreground">
            {rawJson}
          </pre>
        )}
      </div>
    </div>
  );
}

function Transcript({ call }: { call: RetellCall }) {
  const [open, setOpen] = useState(true);
  const turns = call.transcript_object?.length ? call.transcript_object : null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
        >
          Transcript
          <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={async () => {
            await navigator.clipboard.writeText(call.transcript);
            toast.success("Transcript copied");
          }}
        >
          <Copy className="size-3.5" /> Copy
        </Button>
      </div>
      {open ? (
        <div className="mt-3 space-y-3">
          {turns
            ? turns.map((turn, i) => (
                <div key={i} className={cn("flex", turn.role === "agent" ? "justify-start" : "justify-end")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                      turn.role === "agent"
                        ? "rounded-tl-sm bg-muted text-foreground"
                        : "rounded-tr-sm bg-primary/10 text-foreground",
                    )}
                  >
                    <div className="mb-0.5 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                      <span className="capitalize">{turn.role}</span>
                      {turn.start != null ? <span>{formatClock(turn.start)}</span> : null}
                    </div>
                    {turn.content}
                  </div>
                </div>
              ))
            : (
                <pre className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm text-foreground">
                  {call.transcript || "No transcript available."}
                </pre>
              )}
        </div>
      ) : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium break-words text-foreground">{value}</div>
    </div>
  );
}

export function CallDetailBody({ call }: { call: RetellCall }) {
  const { isAdmin } = useAuth();
  const customerName = callCustomerName(call);
  const bookingId = callBookingId(call);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <SentimentBadge sentiment={call.call_analysis.user_sentiment} />
        <SuccessBadge successful={call.call_analysis.call_successful} />
        <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {formatReason(call.disconnection_reason)}
        </span>
      </div>

      <div>
        <h3 className="font-display text-[15px] font-bold text-foreground">Summary</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {call.call_analysis.call_summary || "No summary available."}
        </p>
      </div>

      <PostCallAnalysisSection call={call} />

      {call.recording_url ? (
        <AudioPlayer src={call.recording_url} filename={`${call.call_id}.mp3`} />
      ) : (
        <p className="text-sm text-muted-foreground">No recording available for this call.</p>
      )}

      <Separator />
      <Transcript call={call} />
      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <Meta label="Call ID" value={call.call_id} />
        <Meta label="Agent" value={call.agent_name} />
        {customerName && <Meta label="Customer Name" value={customerName} />}
        {bookingId && <Meta label="Booking ID" value={bookingId} />}
        <Meta label="Direction" value={call.direction} />
        <Meta label="Phone" value={callPhoneNumber(call)} />
        <Meta label="Email" value={callEmail(call) ?? "—"} />
        <Meta label="Duration" value={formatDuration(call.duration_ms)} />
        <Meta label="Started" value={formatDateTime(call.start_timestamp)} />
        <Meta label="Ended" value={formatDateTime(call.end_timestamp)} />
        {isAdmin && (
          <Meta label="Retell cost" value={call.call_cost ? formatUsd(call.call_cost.combined_cost) : "—"} />
        )}
      </div>
    </div>
  );
}

export function CallDetailDrawer({ call, onClose }: { call: RetellCall | null; onClose: () => void }) {
  return (
    <Sheet open={!!call} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Call details</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-8">{call ? <CallDetailBody call={call} /> : null}</div>
      </SheetContent>
    </Sheet>
  );
}
