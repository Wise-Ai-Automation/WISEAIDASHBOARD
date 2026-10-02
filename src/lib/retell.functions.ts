import { createServerFn } from "@tanstack/react-start";
import type { RetellAgent, RetellCall, Sentiment, TranscriptTurn } from "./types";

/*
 * Server-side proxy to the Retell AI API. RETELL_API_KEY is read only inside
 * handlers and never leaves the server. Responses are normalized into plain
 * DTOs and sensitive fields (e.g. web-call access tokens) are dropped.
 *
 * The raw helpers below are used by secure.functions.ts, which gates every
 * call behind requireSupabaseAuth and derives subaccount agent access from
 * agent_assignments server-side — the browser never decides what it may see.
 */

const BASE = "https://api.retellai.com";

function key() {
  const k = process.env["RETELL_API_KEY"];
  if (!k) throw new Error("Retell is not configured yet.");
  return k;
}

/** fetch with retries for rate limits (429) and transient 5xx errors. */
async function retell(path: string, init: RequestInit = {}, attempt = 0): Promise<unknown> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json", ...init.headers },
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    return retell(path, init, attempt + 1);
  }
  if (res.status === 429) throw new Error("Retell is busy right now. Please try again in a moment.");
  if (!res.ok) {
    console.error("Retell error", res.status, await res.text().catch(() => ""));
    throw new Error(res.status === 404 ? "Call not found." : "Couldn't reach Retell. Please try again.");
  }
  return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

function normalizeSentiment(s: unknown): Sentiment {
  return s === "Positive" || s === "Neutral" || s === "Negative" ? s : "Unknown";
}

function normalizeCall(c: Raw): RetellCall {
  const start = Number(c.start_timestamp ?? 0);
  const end = Number(c.end_timestamp ?? start);
  const turns: TranscriptTurn[] | undefined = Array.isArray(c.transcript_object)
    ? c.transcript_object
        .filter((t: Raw) => t.role === "agent" || t.role === "user")
        .map((t: Raw) => {
          const s = t.words?.[0]?.start;
          return typeof s === "number"
            ? { role: t.role, content: String(t.content ?? ""), start: s }
            : { role: t.role, content: String(t.content ?? "") };
        })
    : undefined;
  const a: Raw = c.call_analysis ?? {};
  const call: RetellCall = {
    call_id: String(c.call_id),
    agent_id: String(c.agent_id ?? ""),
    agent_name: String(c.agent_name ?? c.agent_id ?? "Agent"),
    direction: c.direction === "outbound" ? "outbound" : "inbound",
    from_number: String(c.from_number ?? (c.call_type === "web_call" ? "Web call" : "")),
    to_number: String(c.to_number ?? (c.call_type === "web_call" ? "Web call" : "")),
    start_timestamp: start,
    end_timestamp: end,
    duration_ms: Number(c.duration_ms ?? Math.max(0, end - start)),
    disconnection_reason: String(c.disconnection_reason ?? c.call_status ?? "unknown"),
    transcript: String(c.transcript ?? ""),
    call_analysis: {
      call_summary: String(a.call_summary ?? ""),
      call_successful: Boolean(a.call_successful),
      user_sentiment: normalizeSentiment(a.user_sentiment),
      custom_analysis_data: a.custom_analysis_data ?? {},
    },
    retell_llm_dynamic_variables: c.retell_llm_dynamic_variables ?? {},
    collected_dynamic_variables: c.collected_dynamic_variables ?? {},
  };
  if (c.recording_url) call.recording_url = String(c.recording_url);
  if (turns) call.transcript_object = turns;
  // Retell reports combined_cost in cents.
  if (c.call_cost?.combined_cost != null) call.call_cost = { combined_cost: Number(c.call_cost.combined_cost) / 100 };
  return call;
}

/** Phone numbers purchased on the Retell account. */
export async function fetchPhoneNumbersRaw(): Promise<{ phone_number: string; pretty: string }[]> {
  const list = (await retell("/list-phone-numbers")) as Raw[];
  return list.map((n) => ({ phone_number: n.phone_number, pretty: n.phone_number_pretty ?? n.phone_number }));
}

/** Launch a Retell batch call. Returns the batch id. */
export async function createBatchCallRaw(body: {
  name: string;
  from_number: string;
  tasks: { to_number: string; override_agent_id: string; retell_llm_dynamic_variables: Record<string, string> }[];
}): Promise<string> {
  const res = await fetch(BASE + "/create-batch-call", {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("Retell batch error", res.status, text);
    let msg = "";
    try {
      msg = (JSON.parse(text) as Raw)?.message ?? "";
    } catch {
      /* ignore */
    }
    if (res.status === 429) throw new Error("Retell is busy right now. Please try again in a moment.");
    throw new Error(msg ? `Retell rejected the campaign: ${msg}` : "Couldn't start the campaign on Retell.");
  }
  const json = JSON.parse(text) as Raw;
  return String(json.batch_call_id ?? "");
}

/** All agents on the Retell account, deduplicated by agent_id (latest version kept). */
export async function fetchAgentsRaw(): Promise<RetellAgent[]> {
  const agents = (await retell("/list-agents")) as Raw[];
  const map = new Map<string, RetellAgent>();
  for (const a of agents) {
    map.set(a.agent_id, { agent_id: a.agent_id, agent_name: a.agent_name ?? a.agent_id });
  }
  return [...map.values()];
}

/** All calls in the time window, optionally filtered to specific agents. */
export async function fetchCallsRaw(agentIds: string[], from: number, to: number): Promise<RetellCall[]> {
  const filter_criteria: Raw = {
    start_timestamp: { lower_threshold: from, upper_threshold: to },
  };
  if (agentIds.length) filter_criteria.agent_id = agentIds;

  const all: RetellCall[] = [];
  let pagination_key: string | undefined;
  // Follow pagination until every call in the range is fetched (safety cap 20 pages).
  for (let page = 0; page < 20; page++) {
    const body: Raw = { filter_criteria, sort_order: "descending", limit: 1000 };
    if (pagination_key) body.pagination_key = pagination_key;
    const rows = (await retell("/v2/list-calls", { method: "POST", body: JSON.stringify(body) })) as Raw[];
    all.push(...rows.map(normalizeCall));
    if (rows.length < 1000) break;
    pagination_key = rows[rows.length - 1]?.call_id;
  }
  return all;
}

export async function fetchCallRaw(callId: string): Promise<RetellCall> {
  const raw = (await retell(`/v2/get-call/${callId}`)) as Raw;
  return normalizeCall(raw);
}

export const verifyRetellKey = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const agents = await fetchAgentsRaw();
    return { connected: true, agentCount: agents.length };
  } catch {
    return { connected: false, agentCount: 0 };
  }
});
