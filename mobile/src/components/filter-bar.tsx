import { useState } from "react";
import { View } from "react-native";
import { PRESET_LABELS, PRESET_ORDER, useFilters } from "@/lib/filters";
import { useAgents } from "@/lib/hooks";
import type { Sentiment } from "@/lib/types";
import { useTheme } from "@/lib/theme";
import { Badge, Button, OptionRow, Pill, Sheet, Skeleton } from "./ui";

/** Date-range and agent pills; each opens a bottom sheet. Shared by every data tab. */
export function FilterBar() {
  const { preset, setPreset, agentIds, setAgentIds } = useFilters();
  const { data: agents = [], isLoading } = useAgents();
  const [sheet, setSheet] = useState<"date" | "agents" | null>(null);

  const agentLabel =
    agentIds.length === 0
      ? "All agents"
      : agentIds.length === 1
        ? (agents.find((a) => a.agent_id === agentIds[0])?.agent_name ?? "1 agent")
        : `${agentIds.length} agents`;

  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <Pill icon="calendar-outline" label={PRESET_LABELS[preset]} chevron onPress={() => setSheet("date")} />
      <Pill icon="people-outline" label={agentLabel} chevron active={agentIds.length > 0} onPress={() => setSheet("agents")} />

      <Sheet visible={sheet === "date"} onClose={() => setSheet(null)} title="Date range" subtitle="Applies to every tab.">
        {PRESET_ORDER.map((key) => (
          <OptionRow
            key={key}
            label={PRESET_LABELS[key]}
            selected={preset === key}
            onPress={() => {
              setPreset(key);
              setSheet(null);
            }}
          />
        ))}
      </Sheet>

      <Sheet visible={sheet === "agents"} onClose={() => setSheet(null)} title="Agents" subtitle="Leave empty to include every agent.">
        {isLoading ? (
          <Skeleton height={48} />
        ) : (
          agents.map((a) => {
            const on = agentIds.includes(a.agent_id);
            return (
              <OptionRow
                key={a.agent_id}
                multi
                label={a.agent_name}
                selected={on}
                onPress={() => setAgentIds(on ? agentIds.filter((x) => x !== a.agent_id) : [...agentIds, a.agent_id])}
              />
            );
          })
        )}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
          <Button label="Clear" variant="outline" style={{ flex: 1 }} onPress={() => setAgentIds([])} />
          <Button label="Done" style={{ flex: 1 }} onPress={() => setSheet(null)} />
        </View>
      </Sheet>
    </View>
  );
}

export function sentimentColor(s: Sentiment, c: ReturnType<typeof useTheme>["c"]) {
  return s === "Positive" ? c.success : s === "Negative" ? c.danger : c.muted;
}

export function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const { c } = useTheme();
  return <Badge dot label={sentiment} color={sentimentColor(sentiment, c)} />;
}

export function SuccessBadge({ successful }: { successful: boolean }) {
  const { c } = useTheme();
  return <Badge dot label={successful ? "Successful" : "Unsuccessful"} color={successful ? c.success : c.warning} />;
}
