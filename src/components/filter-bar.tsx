import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, ChevronDown, RefreshCw, Users2 } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useFilters, PRESET_LABELS, type PresetKey } from "@/lib/filters-context";
import { useAgents } from "@/hooks/use-calls";
import { cn } from "@/lib/utils";

const PRESETS: PresetKey[] = ["today", "yesterday", "last7", "last30", "thisMonth", "lastMonth"];

function DateRangeFilter() {
  const { preset, range, setPreset, setCustomRange } = useFilters();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();

  const label =
    preset === "custom"
      ? `${new Date(range.from).toLocaleDateString()} – ${new Date(range.to).toLocaleDateString()}`
      : PRESET_LABELS[preset];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start gap-2">
          <CalendarDays className="size-4 text-muted-foreground" />
          {label}
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="flex flex-col gap-1 p-2 sm:w-40">
            {PRESETS.map((key) => (
              <Button
                key={key}
                variant={preset === key ? "secondary" : "ghost"}
                size="sm"
                className="justify-start"
                onClick={() => {
                  setPreset(key);
                  setOpen(false);
                }}
              >
                {PRESET_LABELS[key]}
              </Button>
            ))}
          </div>
          <Separator orientation="vertical" className="hidden sm:block" />
          <div className="p-2">
            <Calendar
              mode="range"
              numberOfMonths={1}
              selected={draft}
              onSelect={(value) => {
                setDraft(value);
                if (value?.from && value.to) {
                  const from = new Date(value.from);
                  from.setHours(0, 0, 0, 0);
                  const to = new Date(value.to);
                  to.setHours(23, 59, 59, 999);
                  setCustomRange({ from: from.getTime(), to: to.getTime() });
                  setOpen(false);
                }
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AgentFilter() {
  const { data: agents = [], isLoading } = useAgents();
  const { agentIds, setAgentIds } = useFilters();
  const [open, setOpen] = useState(false);

  const toggle = (id: string) =>
    setAgentIds(agentIds.includes(id) ? agentIds.filter((a) => a !== id) : [...agentIds, id]);

  const label = agentIds.length === 0 ? "All agents" : `${agentIds.length} agent${agentIds.length > 1 ? "s" : ""}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start gap-2" disabled={isLoading}>
          <Users2 className="size-4 text-muted-foreground" />
          {label}
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        <div className="max-h-72 overflow-y-auto">
          {agents.map((agent) => {
            const selected = agentIds.includes(agent.agent_id);
            return (
              <button
                key={agent.agent_id}
                onClick={() => toggle(agent.agent_id)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded border border-input",
                    selected && "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {selected ? <Check className="size-3" /> : null}
                </span>
                <span className="truncate">{agent.agent_name}</span>
              </button>
            );
          })}
        </div>
        {agentIds.length ? (
          <>
            <Separator className="my-1" />
            <Button variant="ghost" size="sm" className="w-full" onClick={() => setAgentIds([])}>
              Clear selection
            </Button>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function FilterBar({ extra }: { extra?: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [spinning, setSpinning] = useState(false);

  return (
    <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-2 sm:mb-6 [&>button]:shrink-0">
      <DateRangeFilter />
      <AgentFilter />
      {extra}
      <Button
        variant="outline"
        className="ml-auto shrink-0 gap-2"
        onClick={async () => {
          setSpinning(true);
          await queryClient.invalidateQueries({ queryKey: ["calls"] });
          await queryClient.invalidateQueries({ queryKey: ["calls-prev"] });
          setTimeout(() => setSpinning(false), 500);
        }}
      >
        <RefreshCw className={cn("size-4", spinning && "animate-spin")} />
        Refresh
      </Button>
    </div>
  );
}

export function SentimentBadge({ sentiment }: { sentiment: string }) {
  const tone =
    sentiment === "Positive"
      ? "bg-success/10 text-success border-success/20"
      : sentiment === "Negative"
        ? "bg-destructive/10 text-destructive border-destructive/20"
        : "bg-muted text-muted-foreground border-border";
  return <Badge className={cn("border font-medium", tone)}>{sentiment}</Badge>;
}

export function SuccessBadge({ successful }: { successful: boolean }) {
  return (
    <Badge
      className={cn(
        "border font-medium",
        successful
          ? "bg-success/10 text-success border-success/20"
          : "bg-warning/10 text-warning-foreground border-warning/30",
      )}
    >
      {successful ? "Successful" : "Unsuccessful"}
    </Badge>
  );
}
