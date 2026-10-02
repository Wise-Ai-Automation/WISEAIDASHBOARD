import { ChevronDown, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AudioPlayer } from "@/components/audio-player";
import { SentimentBadge, SuccessBadge } from "@/components/filter-bar";
import { callEmail, callPhoneNumber, formatDateTime, formatDuration, formatReason, formatClock } from "@/lib/format";
import { formatUsd } from "@/lib/analytics";
import type { RetellCall } from "@/lib/types";
import { cn } from "@/lib/utils";

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
        <Meta label="Direction" value={call.direction} />
        <Meta label="Phone" value={callPhoneNumber(call)} />
        <Meta label="Email" value={callEmail(call) ?? "—"} />
        <Meta label="Duration" value={formatDuration(call.duration_ms)} />
        <Meta label="Started" value={formatDateTime(call.start_timestamp)} />
        <Meta label="Ended" value={formatDateTime(call.end_timestamp)} />
        <Meta label="Retell cost" value={call.call_cost ? formatUsd(call.call_cost.combined_cost) : "—"} />
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
