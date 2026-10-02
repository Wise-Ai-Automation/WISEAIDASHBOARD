import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchAgentsRaw, fetchCallRaw, fetchCallsRaw } from "./retell.functions";
import type { AgentAssignment, Profile, RetellAgent, RetellCall } from "./types";

/*
 * Authenticated, role-aware endpoints. Every function here:
 *   - verifies the caller's JWT via requireSupabaseAuth,
 *   - looks the caller's role up in user_roles (RLS-protected),
 *   - and for subaccounts IGNORES agent ids sent by the browser, filtering
 *     strictly to rows in agent_assignments for that user.
 */

async function isAdminUser(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) return false;
  return (data ?? []).some((r) => r.role === "admin");
}

async function loadAssignments(supabase: SupabaseClient, userId: string): Promise<AgentAssignment[]> {
  const { data, error } = await supabase
    .from("agent_assignments")
    .select("retell_agent_id, agent_name")
    .eq("user_id", userId);
  if (error) return [];
  return (data ?? []).map((a) => ({ retell_agent_id: a.retell_agent_id, agent_name: a.agent_name }));
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Profile | null> => {
    const { data: p, error } = await context.supabase
      .from("profiles")
      .select("id, full_name, email, is_active, created_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error || !p) return null;
    const [roles, assignments] = await Promise.all([
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      loadAssignments(context.supabase, context.userId),
    ]);
    const role = (roles.data ?? []).some((r) => r.role === "admin") ? "admin" : "subaccount";
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      is_active: p.is_active,
      created_at: p.created_at,
      role,
      agents: assignments,
    };
  });

/** Agents the caller may query. Admins see all; subaccounts only their assignments. */
export const secureListAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RetellAgent[]> => {
    if (await isAdminUser(context.supabase, context.userId)) return fetchAgentsRaw();
    const assigned = await loadAssignments(context.supabase, context.userId);
    if (!assigned.length) return [];
    const all = await fetchAgentsRaw();
    return assigned.map((a) => {
      const live = all.find((x) => x.agent_id === a.retell_agent_id);
      return live ?? { agent_id: a.retell_agent_id, agent_name: a.agent_name || a.retell_agent_id };
    });
  });

export const secureListCalls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { agentIds: string[]; from: number; to: number }) => ({
    agentIds: Array.isArray(d.agentIds) ? d.agentIds.map(String).slice(0, 200) : [],
    from: Number(d.from),
    to: Number(d.to),
  }))
  .handler(async ({ context, data }): Promise<RetellCall[]> => {
    let agentIds = data.agentIds;
    if (!(await isAdminUser(context.supabase, context.userId))) {
      // Subaccount: the browser's agent list is never trusted.
      const allowed = (await loadAssignments(context.supabase, context.userId)).map((a) => a.retell_agent_id);
      agentIds = agentIds.length ? agentIds.filter((id) => allowed.includes(id)) : allowed;
      if (!agentIds.length) return [];
    }
    return fetchCallsRaw(agentIds, data.from, data.to);
  });

export const secureGetCall = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { callId: string }) => ({ callId: String(d.callId).replace(/[^\w-]/g, "") }))
  .handler(async ({ context, data }): Promise<RetellCall> => {
    const call = await fetchCallRaw(data.callId);
    if (!(await isAdminUser(context.supabase, context.userId))) {
      const allowed = (await loadAssignments(context.supabase, context.userId)).map((a) => a.retell_agent_id);
      if (!allowed.includes(call.agent_id)) throw new Error("You don't have access to this call.");
    }
    return call;
  });
