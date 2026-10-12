import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, View } from "react-native";
import { Button, Card, ErrorBanner, Field, Pill, Screen, Skeleton, T, bodyFont } from "@/components/ui";
import * as api from "@/lib/api";
import { normalizePhone } from "@/lib/phone";
import { radius, useTheme } from "@/lib/theme";
import { TextInput } from "react-native";

/** One contact per line: `+15551234567` or `Name, +15551234567, email@x.com`. */
function parseContacts(text: string) {
  const out: { phone: string; name?: string; email?: string }[] = [];
  const seen = new Set<string>();
  let invalid = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split(/[,;\t]/).map((p) => p.trim());
    const phonePart = parts.find((p) => /\d{7,}/.test(p.replace(/\D/g, "")) && !p.includes("@"));
    const phone = phonePart ? normalizePhone(phonePart) : null;
    if (!phone) {
      invalid += 1;
      continue;
    }
    if (seen.has(phone)) continue;
    seen.add(phone);
    const email = parts.find((p) => p.includes("@"));
    const name = parts.find((p) => p && p !== phonePart && p !== email);
    out.push({ phone, ...(name ? { name } : {}), ...(email ? { email } : {}) });
  }
  return { contacts: out, invalid };
}

export default function NewCampaignScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { c } = useTheme();
  const options = useQuery({ queryKey: ["campaign-options"], queryFn: api.getCampaignOptions });
  const [name, setName] = useState("");
  const [agentId, setAgentId] = useState<string | null>(null);
  const [fromNumber, setFromNumber] = useState<string | null>(null);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseContacts(raw), [raw]);
  const agent = agentId ?? options.data?.agents[0]?.retell_agent_id ?? null;
  const number = fromNumber ?? options.data?.numbers[0] ?? null;

  const launch = useMutation({
    mutationFn: () =>
      api.createCampaign({ name: name.trim(), agent_id: agent!, from_number: number!, contacts: parsed.contacts }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
      router.back();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Couldn't start the campaign."),
  });

  function confirm() {
    setError(null);
    if (!name.trim()) return setError("Give the campaign a name.");
    if (!agent) return setError("Pick an agent.");
    if (!number) return setError("Pick a caller number.");
    if (!parsed.contacts.length) return setError("Add at least one valid phone number.");
    Alert.alert("Start campaign?", `${parsed.contacts.length} contact${parsed.contacts.length > 1 ? "s" : ""} will be called right away.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Start calling", onPress: () => launch.mutate() },
    ]);
  }

  return (
    <Screen title="New campaign" back={() => router.back()} tabBar={false}>
      {error ? <ErrorBanner message={error} /> : null}
      <Field label="Campaign name" value={name} onChangeText={setName} placeholder="e.g. October follow-ups" icon="megaphone-outline" />

      <Card style={{ gap: 12 }}>
        <T size={15} weight="700">Agent</T>
        {options.isLoading ? <Skeleton height={36} /> : options.data?.agents.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {options.data.agents.map((a) => (
              <Pill key={a.retell_agent_id} label={a.agent_name} active={agent === a.retell_agent_id} onPress={() => setAgentId(a.retell_agent_id)} />
            ))}
          </View>
        ) : <T size={13} muted>No agents assigned to you.</T>}
      </Card>

      <Card style={{ gap: 12 }}>
        <T size={15} weight="700">Caller number</T>
        {options.isLoading ? <Skeleton height={36} /> : options.data?.numbers.length ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {options.data.numbers.map((n) => (
              <Pill key={n} label={n} active={number === n} onPress={() => setFromNumber(n)} />
            ))}
          </View>
        ) : <T size={13} muted>No caller numbers assigned. Ask your administrator.</T>}
      </Card>

      <View style={{ gap: 6 }}>
        <T size={13} weight="600" color={c.text2}>Contacts</T>
        <TextInput
          value={raw}
          onChangeText={setRaw}
          multiline
          placeholder={"One per line:\n+15551234567\nJane Doe, +15559876543, jane@mail.com"}
          placeholderTextColor={c.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            minHeight: 160,
            textAlignVertical: "top",
            padding: 14,
            borderRadius: radius.md + 2,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.card,
            color: c.text,
            fontSize: 15,
            ...bodyFont(),
          }}
        />
        <T size={12} muted>
          {parsed.contacts.length} valid{parsed.invalid ? ` · ${parsed.invalid} skipped (invalid number)` : ""}
        </T>
      </View>

      <Button label="Start campaign" icon="rocket" onPress={confirm} loading={launch.isPending} disabled={!options.data?.numbers.length} />
    </Screen>
  );
}
