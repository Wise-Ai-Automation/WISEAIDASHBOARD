// Single data-access boundary for the app (mirrors the web app's src/lib/api.ts).
// Auth talks to Supabase directly; everything else goes through the web app's
// /api/mobile/* endpoints, which enforce roles and agent assignments server-side.

import { API_URL, RESET_REDIRECT } from "./config";
import { supabase } from "./supabase";
import type { Campaign, CampaignContactInput, CampaignOptions, Profile, RetellAgent, RetellCall } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError("Please sign in again.", 401);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/mobile/${path}`, {
      method: init.method ?? "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: init.body === undefined ? null : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  const text = await res.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    const message = (payload as { error?: string } | null)?.error;
    throw new ApiError(message ?? "Something went wrong. Please try again.", res.status);
  }
  return payload as T;
}

/* ------------------------------ auth ------------------------------ */

/** Friendly message for the UI; the raw Supabase code/status rides along as `detail` for support. */
function friendlyAuthError(message: string, raw?: { code?: string | undefined; status?: number | undefined }): Error {
  const err = friendlyMessage(message);
  (err as Error & { detail?: string }).detail = [raw?.code, raw?.status, message].filter(Boolean).join(" · ");
  return err;
}

function friendlyMessage(message: string): Error {
  if (/invalid login credentials/i.test(message)) return new Error("Invalid email or password.");
  if (/email not confirmed/i.test(message)) return new Error("Please confirm your email address first — check your inbox.");
  if (/too many requests/i.test(message)) return new Error("Too many attempts. Please wait a minute and try again.");
  return new Error(message || "Could not sign you in.");
}

async function loadProfile(): Promise<Profile | null> {
  try {
    return await request<Profile>("me");
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) return null;
    throw e;
  }
}

export async function signIn(email: string, password: string): Promise<Profile> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    console.warn("[auth] sign-in rejected", error.status, error.code, error.message);
    throw friendlyAuthError(error.message, { code: error.code, status: error.status });
  }
  const profile = await loadProfile();
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    throw new Error(
      profile ? "This account has been deactivated. Please contact your administrator." : "Your account isn't set up yet. Please contact your administrator.",
    );
  }
  return profile;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<Profile | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  try {
    const profile = await loadProfile();
    if (!profile || !profile.is_active) {
      await supabase.auth.signOut();
      return null;
    }
    return profile;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      await supabase.auth.signOut();
      return null;
    }
    throw e;
  }
}

export async function requestPasswordReset(email: string) {
  if (!email.includes("@")) throw new Error("Please enter a valid email address.");
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: RESET_REDIRECT });
  if (error) {
    if (error.status === 429) throw new Error("Too many reset requests. Please wait a minute before trying again.");
    throw new Error(error.message || "Could not send the reset email. Please try again.");
  }
}

export async function updatePassword(newPassword: string) {
  if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.");
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(/weak/i.test(error.message) ? "That password is too weak. Use a stronger one." : "Could not update your password.");
}

/* ------------------------------ data ------------------------------ */

export const listAgents = () => request<RetellAgent[]>("agents");

export const listCalls = (query: { agentIds: string[]; from: number; to: number }, allowedAgentIds: string[] | null) => {
  // Client-side intersection only shapes the request; the server re-derives access.
  let agentIds = query.agentIds;
  if (allowedAgentIds) {
    agentIds = agentIds.length ? agentIds.filter((id) => allowedAgentIds.includes(id)) : allowedAgentIds;
    if (!agentIds.length) return Promise.resolve<RetellCall[]>([]);
  }
  return request<RetellCall[]>("calls", { method: "POST", body: { agentIds, from: query.from, to: query.to, slim: true } });
};

export const getCall = (callId: string) => request<RetellCall>(`calls/${encodeURIComponent(callId)}`);

export const getCampaignOptions = () => request<CampaignOptions>("campaigns/options");
export const listCampaigns = () => request<Campaign[]>("campaigns");
export const createCampaign = (input: {
  name: string;
  agent_id: string;
  from_number: string;
  contacts: CampaignContactInput[];
}) => request<Campaign>("campaigns", { method: "POST", body: input });

/* ------------------------------ admin ------------------------------ */

export const listSubaccounts = () => request<Profile[]>("subaccounts");
export const setSubaccountActive = (id: string, is_active: boolean) =>
  request<{ ok: true }>(`subaccounts/${id}`, { method: "PATCH", body: { is_active } });

export interface BillingSettings {
  dailySpendLimit: number | null;
  rates: Record<string, number | null>;
}
export const getBillingSettings = () => request<BillingSettings>("billing");
