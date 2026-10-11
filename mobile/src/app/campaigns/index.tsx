import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { Avatar, Badge, Button, EmptyState, ErrorBanner, Group, Screen, Skeleton, T } from "@/components/ui";
import * as api from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useTheme } from "@/lib/theme";

export default function CampaignsScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({ queryKey: ["campaigns"], queryFn: api.listCampaigns });

  return (
    <Screen title="Campaigns" subtitle="Bulk outbound calls" back={() => router.back()} tabBar={false} refreshing={isRefetching} onRefresh={() => void refetch()}>
      <Button label="New campaign" icon="add" onPress={() => router.push("/campaigns/new")} />
      {isError ? (
        <ErrorBanner message="We couldn't load campaigns." onRetry={() => void refetch()} />
      ) : isLoading ? (
        <Skeleton height={180} style={{ borderRadius: 22 }} />
      ) : !data?.length ? (
        <EmptyState icon="megaphone" title="No campaigns yet" body="Launch your first campaign to start calling a list of contacts." />
      ) : (
        <Group>
          {data.map((cp) => (
            <View key={cp.id} style={{ flexDirection: "row", gap: 14, padding: 16 }}>
              <Avatar name={cp.name} color={c.primary} />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <T size={15} weight="700" numberOfLines={1}>
                      {cp.name}
                    </T>
                  </View>
                  <Badge dot label={cp.status} color={c.success} />
                </View>
                <T size={12} muted numberOfLines={1}>
                  {cp.agent_name} · {cp.from_number}
                </T>
                <T size={12} muted>
                  {cp.total_contacts.toLocaleString()} contacts · {formatDateTime(new Date(cp.created_at).getTime())}
                </T>
              </View>
            </View>
          ))}
        </Group>
      )}
    </Screen>
  );
}
