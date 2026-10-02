// Shared domain types. Shapes mirror the Retell AI API so that swapping the
// mock data layer for the real secure proxy requires no component changes.

export type AppRole = "admin" | "subaccount";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  role: AppRole;
  agents: AgentAssignment[];
  phone_numbers?: string[];
}

export interface AgentAssignment {
  retell_agent_id: string;
  agent_name: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  retell_agent_id: string;
  agent_name: string;
  from_number: string;
  retell_batch_call_id: string | null;
  total_contacts: number;
  status: string;
  created_at: string;
}

export interface CampaignOptions {
  agents: AgentAssignment[];
  numbers: string[];
}

export interface CampaignContactInput {
  phone: string;
  name?: string;
  email?: string;
  vars?: Record<string, string>;
}

export interface RetellAgent {
  agent_id: string;
  agent_name: string;
}

export type Sentiment = "Positive" | "Neutral" | "Negative" | "Unknown";

export interface TranscriptTurn {
  role: "agent" | "user";
  content: string;
  start?: number;
}

export interface RetellCall {
  call_id: string;
  agent_id: string;
  agent_name: string;
  direction: "inbound" | "outbound";
  from_number: string;
  to_number: string;
  start_timestamp: number; // milliseconds
  end_timestamp: number; // milliseconds
  duration_ms: number;
  disconnection_reason: string;
  recording_url?: string;
  transcript: string;
  transcript_object?: TranscriptTurn[];
  call_cost?: { combined_cost: number };
  call_analysis: {
    call_summary: string;
    call_successful: boolean;
    user_sentiment: Sentiment;
    custom_analysis_data?: Record<string, string | number | boolean | null>;
  };
  retell_llm_dynamic_variables?: Record<string, string>;
  collected_dynamic_variables?: Record<string, string>;
}

export interface CallsQuery {
  agentIds: string[];
  from: number; // ms
  to: number; // ms
}
