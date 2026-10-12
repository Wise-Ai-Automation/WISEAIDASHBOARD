import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { StackedBar } from "@/components/charts";
import { FilterBar } from "@/components/filter-bar";
import { Avatar, Badge, Card, EmptyState, ErrorBanner, Group, OptionRow, Pill, Reveal, Screen, Sheet, Skeleton, T, bodyFont, tap } from "@/components/ui";
import {
  callAppointmentTiming,
  callCustomerName,
  callEmail,
  callLeadStage,
  callPhoneNumber,
  formatDateTime,
  formatTiming,
  STAGE_CONFIG,
  type LeadStage,
} from "@/lib/format";
import { useCalls, useStageOverrides } from "@/lib/hooks";
import { radius, space, useTheme } from "@/lib/theme";
import type { RetellCall } from "@/lib/types";

const STAGES = Object.keys(STAGE_CONFIG) as LeadStage[];

export default function PipelineScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useCalls();
  const { overrides, setStage } = useStageOverrides();
  const [stage, setSelected] = useState<LeadStage | "all">("all");
  const [query, setQuery] = useState("");
  const [moving, setMoving] = useState<RetellCall | null>(null);

  const leads = useMemo(
    () =>
      [...(data ?? [])]
        .sort((a, b) => b.start_timestamp - a.start_timestamp)
        .map((call) => ({
          call,
          stage: callLeadStage(call, overrides),
          name: callCustomerName(call) ?? `Caller ${callPhoneNumber(call).slice(-4)}`,
          phone: callPhoneNumber(call),
          email: callEmail(call),
          timing: callAppointmentTiming(call),
        })),
    [data, overrides],
  );

  const counts = useMemo(() => {
    const out = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<LeadStage, number>;
    leads.forEach((l) => (out[l.stage] += 1));
    return out;
  }, [leads]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (stage !== "all" && l.stage !== stage) return false;
      if (!q) return true;
      return [l.name, l.phone, l.email, l.call.agent_name, l.timing].some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [leads, stage, query]);

  const won = counts.appointment_booked + counts.appointment_done + counts.closed;
  const rate = leads.length ? (won / leads.length) * 100 : 0;

  return (
    <Screen
      title="Pipeline"
      subtitle={isLoading ? "Loading…" : `${leads.length} leads · ${rate.toFixed(0)}% converted`}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
    >
      <FilterBar />

      {leads.length ? (
        <Reveal>
          <Card style={{ gap: 18 }}>
            <T size={16} weight="700">
              Funnel
            </T>
            <StackedBar
              segments={STAGES.filter((s) => counts[s] > 0).map((s) => ({ label: STAGE_CONFIG[s].label, value: counts[s], color: STAGE_CONFIG[s].color }))}
            />
          </Card>
        </Reveal>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: 8 }}>
        <Pill label={`All ${leads.length}`} active={stage === "all"} onPress={() => setSelected("all")} />
        {STAGES.map((s) => (
          <Pill
            key={s}
            dot={STAGE_CONFIG[s].color}
            label={`${STAGE_CONFIG[s].label} ${counts[s]}`}
            active={stage === s}
            onPress={() => setSelected(stage === s ? "all" : s)}
          />
        ))}
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 16,
          height: 52,
          borderRadius: radius.md + 2,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.border,
        }}
      >
        <Ionicons name="search" size={18} color={c.faint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search leads"
          placeholderTextColor={c.faint}
          style={[{ flex: 1, color: c.text, fontSize: 15, ...bodyFont() }, { outlineStyle: "none" } as object]}
          autoCorrect={false}
        />
      </View>

      {isError ? (
        <ErrorBanner message="We couldn't load your leads." onRetry={() => void refetch()} />
      ) : isLoading ? (
        <Skeleton height={300} style={{ borderRadius: 22 }} />
      ) : visible.length === 0 ? (
        <EmptyState icon="funnel" title="No leads here" body="Leads appear automatically from your call conversations." />
      ) : (
        <Group>
          {visible.slice(0, 60).map((l) => {
            const cfg = STAGE_CONFIG[l.stage];
            return (
              <Pressable
                key={l.call.call_id}
                onPress={() => {
                  tap();
                  router.push({ pathname: "/call/[id]", params: { id: l.call.call_id } });
                }}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, backgroundColor: pressed ? c.cardAlt : "transparent" })}
              >
                <Avatar name={l.name} color={cfg.color} />
                <View style={{ flex: 1, gap: 5 }}>
                  <T size={15} weight="700" numberOfLines={1}>
                    {l.name}
                  </T>
                  <T size={12} muted numberOfLines={1}>
                    {l.timing ? formatTiming(l.timing) : formatDateTime(l.call.start_timestamp)}
                  </T>
                  <Badge dot label={cfg.label} color={cfg.color} />
                </View>
                <Pressable
                  hitSlop={14}
                  onPress={() => {
                    tap();
                    setMoving(l.call);
                  }}
                  style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.cardAlt, alignItems: "center", justifyContent: "center" }}
                >
                  <Ionicons name="swap-horizontal" size={18} color={c.muted} />
                </Pressable>
              </Pressable>
            );
          })}
        </Group>
      )}

      <Sheet visible={!!moving} onClose={() => setMoving(null)} title="Move lead to" subtitle="Saved on this device.">
        {STAGES.map((s) => (
          <OptionRow
            key={s}
            dot={STAGE_CONFIG[s].color}
            label={STAGE_CONFIG[s].label}
            hint={STAGE_CONFIG[s].description}
            selected={moving ? callLeadStage(moving, overrides) === s : false}
            onPress={() => {
              if (moving) setStage(moving.call_id, s);
              setMoving(null);
            }}
          />
        ))}
      </Sheet>
    </Screen>
  );
}
