import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createBatchCallRaw, fetchAgentsRaw, fetchPhoneNumbersRaw } from "./retell.functions";
import type { Campaign, CampaignOptions } from "./types";
import { normalizePhone } from "./csv";

/*
 * Bulk-call campaigns. The server re-checks everything the browser sends:
 * subaccounts may only use their assigned agents and assigned caller numbers.
 */

async function isAdmin(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).some((r) => r.role === "admin");
}

async function optionsFor(supabase: SupabaseClient, userId: string): Promise<CampaignOptions> {
  if (await isAdmin(supabase, userId)) {
    const [agents, numbers] = await Promise.all([fetchAgentsRaw(), fetchPhoneNumbersRaw()]);
    return {
      agents: agents.map((a) => ({ retell_agent_id: a.agent_id, agent_name: a.agent_name })),
      numbers: numbers.map((n) => n.phone_number),
    };
  }
  const [agents, numbers] = await Promise.all([
    supabase.from("agent_assignments").select("retell_agent_id, agent_name").eq("user_id", userId),
    supabase.from("phone_number_assignments").select("phone_number").eq("user_id", userId),
  ]);
  return {
    agents: (agents.data ?? []).map((a) => ({ retell_agent_id: a.retell_agent_id, agent_name: a.agent_name })),
    numbers: (numbers.data ?? []).map((n) => n.phone_number),
  };
}

export const getCampaignOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => optionsFor(context.supabase, context.userId));

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Campaign[]> => {
    const { data, error } = await context.supabase
      .from("campaigns")
      .select("id, user_id, name, retell_agent_id, agent_name, from_number, retell_batch_call_id, total_contacts, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error("Couldn't load campaigns. Please try again.");
    return data ?? [];
  });

const contactSchema = z.object({
  phone: z.string().min(1).max(40),
  name: z.string().max(200).optional(),
  email: z.string().max(200).optional(),
  vars: z.record(z.string(), z.string().max(1000)).optional(),
});

export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      name: z.string().trim().min(1, "Give the campaign a name.").max(120),
      agent_id: z.string().min(1, "Pick an agent."),
      from_number: z.string().min(1, "Pick a caller number."),
      contacts: z.array(contactSchema).min(1, "Upload at least one contact.").max(5000, "Up to 5,000 contacts per campaign."),
    }).parse,
  )
  .handler(async ({ context, data }): Promise<Campaign> => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("is_active")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.is_active) throw new Error("Your account is deactivated.");

    const opts = await optionsFor(context.supabase, context.userId);
    const agent = opts.agents.find((a) => a.retell_agent_id === data.agent_id);
    if (!agent) throw new Error("You don't have access to that agent.");
    if (!opts.numbers.includes(data.from_number)) throw new Error("You don't have access to that caller number.");

    const seen = new Set<string>();
    const contacts: { phone: string; name: string; email: string; vars: Record<string, string> }[] = [];
    for (const c of data.contacts) {
      const phone = normalizePhone(c.phone);
      if (!phone || seen.has(phone)) continue;
      seen.add(phone);
      contacts.push({ phone, name: c.name ?? "", email: c.email ?? "", vars: c.vars ?? {} });
    }
    if (!contacts.length) throw new Error("No valid phone numbers found in the file.");

    const batchId = await createBatchCallRaw({
      name: data.name,
      from_number: data.from_number,
      tasks: contacts.map((c) => ({
        to_number: c.phone,
        override_agent_id: agent.retell_agent_id,
        retell_llm_dynamic_variables: { ...c.vars, name: c.name, email: c.email, phone: c.phone },
      })),
    });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("campaigns")
      .insert({
        user_id: context.userId,
        name: data.name,
        retell_agent_id: agent.retell_agent_id,
        agent_name: agent.agent_name,
        from_number: data.from_number,
        retell_batch_call_id: batchId,
        total_contacts: contacts.length,
        status: "launched",
        contacts,
      })
      .select("id, user_id, name, retell_agent_id, agent_name, from_number, retell_batch_call_id, total_contacts, status, created_at")
      .single();
    if (error || !row) {
      console.error("campaign insert failed", error);
      throw new Error("The calls started, but the campaign couldn't be saved to your list.");
    }
    return row;
  });

/* ---------------------- admin: caller numbers ---------------------- */

export const adminListRetellNumbers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context.supabase, context.userId))) throw new Error("Admins only.");
    return fetchPhoneNumbersRaw();
  });

export const adminSetPhoneNumbers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ user_id: z.string().uuid(), numbers: z.array(z.string().min(1)).max(50) }).parse)
  .handler(async ({ context, data }) => {
    if (!(await isAdmin(context.supabase, context.userId))) throw new Error("Admins only.");
    const available = new Set((await fetchPhoneNumbersRaw()).map((n) => n.phone_number));
    const numbers = [...new Set(data.numbers)].filter((n) => available.has(n));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const del = await supabaseAdmin.from("phone_number_assignments").delete().eq("user_id", data.user_id);
    if (del.error) throw new Error("Couldn't update caller numbers.");
    if (numbers.length) {
      const ins = await supabaseAdmin
        .from("phone_number_assignments")
        .insert(numbers.map((phone_number) => ({ user_id: data.user_id, phone_number })));
      if (ins.error) throw new Error("Couldn't update caller numbers.");
    }
    return { ok: true as const };
  });
