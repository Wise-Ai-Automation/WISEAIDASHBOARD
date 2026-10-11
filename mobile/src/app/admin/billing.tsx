import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { Avatar, Card, ErrorBanner, Group, Overline, Screen, Skeleton, T } from "@/components/ui";
import * as api from "@/lib/api";
import { formatUsd } from "@/lib/analytics";
import { useTodaySpend } from "@/lib/hooks";
import { useTheme } from "@/lib/theme";

export default function BillingScreen() {
  const router = useRouter();
  const { c } = useTheme();
  const today = useTodaySpend();
  const billing = useQuery({ queryKey: ["billing"], queryFn: api.getBillingSettings });
  const subs = useQuery({ queryKey: ["subaccounts"], queryFn: api.listSubaccounts });
  const pct = today.limit ? Math.min(100, (today.spend / today.limit) * 100) : 0;

  return (
    <Screen title="Billing" subtitle="Rates and daily spend" back={() => router.back()} tabBar={false}>
      {billing.isError ? <ErrorBanner message="We couldn't load billing settings." onRetry={() => void billing.refetch()} /> : null}

      <Card style={{ gap: 14 }}>
        <Overline>Spend today</Overline>
        <T size={38} weight="800" color={today.over ? c.danger : c.text}>
          {formatUsd(today.spend)}
        </T>
        {today.limit != null ? (
          <View style={{ gap: 8 }}>
            <View style={{ height: 10, borderRadius: 5, backgroundColor: c.cardAlt, overflow: "hidden" }}>
              <View style={{ width: `${pct}%`, height: 10, borderRadius: 5, backgroundColor: today.over ? c.danger : c.primary }} />
            </View>
            <T size={12} muted>
              {pct.toFixed(0)}% of your {formatUsd(today.limit)} daily limit
            </T>
          </View>
        ) : (
          <T size={13} muted>
            No daily limit set.
          </T>
        )}
      </Card>

      <View style={{ gap: 10 }}>
        <Overline>Client rates · per minute</Overline>
        {billing.isLoading || subs.isLoading ? (
          <Skeleton height={120} style={{ borderRadius: 22 }} />
        ) : (
          <Group>
            {(subs.data ?? []).map((p) => {
              const rate = billing.data?.rates[p.id];
              return (
                <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}>
                  <Avatar name={p.full_name} />
                  <View style={{ flex: 1 }}>
                    <T size={15} weight="700" numberOfLines={1}>
                      {p.full_name}
                    </T>
                  </View>
                  <T size={15} weight="800" color={rate != null ? c.text : c.faint}>
                    {rate != null ? `$${rate.toFixed(2)}` : "Not set"}
                  </T>
                </View>
              );
            })}
          </Group>
        )}
        <T size={12} muted>
          Edit rates and limits from the web dashboard.
        </T>
      </View>
    </Screen>
  );
}
