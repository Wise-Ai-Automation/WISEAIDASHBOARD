import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useFilters, previousRange } from "@/lib/filters-context";

const STALE = 2 * 60 * 1000; // 2 minutes

export function useAgents() {
  const { isAdmin, viewingAs, user } = useAuth();
  return useQuery({
    queryKey: ["agents", isAdmin, viewingAs?.id ?? user?.id],
    staleTime: STALE,
    queryFn: async () => {
      if (isAdmin) return api.listAgents();
      const effective = viewingAs ?? user;
      return (effective?.agents ?? []).map((a) => ({ agent_id: a.retell_agent_id, agent_name: a.agent_name }));
    },
  });
}

export function useCalls() {
  const { allowedAgentIds, viewingAs, user } = useAuth();
  const { range, agentIds } = useFilters();
  return useQuery({
    queryKey: ["calls", viewingAs?.id ?? user?.id, allowedAgentIds, agentIds, range.from, range.to],
    staleTime: STALE,
    retry: 2,
    queryFn: () => api.listCalls({ agentIds, from: range.from, to: range.to }, allowedAgentIds),
  });
}

/** Same query over the immediately preceding window, used for KPI deltas. */
export function usePreviousCalls() {
  const { allowedAgentIds, viewingAs, user } = useAuth();
  const { range, agentIds } = useFilters();
  const prev = previousRange(range);
  return useQuery({
    queryKey: ["calls-prev", viewingAs?.id ?? user?.id, allowedAgentIds, agentIds, prev.from, prev.to],
    staleTime: STALE,
    queryFn: () => api.listCalls({ agentIds, from: prev.from, to: prev.to }, allowedAgentIds),
  });
}

/** Admin-only: today's calls and billing settings, for spend alerts. */
export function useTodaySpend() {
  const { isAdmin } = useAuth();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const from = start.getTime();
  const calls = useQuery({
    queryKey: ["calls-today", from],
    enabled: isAdmin,
    staleTime: STALE,
    queryFn: () => api.listCalls({ agentIds: [], from, to: Date.now() }, null),
  });
  const billing = useQuery({ queryKey: ["billing"], enabled: isAdmin, queryFn: () => api.getBillingSettings() });
  const spend = (calls.data ?? []).reduce((s, c) => s + (c.call_cost?.combined_cost ?? 0), 0);
  const limit = billing.data?.dailySpendLimit ?? null;
  return { spend, limit, over: isAdmin && limit != null && spend > limit };
}
