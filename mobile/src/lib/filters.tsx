import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type PresetKey =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth";

export const PRESET_LABELS: Record<PresetKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  last30: "Last 30 days",
  thisMonth: "This month",
  lastMonth: "Last month",
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

export function rangeForPreset(preset: PresetKey): Range {
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
  agentIds: string[];
  setPreset: (preset: PresetKey) => void;
  setAgentIds: (ids: string[]) => void;
}

const FiltersContext = createContext<FiltersValue | null>(null);
const STORAGE_KEY = "wise.filters";

export const PRESET_ORDER: PresetKey[] = ["today", "yesterday", "last7", "last30", "thisMonth", "lastMonth"];

/** Date range + agent filter shared by every tab, persisted across launches. */
export function FiltersProvider({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState<PresetKey>("last7");
  const [agentIds, setAgentIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as { preset?: PresetKey; agentIds?: string[] };
        if (parsed.preset && parsed.preset in PRESET_LABELS) setPreset(parsed.preset);
        setAgentIds(parsed.agentIds ?? []);
      })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ preset, agentIds })).catch(() => {});
  }, [hydrated, preset, agentIds]);

  const value = useMemo<FiltersValue>(
    () => ({ preset, agentIds, range: rangeForPreset(preset), setPreset, setAgentIds }),
    [preset, agentIds],
  );
  return <FiltersContext.Provider value={value}>{children}</FiltersContext.Provider>;
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) throw new Error("useFilters must be used inside FiltersProvider");
  return ctx;
}
