import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { loadSubaccountProfiles } from "./admin.functions";
import { createCampaignForUser, optionsFor } from "./campaigns.functions";
import { fetchAgentsRaw, fetchCallRaw, fetchCallsRaw } from "./retell.functions";
import { isAdminUser, loadAssignments } from "./secure.functions";
import type { Campaign, Profile, RetellAgent, RetellCall } from "./types";

/*
 * Plain JSON/REST surface for the React Native app. Same rules as the web
 * server functions: every request carries the Supabase access token, the role
 * is read from user_roles, and subaccount agent access is re-derived from
 * agent_assignments — nothing the device sends is trusted. Pricing is stripped
 * from every subaccount response.
 */

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

// Short-lived per-instance cache of Retell call pages. Keyed by the *already
// authorised* agent list + window, so one user's access never leaks to another;
// cost stripping happens after the cache read.
const CALLS_TTL_MS = 45_000;
const callsCache = new Map<string, { at: number; calls: Promise<RetellCall[]> }>();

function cachedCalls(agentIds: string[], from: number, to: number): Promise<RetellCall[]> {
  const key = `${[...agentIds].sort().join(",")}|${from}|${to}`;
  const hit = callsCache.get(key);
  if (hit && Date.now() - hit.at < CALLS_TTL_MS) return hit.calls;
  const calls = fetchCallsRaw(agentIds, from, to);
  callsCache.set(key, { at: Date.now(), calls });
  calls.catch(() => callsCache.delete(key));
  if (callsCache.size > 50) {
    const oldest = [...callsCache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) callsCache.delete(oldest[0]);
  }
  return calls;
}

async function authenticate(
  request: Request,
): Promise<{ supabase: SupabaseClient; userId: string }> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new HttpError(500, "Server is not configured.");

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token.split(".").length !== 3) throw new HttpError(401, "Please sign in again.");

  const supabase = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new HttpError(401, "Please sign in again.");
  return { supabase: supabase as unknown as SupabaseClient, userId: data.claims.sub };
}

async function requireAdmin(supabase: SupabaseClient, userId: string) {
  if (!(await isAdminUser(supabase, userId)))
    throw new HttpError(403, "Only administrators can do that.");
}

async function loadProfile(supabase: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data: p } = await supabase
    .from("profiles")
    .select("id, full_name, email, is_active, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (!p) return null;
  const [admin, agents] = await Promise.all([
    isAdminUser(supabase, userId),
    loadAssignments(supabase, userId),
  ]);
  return {
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    is_active: p.is_active,
    created_at: p.created_at,
    role: admin ? "admin" : "subaccount",
    agents,
  };
}

const callsBody = z.object({
  agentIds: z.array(z.string()).max(200).default([]),
  from: z.number(),
  to: z.number(),
  /** List screens never show transcripts or recordings; omit them to keep payloads small. */
  slim: z.boolean().default(false),
});

const campaignBody = z.object({
  name: z.string().trim().min(1, "Give the campaign a name.").max(120),
  agent_id: z.string().min(1, "Pick an agent."),
  from_number: z.string().min(1, "Pick a caller number."),
  contacts: z
    .array(
      z.object({
        phone: z.string().min(1).max(40),
        name: z.string().max(200).optional(),
        email: z.string().max(200).optional(),
        vars: z.record(z.string(), z.string().max(1000)).optional(),
      }),
    )
    .min(1, "Add at least one contact.")
    .max(5000, "Up to 5,000 contacts per campaign."),
});

async function route(request: Request, path: string[]): Promise<Response> {
  const method = request.method;
  const { supabase, userId } = await authenticate(request);
  const [a, b] = path;

  if (method === "GET" && a === "me" && !b) {
    const profile = await loadProfile(supabase, userId);
    if (!profile)
      throw new HttpError(404, "Your account isn't set up yet. Please contact your administrator.");
    if (!profile.is_active) throw new HttpError(403, "This account has been deactivated.");
    return json(profile);
  }

  if (method === "GET" && a === "agents" && !b) {
    if (await isAdminUser(supabase, userId)) return json(await fetchAgentsRaw());
    const assigned = await loadAssignments(supabase, userId);
    if (!assigned.length) return json([] satisfies RetellAgent[]);
    const all = await fetchAgentsRaw();
    return json(
      assigned.map(
        (x) =>
          all.find((l) => l.agent_id === x.retell_agent_id) ?? {
            agent_id: x.retell_agent_id,
            agent_name: x.agent_name,
          },
      ),
    );
  }

  if (method === "POST" && a === "calls" && !b) {
    const body = callsBody.parse(await request.json());
    let agentIds = body.agentIds;
    const admin = await isAdminUser(supabase, userId);
    if (!admin) {
      const allowed = (await loadAssignments(supabase, userId)).map((x) => x.retell_agent_id);
      agentIds = agentIds.length ? agentIds.filter((id) => allowed.includes(id)) : allowed;
      if (!agentIds.length) return json([] satisfies RetellCall[]);
    }
    let calls = await cachedCalls(agentIds, body.from, body.to);
    if (body.slim) {
      calls = calls.map(
        ({ transcript: _t, transcript_object: _o, recording_url: _r, ...rest }) => ({
          ...rest,
          transcript: "",
        }),
      );
    }
    return json(admin ? calls : calls.map(({ call_cost: _omit, ...rest }) => rest));
  }

  if (method === "GET" && a === "calls" && b) {
    const call = await fetchCallRaw(b.replace(/[^\w-]/g, ""));
    if (await isAdminUser(supabase, userId)) return json(call);
    const allowed = (await loadAssignments(supabase, userId)).map((x) => x.retell_agent_id);
    if (!allowed.includes(call.agent_id))
      throw new HttpError(403, "You don't have access to this call.");
    const { call_cost: _omit, ...rest } = call;
    return json(rest);
  }

  if (a === "campaigns" && b === "options" && method === "GET")
    return json(await optionsFor(supabase, userId));

  if (a === "campaigns" && !b && method === "GET") {
    const { data, error } = await supabase
      .from("campaigns")
      .select(
        "id, user_id, name, retell_agent_id, agent_name, from_number, retell_batch_call_id, total_contacts, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new HttpError(500, "Couldn't load campaigns. Please try again.");
    return json((data ?? []) as Campaign[]);
  }

  if (a === "campaigns" && !b && method === "POST") {
    const body = campaignBody.parse(await request.json());
    return json(await createCampaignForUser(supabase, userId, body));
  }

  // ---- admin only ----
  if (a === "subaccounts" && !b && method === "GET") {
    await requireAdmin(supabase, userId);
    return json(await loadSubaccountProfiles(supabase));
  }

  if (a === "subaccounts" && b && method === "PATCH") {
    await requireAdmin(supabase, userId);
    const { is_active } = z.object({ is_active: z.boolean() }).parse(await request.json());
    const id = z.string().uuid().parse(b);
    if (id === userId) throw new HttpError(400, "You can't deactivate your own account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ is_active }).eq("id", id);
    if (error) throw new HttpError(500, "Couldn't update the subaccount. Please try again.");
    return json({ ok: true });
  }

  if (a === "billing" && !b && method === "GET") {
    await requireAdmin(supabase, userId);
    const [s, c] = await Promise.all([
      supabase.from("workspace_settings").select("daily_spend_limit").eq("id", 1).maybeSingle(),
      supabase.from("client_billing").select("user_id, rate_per_minute"),
    ]);
    const rates: Record<string, number | null> = {};
    for (const r of c.data ?? [])
      rates[r.user_id] = r.rate_per_minute == null ? null : Number(r.rate_per_minute);
    const lim = s.data?.daily_spend_limit;
    return json({ dailySpendLimit: lim == null ? null : Number(lim), rates });
  }

  throw new HttpError(404, "Not found.");
}

/*
 * Auth relay: some mobile carriers block *.supabase.co at DNS level. The app
 * first talks to Supabase directly and, only if that network call fails, retries
 * through this relay on the web app's own domain. Only the auth endpoints the
 * app needs are forwarded — no sign-up, no admin, no database access.
 */
const RELAY_ALLOWED = [
  /^auth\/v1\/token$/,
  /^auth\/v1\/user$/,
  /^auth\/v1\/logout$/,
  /^auth\/v1\/recover$/,
];

async function relaySupabase(request: Request, sub: string): Promise<Response> {
  const base = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!base || !key) throw new HttpError(500, "Server is not configured.");
  if (!RELAY_ALLOWED.some((re) => re.test(sub))) throw new HttpError(404, "Not found.");

  const headers = new Headers({ apikey: key });
  for (const name of ["content-type", "authorization", "x-client-info", "x-supabase-api-version"]) {
    const v = request.headers.get(name);
    if (v) headers.set(name, v);
  }
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) headers.set("x-forwarded-for", forwarded);

  const search = new URL(request.url).search;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(`${base}/${sub}${search}`, {
    method: request.method,
    headers,
    body: hasBody ? await request.text() : null,
  });
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}

export async function handleMobileApi(request: Request, splat: string): Promise<Response> {
  try {
    const parts = splat.split("/").filter(Boolean);
    if (parts[0] === "sb") return await relaySupabase(request, parts.slice(1).join("/"));
    return await route(request, parts);
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    if (err instanceof z.ZodError)
      return json({ error: err.issues[0]?.message ?? "Invalid request." }, 400);
    console.error("mobile api error", err);
    return json({ error: err instanceof Error ? err.message : "Something went wrong." }, 500);
  }
}
