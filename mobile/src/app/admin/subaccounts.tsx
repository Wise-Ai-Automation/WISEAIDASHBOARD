import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Switch, View } from "react-native";
import { Avatar, Badge, Button, Card, EmptyState, ErrorBanner, Reveal, Screen, Skeleton, T } from "@/components/ui";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export default function SubaccountsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const { c } = useTheme();
  const { setViewingAs } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({ queryKey: ["subaccounts"], queryFn: api.listSubaccounts });

  const toggle = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => api.setSubaccountActive(v.id, v.active),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["subaccounts"] }),
  });

  return (
    <Screen title="Subaccounts" subtitle="Client access and status" back={() => router.back()} tabBar={false} refreshing={isRefetching} onRefresh={() => void refetch()}>
      {toggle.isError ? <ErrorBanner message={toggle.error instanceof Error ? toggle.error.message : "Couldn't update."} /> : null}
      {isError ? (
        <ErrorBanner message="We couldn't load subaccounts." onRetry={() => void refetch()} />
      ) : isLoading ? (
        <Skeleton height={170} style={{ borderRadius: 22 }} />
      ) : !data?.length ? (
        <EmptyState icon="people" title="No subaccounts" body="Create client accounts from the web dashboard." />
      ) : (
        data.map((p, i) => (
          <Reveal key={p.id} index={i}>
            <Card style={{ gap: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <Avatar name={p.full_name} color={p.is_active ? c.primary : c.faint} size={48} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T size={16} weight="700" numberOfLines={1}>
                    {p.full_name}
                  </T>
                  <T size={13} muted numberOfLines={1}>
                    {p.email}
                  </T>
                </View>
                <Switch value={p.is_active} onValueChange={(active) => toggle.mutate({ id: p.id, active })} trackColor={{ true: c.primary, false: c.cardAlt }} />
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {p.agents.map((a) => (
                  <Badge key={a.retell_agent_id} label={a.agent_name} color={c.primary} />
                ))}
              </View>
              <Button
                small
                label="View as this client"
                icon="eye-outline"
                variant="soft"
                onPress={() => {
                  setViewingAs(p);
                  router.replace("/");
                }}
              />
            </Card>
          </Reveal>
        ))
      )}
    </Screen>
  );
}
