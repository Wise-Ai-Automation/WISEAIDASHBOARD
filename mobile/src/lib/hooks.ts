import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as api from "./api";
import { useAuth } from "./auth";
import { previousRange, useFilters } from "./filters";
import type { LeadStage } from "./format";

const STALE = 2 * 60 * 1000;

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
    retry: 1,
    queryFn: () => api.listCalls({ agentIds, from: range.from, to: range.to }, allowedAgentIds),
  });
}

/** Same query over the preceding window, for KPI deltas. */
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

/** Admin-only: today's spend vs the workspace daily limit. */
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
  const billing = useQuery({ queryKey: ["billing"], enabled: isAdmin, queryFn: api.getBillingSettings });
  const spend = (calls.data ?? []).reduce((s, c) => s + (c.call_cost?.combined_cost ?? 0), 0);
  const limit = billing.data?.dailySpendLimit ?? null;
  return { spend, limit, over: isAdmin && limit != null && spend > limit };
}

const STAGE_KEY = "wise.leadStageOverrides";

/** Manual pipeline stage moves, kept on this device (same as the web app's localStorage). */
export function useStageOverrides() {
  const [overrides, setOverrides] = useState<Record<string, LeadStage>>({});

  useEffect(() => {
    AsyncStorage.getItem(STAGE_KEY)
      .then((raw) => raw && setOverrides(JSON.parse(raw)))
      .catch(() => {});
  }, []);

  const setStage = useCallback((callId: string, stage: LeadStage) => {
    setOverrides((prev) => {
      const next = { ...prev, [callId]: stage };
      void AsyncStorage.setItem(STAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return { overrides, setStage };
}
