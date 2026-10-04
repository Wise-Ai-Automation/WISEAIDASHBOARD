// Single data-access boundary for the whole app.
//
// Auth runs on Supabase (email + password, no public sign-up). Roles and
// agent assignments live in the database and are enforced server-side — the
// browser never decides what a subaccount may see. Call data is fetched live
// from Retell through secure server functions and is never stored here.

import { supabase } from "@/integrations/supabase/client";
import {
  adminCreateSubaccount,
  adminDeleteSubaccount,
  adminListSubaccounts,
  adminResetSubaccountPassword,
  adminUpdateSubaccount,
} from "./admin.functions";
import { verifyRetellKey } from "./retell.functions";
import {
  adminListRetellNumbers,
  adminSetPhoneNumbers,
  createCampaign as createCampaignFn,
  getCampaignOptions as getCampaignOptionsFn,
  listCampaigns as listCampaignsFn,
} from "./campaigns.functions";
import { getMyProfile, secureGetCall, secureListAgents, secureListCalls } from "./secure.functions";
import type { AgentAssignment, CallsQuery, Campaign, CampaignContactInput, CampaignOptions, Profile, RetellAgent, RetellCall } from "./types";

/* ------------------------------ auth ------------------------------ */

function friendlyAuthError(message: string): Error {
  if (/invalid login credentials/i.test(message)) return new Error("Invalid email or password.");
  if (/email not confirmed/i.test(message))
    return new Error("Please confirm your email address first — check your inbox.");
  if (/too many requests/i.test(message))
    return new Error("Too many attempts. Please wait a minute and try again.");
  return new Error(message || "Could not sign you in.");
}

export async function signIn(email: string, password: string): Promise<Profile> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw friendlyAuthError(error.message);

  const profile = await getMyProfile();
  if (!profile) {
    await supabase.auth.signOut();
    throw new Error("Your account isn't set up yet. Please contact your administrator.");
  }
  // Deactivated accounts are blocked at login with a clear message.
  if (!profile.is_active) {
    await supabase.auth.signOut();
    throw new Error("This account has been deactivated. Please contact your administrator.");
  }
  return profile;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<Profile | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const profile = await getMyProfile();
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return null;
  }
  return profile;
}

export async function requestPasswordReset(email: string) {
  if (!email.includes("@")) throw new Error("Please enter a valid email address.");
  const redirectUrl =
    typeof window !== "undefined" && window.location.origin
      ? `${window.location.origin}/reset-password`
      : "https://wiseaidashboard.netlify.app/reset-password";
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: redirectUrl,
  });
  if (error) {
    if (error.status === 429) throw new Error("Too many reset requests. Please wait a minute before trying again.");
    throw new Error(error.message || "Could not send the reset email. Please try again.");
  }
  return true;
}

export async function updatePassword(newPassword: string) {
  if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.");
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message.includes("weak") ? "That password is too weak. Use a stronger one." : "Could not update your password.");
  return true;
}

/* ------------------------------ agents ------------------------------ */
// Live data from Retell; the server decides which agents the caller may see.

export async function listAgents(): Promise<RetellAgent[]> {
  return secureListAgents();
}

export async function checkRetellConnection(): Promise<{ connected: boolean; agentCount: number }> {
  return verifyRetellKey();
}

/* ------------------------------ calls ------------------------------ */

export async function listCalls(query: CallsQuery, allowedAgentIds: string[] | null): Promise<RetellCall[]> {
  // Client-side intersection only shapes the request; the server re-derives
  // allowed agents from agent_assignments and never trusts this list.
  let agentIds = query.agentIds;
  if (allowedAgentIds) {
    agentIds = agentIds.length ? agentIds.filter((id) => allowedAgentIds.includes(id)) : allowedAgentIds;
    if (!agentIds.length) return [];
  }
  return secureListCalls({ data: { agentIds, from: query.from, to: query.to } });
}

export async function getCall(callId: string, allowedAgentIds: string[] | null): Promise<RetellCall> {
  return secureGetCall({ data: { callId } });
}

/* --------------------------- subaccounts --------------------------- */

export async function listSubaccounts(): Promise<Profile[]> {
  return adminListSubaccounts();
}

export async function createSubaccount(input: {
  full_name: string;
  email: string;
  password: string;
  agents: AgentAssignment[];
}): Promise<Profile> {
  if (!input.agents.length) throw new Error("Assign at least one agent.");
  return adminCreateSubaccount({ data: input });
}

export async function updateSubaccount(
  id: string,
  patch: Partial<Pick<Profile, "full_name" | "is_active" | "agents">>,
): Promise<Profile> {
  if (patch.agents && !patch.agents.length) throw new Error("Assign at least one agent.");
  return adminUpdateSubaccount({ data: { id, ...patch } });
}

export async function deleteSubaccount(id: string) {
  await adminDeleteSubaccount({ data: { id } });
}

export async function resetSubaccountPassword(id: string, password: string) {
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  await adminResetSubaccountPassword({ data: { id, password } });
  return true;
}

/* ---------------------------- campaigns ---------------------------- */

export async function getCampaignOptions(): Promise<CampaignOptions> {
  return getCampaignOptionsFn();
}

export async function listCampaigns(): Promise<Campaign[]> {
  return listCampaignsFn();
}

export async function createCampaign(input: {
  name: string;
  agent_id: string;
  from_number: string;
  contacts: CampaignContactInput[];
}): Promise<Campaign> {
  return createCampaignFn({ data: input });
}

export async function listRetellNumbers(): Promise<{ phone_number: string; pretty: string }[]> {
  return adminListRetellNumbers();
}

export async function setSubaccountNumbers(userId: string, numbers: string[]) {
  await adminSetPhoneNumbers({ data: { user_id: userId, numbers } });
}

/* ----------------------------- billing ----------------------------- */

import { getBillingSettings as getBillingFn, setClientRate as setRateFn, setDailySpendLimit as setLimitFn } from "./billing.functions";
export type { BillingSettings } from "./billing.functions";

export async function getBillingSettings() {
  return getBillingFn();
}

export async function setClientRate(userId: string, rate: number | null) {
  await setRateFn({ data: { user_id: userId, rate } });
}

export async function setDailySpendLimit(limit: number | null) {
  await setLimitFn({ data: { limit } });
}
