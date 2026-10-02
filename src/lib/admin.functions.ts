import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AgentAssignment, Profile } from "./types";

/*
 * Admin-only subaccount management. Every function verifies the caller is an
 * admin (via the RLS-protected user_roles table), then performs privileged
 * work through the server-side admin client, which is loaded inside the
 * handler and never reaches the browser.
 */

async function requireAdmin(supabase: import("@supabase/supabase-js").SupabaseClient, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error || !(data ?? []).some((r) => r.role === "admin")) {
    throw new Error("Only administrators can manage subaccounts.");
  }
}

function friendlyAuthError(message: string): Error {
  if (/already registered|duplicate/i.test(message)) return new Error("A user with that email already exists.");
  if (/password/i.test(message) && /least|short|weak/i.test(message))
    return new Error("That password is too weak. Use at least 8 characters.");
  return new Error(message);
}

async function loadSubaccountProfiles(
  supabase: import("@supabase/supabase-js").SupabaseClient,
): Promise<Profile[]> {
  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "subaccount");
  if (rolesError) throw new Error("Couldn't load subaccounts. Please try again.");
  const ids = (roles ?? []).map((r) => r.user_id);
  if (!ids.length) return [];

  const [profilesRes, assignmentsRes, numbersRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, is_active, created_at").in("id", ids),
    supabase.from("agent_assignments").select("user_id, retell_agent_id, agent_name").in("user_id", ids),
    supabase.from("phone_number_assignments").select("user_id, phone_number").in("user_id", ids),
  ]);
  if (profilesRes.error) throw new Error("Couldn't load subaccounts. Please try again.");

  const byUser = new Map<string, AgentAssignment[]>();
  for (const a of assignmentsRes.data ?? []) {
    const list = byUser.get(a.user_id) ?? [];
    list.push({ retell_agent_id: a.retell_agent_id, agent_name: a.agent_name });
    byUser.set(a.user_id, list);
  }

  return (profilesRes.data ?? [])
    .map((p) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      is_active: p.is_active,
      created_at: p.created_at,
      role: "subaccount" as const,
      agents: byUser.get(p.id) ?? [],
      phone_numbers: (numbersRes.data ?? []).filter((n) => n.user_id === p.id).map((n) => n.phone_number),
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export const adminListSubaccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Profile[]> => {
    await requireAdmin(context.supabase, context.userId);
    return loadSubaccountProfiles(context.supabase);
  });

const assignmentsSchema = z
  .array(
    z.object({
      retell_agent_id: z.string().min(1),
      agent_name: z.string().min(1),
    }),
  )
  .min(1, "Assign at least one agent.");

export const adminCreateSubaccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      full_name: z.string().min(1, "Full name is required."),
      email: z.string().email("Enter a valid email address."),
      password: z.string().min(8, "Password must be at least 8 characters."),
      agents: assignmentsSchema,
    }).parse,
  )
  .handler(async ({ context, data }): Promise<Profile> => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (createError) throw friendlyAuthError(createError.message);
    const userId = created.user.id;

    const [profileRes, roleRes, assignmentsRes] = await Promise.all([
      supabaseAdmin.from("profiles").insert({
        id: userId,
        full_name: data.full_name,
        email: data.email.trim().toLowerCase(),
      }),
      supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "subaccount" }),
      supabaseAdmin
        .from("agent_assignments")
        .insert(data.agents.map((a) => ({ user_id: userId, retell_agent_id: a.retell_agent_id, agent_name: a.agent_name }))),
    ]);

    if (profileRes.error || roleRes.error || assignmentsRes.error) {
      // Roll back the half-created login so no orphan account remains.
      await supabaseAdmin.auth.admin.deleteUser(userId);
      const message = profileRes.error?.message ?? roleRes.error?.message ?? assignmentsRes.error?.message ?? "";
      if (/duplicate/i.test(message)) throw new Error("A user with that email already exists.");
      throw new Error("Couldn't create the subaccount. Please try again.");
    }

    return {
      id: userId,
      full_name: data.full_name,
      email: data.email.trim().toLowerCase(),
      is_active: true,
      created_at: new Date().toISOString(),
      role: "subaccount",
      agents: data.agents,
    };
  });

export const adminUpdateSubaccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      full_name: z.string().min(1).optional(),
      is_active: z.boolean().optional(),
      agents: assignmentsSchema.optional(),
    }).parse,
  )
  .handler(async ({ context, data }): Promise<Profile> => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const updates: { full_name?: string; is_active?: boolean } = {};
    if (data.full_name !== undefined) updates.full_name = data.full_name;
    if (data.is_active !== undefined) updates.is_active = data.is_active;
    if (Object.keys(updates).length) {
      const { error } = await supabaseAdmin.from("profiles").update(updates).eq("id", data.id);
      if (error) throw new Error("Couldn't update the subaccount. Please try again.");
    }

    if (data.agents) {
      const [del, ins] = await Promise.all([
        supabaseAdmin.from("agent_assignments").delete().eq("user_id", data.id),
        supabaseAdmin
          .from("agent_assignments")
          .insert(data.agents.map((a) => ({ user_id: data.id, retell_agent_id: a.retell_agent_id, agent_name: a.agent_name }))),
      ]);
      if (ins.error) {
        // Best effort: restore the previous set so the user keeps their access.
        if (!del.error && data.agents.length) {
          await supabaseAdmin.from("agent_assignments").delete().eq("user_id", data.id);
        }
        throw new Error("Couldn't update the assigned agents. Please try again.");
      }
    }

    const { data: p, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, is_active, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !p) throw new Error("Subaccount not found.");
    const { data: assignments } = await supabaseAdmin
      .from("agent_assignments")
      .select("retell_agent_id, agent_name")
      .eq("user_id", data.id);
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      is_active: p.is_active,
      created_at: p.created_at,
      role: "subaccount",
      agents: (assignments ?? []).map((a) => ({ retell_agent_id: a.retell_agent_id, agent_name: a.agent_name })),
    };
  });

export const adminDeleteSubaccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Deleting the login cascades to the profile, role and agent assignments.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error("Couldn't delete the subaccount. Please try again.");
    return { ok: true };
  });

export const adminResetSubaccountPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), password: z.string().min(8, "Password must be at least 8 characters.") }).parse)
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { password: data.password });
    if (error) throw new Error("Couldn't reset the password. Please try again.");
    return { ok: true };
  });
