import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/*
 * Admin-only billing settings: per-client price per minute and the workspace
 * daily spend limit. RLS restricts both tables to admins; we also check the
 * role here so non-admins get a clear error.
 */

async function requireAdmin(supabase: import("@supabase/supabase-js").SupabaseClient, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (!(data ?? []).some((r) => r.role === "admin")) throw new Error("Only administrators can manage billing.");
}

export interface BillingSettings {
  dailySpendLimit: number | null;
  rates: Record<string, number | null>;
}

export const getBillingSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BillingSettings> => {
    await requireAdmin(context.supabase, context.userId);
    const [s, b] = await Promise.all([
      context.supabase.from("workspace_settings").select("daily_spend_limit").eq("id", 1).maybeSingle(),
      context.supabase.from("client_billing").select("user_id, rate_per_minute"),
    ]);
    const rates: Record<string, number | null> = {};
    for (const r of b.data ?? []) rates[r.user_id] = r.rate_per_minute == null ? null : Number(r.rate_per_minute);
    const lim = s.data?.daily_spend_limit;
    return { dailySpendLimit: lim == null ? null : Number(lim), rates };
  });

export const setClientRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ user_id: z.string().uuid(), rate: z.number().min(0).max(100).nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("client_billing")
      .upsert({ user_id: data.user_id, rate_per_minute: data.rate, updated_at: new Date().toISOString() });
    if (error) throw new Error("Couldn't save the price. Please try again.");
    return { ok: true };
  });

export const setDailySpendLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ limit: z.number().min(0).max(1_000_000).nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("workspace_settings")
      .update({ daily_spend_limit: data.limit, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error("Couldn't save the limit. Please try again.");
    return { ok: true };
  });
