import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type PresetKey =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export const PRESET_LABELS: Record<PresetKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  last30: "Last 30 days",
  thisMonth: "This month",
  lastMonth: "Last month",
  custom: "Custom range",
};

export interface Range {
  from: number;
  to: number;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function rangeForPreset(preset: PresetKey, custom?: Range): Range {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now).getTime(), to: endOfDay(now).getTime() };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y).getTime(), to: endOfDay(y).getTime() };
    }
    case "last30":
    case "last7": {
      const days = preset === "last7" ? 6 : 29;
      const from = new Date(now);
      from.setDate(from.getDate() - days);
      return { from: startOfDay(from).getTime(), to: endOfDay(now).getTime() };
    }
    case "thisMonth":
      return {
        from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)).getTime(),
        to: endOfDay(now).getTime(),
      };
    case "lastMonth":
      return {
        from: startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)).getTime(),
        to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)).getTime(),
      };
    case "custom":
      return custom ?? rangeForPreset("last7");
  }
}

/** Equal-length window immediately before the current one, for delta comparisons. */
export function previousRange(range: Range): Range {
  const span = range.to - range.from;
  return { from: range.from - span - 1, to: range.from - 1 };
}

interface FiltersValue {
  preset: PresetKey;
  range: Range;
  customRange?: Range | undefined;
  agentIds: string[];
  setPreset: (preset: PresetKey) => void;
  setCustomRange: (range: Range) => void;
  setAgentIds: (ids: string[]) => void;
}

// Keep one context instance across hot reloads so the provider and hooks never disagree.
const gFiltersContext = globalThis as unknown as { __FiltersContext?: React.Context<FiltersValue | null> };
const FiltersContext = (gFiltersContext.__FiltersContext ??= createContext<FiltersValue | null>(null));
const STORAGE_KEY = "vad.filters";

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState<PresetKey>("last7");
  const [customRange, setCustomRange] = useState<Range | undefined>(undefined);
  const [agentIds, setAgentIds] = useState<string[]>([]);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { preset: PresetKey; customRange?: Range; agentIds: string[] };
      setPreset(parsed.preset ?? "last7");
      setCustomRange(parsed.customRange);
      setAgentIds(parsed.agentIds ?? []);
    } catch {
      /* ignore malformed state */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset, customRange, agentIds }));
  }, [preset, customRange, agentIds]);

  const value = useMemo<FiltersValue>(
    () => ({
      preset,
      customRange,
      agentIds,
      range: rangeForPreset(preset, customRange),
      setPreset,
      setCustomRange: (range) => {
        setCustomRange(range);
        setPreset("custom");
      },
      setAgentIds,
    }),
    [preset, customRange, agentIds],
  );

  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used inside FiltersProvider");
  return ctx;
}
