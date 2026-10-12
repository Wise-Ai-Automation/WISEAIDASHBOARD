import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Platform, Pressable, View } from "react-native";
import { AudioPlayer } from "@/components/audio-player";
import { SentimentBadge, SuccessBadge, sentimentColor } from "@/components/filter-bar";
import { Avatar, Badge, Button, Card, ErrorBanner, Group, Overline, Reveal, Screen, Skeleton, T, tap } from "@/components/ui";
import { formatUsd } from "@/lib/analytics";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
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
import { radius, space, useTheme } from "@/lib/theme";
import type { RetellCall } from "@/lib/types";

function keyName(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function show(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16, paddingVertical: 14, paddingHorizontal: 16 }}>
      <T size={14} muted>
        {label}
      </T>
      <View style={{ flex: 1, alignItems: "flex-end" }}>
        <T size={14} weight="600" numberOfLines={3} style={{ textAlign: "right" }}>
          {value}
        </T>
      </View>
    </View>
  );
}

export default function CallDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const { isAdmin } = useAuth();
  const [copied, setCopied] = useState(false);
  const qc = useQueryClient();
  const { data: call, isLoading, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: ["call", id],
    queryFn: () => api.getCall(String(id)),
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
    // The list payload is slim (no transcript/recording) but has everything above
    // the fold, so the screen paints instantly while the full call loads.
    placeholderData: () => {
      for (const [, list] of qc.getQueriesData<RetellCall[]>({ queryKey: ["calls"] })) {
        const hit = list?.find((x) => x.call_id === id);
        if (hit) return hit;
      }
      return undefined;
    },
  });

  if (isLoading || !call) {
    return (
      <Screen title="Call" back={() => router.back()} tabBar={false}>
        {isError ? (
          <ErrorBanner message="We couldn't load this call." onRetry={() => void refetch()} />
        ) : (
          <>
            <Skeleton height={90} style={{ borderRadius: 22 }} />
            <Skeleton height={160} style={{ borderRadius: 20 }} />
          </>
        )}
      </Screen>
    );
  }

  const name = callCustomerName(call);
  const phone = callPhoneNumber(call);
  const email = callEmail(call);
  const booked = callAppointmentBooked(call);
  const bookingId = callBookingId(call);
  const analysis = call.call_analysis ?? ({} as typeof call.call_analysis);
  const custom = Object.entries(analysis.custom_analysis_data ?? {});
  const collected = Object.entries(call.collected_dynamic_variables ?? {});
  const turns = call.transcript_object ?? [];
  const sentiment = analysis.user_sentiment ?? "Unknown";
  const tint = sentimentColor(sentiment, c);
  const detailRows: [string, string][] = [
    ["From", call.from_number || "—"],
    ["To", call.to_number || "—"],
    ["Ended", formatReason(call.disconnection_reason)],
    ...(email ? ([["Email", email]] as [string, string][]) : []),
    ...(bookingId ? ([["Booking ID", bookingId]] as [string, string][]) : []),
    ...(analysis.call_completion_rating ? ([["Completion", analysis.call_completion_rating]] as [string, string][]) : []),
    ...(isAdmin && call.call_cost ? ([["Cost", formatUsd(call.call_cost.combined_cost)]] as [string, string][]) : []),
  ];

  return (
    // On iOS this title drives the compact native header; on Android/web it stays
    // unset so no duplicate heading appears above the big avatar block below.
    <Screen title={Platform.OS === "ios" ? (name ?? phone ?? "Call") : undefined} back={() => router.back()} tabBar={false}>
      <Reveal index={0}>
        <View style={{ alignItems: "center", gap: 14 }}>
          <Avatar name={name ?? phone ?? "?"} size={76} color={tint} />
          <View style={{ alignItems: "center", gap: 4 }}>
            <T size={26} weight="800" style={{ textAlign: "center" }}>
              {name ?? (phone || "Call details")}
            </T>
            <T size={14} muted>
              {name && phone ? `${phone} · ` : ""}
              {formatDateTime(call.start_timestamp)}
            </T>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
            <SuccessBadge successful={Boolean(analysis.call_successful)} />
            <SentimentBadge sentiment={sentiment} />
            {booked === true ? <Badge icon="calendar" label="Appointment booked" color={c.primary} /> : null}
            {booked === false ? <Badge label="Not booked" color={c.warning} /> : null}
            {analysis.in_voicemail ? <Badge label="Voicemail" color={c.muted} /> : null}
          </View>
        </View>
      </Reveal>

      <Reveal index={1}>
        <Card padded={false} style={{ flexDirection: "row" }}>
          {[
            ["Duration", formatDuration(call.duration_ms)],
            ["Direction", call.direction === "inbound" ? "Inbound" : "Outbound"],
            ["Agent", call.agent_name],
          ].map(([label, value], i) => (
            <View key={label} style={{ flex: i === 0 ? 1 : i === 1 ? 1.15 : 1.35, padding: 16, gap: 4, borderLeftWidth: i ? 1 : 0, borderLeftColor: c.border }}>
              <T size={11} weight="700" muted tracking={0.6} upper>
                {label}
              </T>
              <T size={14} weight="700" numberOfLines={1}>
                {value}
              </T>
            </View>
          ))}
        </Card>
      </Reveal>

      {phone && phone !== "Web call" ? (
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Button label="Call back" icon="call" style={{ flex: 1 }} onPress={() => void Linking.openURL(`tel:${phone}`)} />
          {email ? <Button label="Email" icon="mail-outline" variant="soft" style={{ flex: 1 }} onPress={() => void Linking.openURL(`mailto:${email}`)} /> : null}
        </View>
      ) : null}

      {isPlaceholderData ? (
        <Skeleton height={110} style={{ borderRadius: 22 }} />
      ) : call.recording_url ? (
        <Card style={{ gap: 14 }}>
          <T size={16} weight="700">
            Recording
          </T>
          <AudioPlayer uri={call.recording_url} />
        </Card>
      ) : null}

      {analysis.call_summary ? (
        <Card style={{ gap: 10, backgroundColor: c.primarySoft, borderColor: "transparent" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="sparkles" size={16} color={c.primary} />
            <T size={12} weight="700" color={c.primary} tracking={0.8} upper>
              AI summary
            </T>
          </View>
          <T size={15} color={c.text} style={{ lineHeight: 23 }}>
            {analysis.call_summary}
          </T>
        </Card>
      ) : null}

      <View style={{ gap: 10 }}>
        <Overline>Details</Overline>
        <Group inset={16}>
          {detailRows.map(([l, v]) => (
            <Row key={l} label={l} value={v} />
          ))}
        </Group>
      </View>

      {custom.length || collected.length ? (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Overline>Post-call analysis</Overline>
            <Pressable
              hitSlop={10}
              onPress={async () => {
                tap();
                await Clipboard.setStringAsync(
                  JSON.stringify({ custom_analysis_data: Object.fromEntries(custom), collected_dynamic_variables: Object.fromEntries(collected) }, null, 2),
                );
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              <T size={12} weight="700" color={c.primary}>
                {copied ? "Copied" : "Copy JSON"}
              </T>
            </Pressable>
          </View>
          <Group inset={16}>
            {[...custom, ...collected].map(([k, v]) => (
              <Row key={k} label={keyName(k)} value={show(v)} />
            ))}
          </Group>
        </View>
      ) : null}

      <View style={{ gap: 12 }}>
        <Overline>Transcript</Overline>
        {isPlaceholderData ? (
          <Skeleton height={140} style={{ borderRadius: 22 }} />
        ) : turns.length ? (
          turns.map((turn, i) => {
            const agent = turn.role === "agent";
            return (
              <View key={i} style={{ alignItems: agent ? "flex-start" : "flex-end" }}>
                <View
                  style={{
                    maxWidth: "86%",
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 20,
                    borderBottomLeftRadius: agent ? 6 : 20,
                    borderBottomRightRadius: agent ? 20 : 6,
                    backgroundColor: agent ? c.card : c.primary,
                    borderWidth: agent ? 1 : 0,
                    borderColor: c.border,
                    gap: 4,
                  }}
                >
                  <T size={11} weight="700" color={agent ? c.primary : "rgba(255,255,255,0.78)"}>
                    {agent ? call.agent_name : "Caller"}
                    {typeof turn.start === "number" ? `  ·  ${formatClock(turn.start)}` : ""}
                  </T>
                  <T size={14} color={agent ? c.text : "#fff"} style={{ lineHeight: 21 }}>
                    {turn.content}
                  </T>
                </View>
              </View>
            );
          })
        ) : call.transcript ? (
          <Card>
            <T size={14} style={{ lineHeight: 22 }}>
              {call.transcript}
            </T>
          </Card>
        ) : (
          <T size={13} muted>
            No transcript available.
          </T>
        )}
      </View>
    </Screen>
  );
}
