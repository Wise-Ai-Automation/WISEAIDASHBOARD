// Display helpers — mirrors the web app's src/lib/format.ts (minus browser-only CSV/localStorage bits).
import type { RetellCall } from "./types";

export function formatDuration(ms: number) {
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function formatClock(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Retell sends milliseconds; render in the viewer's local timezone. */
export function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatReason(reason: string) {
  return reason.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function callPhoneNumber(call: RetellCall) {
  return call.direction === "inbound" ? call.from_number : call.to_number;
}

/** Customer/user name lives in custom analysis data or dynamic variables. */
export function callCustomerName(call: RetellCall): string | null {
  const custom = call.call_analysis?.custom_analysis_data ?? {};
  for (const [key, value] of Object.entries(custom)) {
    if (key.toLowerCase().includes("name") && typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  const fallbacks = { ...(call.retell_llm_dynamic_variables ?? {}), ...(call.collected_dynamic_variables ?? {}) };
  for (const [key, value] of Object.entries(fallbacks)) {
    if (key.toLowerCase().includes("name") && typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/** Customer email lives in custom analysis data or dynamic variables. */
export function callEmail(call: RetellCall): string | null {
  const custom = call.call_analysis?.custom_analysis_data ?? {};
  for (const [key, value] of Object.entries(custom)) {
    if (key.toLowerCase().includes("email") && typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  const fallbacks = { ...(call.retell_llm_dynamic_variables ?? {}), ...(call.collected_dynamic_variables ?? {}) };
  for (const [key, value] of Object.entries(fallbacks)) {
    if (key.toLowerCase().includes("email") && typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/** Check if an appointment was booked from post-call analysis. */
export function callAppointmentBooked(call: RetellCall): boolean | null {
  const custom = call.call_analysis?.custom_analysis_data ?? {};
  for (const [key, value] of Object.entries(custom)) {
    if (key.toLowerCase().includes("booked") || key.toLowerCase().includes("booking")) {
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        if (value.toLowerCase() === "true" || value.toLowerCase() === "yes") return true;
        if (value.toLowerCase() === "false" || value.toLowerCase() === "no") return false;
      }
    }
  }
  return null;
}

/** Retrieve appointment date/time timing from custom analysis or collected variables. */
export function callAppointmentTiming(call: RetellCall): string | null {
  const custom = call.call_analysis?.custom_analysis_data ?? {};
  for (const [key, value] of Object.entries(custom)) {
    const k = key.toLowerCase();
    if (
      (k.includes("time") || k.includes("timing") || k.includes("date") || k.includes("detail") || k.includes("schedule")) &&
      !k.includes("duration") &&
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }
  const fallbacks = { ...(call.retell_llm_dynamic_variables ?? {}), ...(call.collected_dynamic_variables ?? {}) };
  for (const [key, value] of Object.entries(fallbacks)) {
    const k = key.toLowerCase();
    if (
      (k.includes("time") || k.includes("timing") || k.includes("date") || k.includes("schedule")) &&
      !k.includes("duration") &&
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }
  return null;
}

export type LeadStage =
  | "contacted"
  | "appointment_booked"
  | "not_booked"
  | "appointment_done"
  | "closed";

export const STAGE_CONFIG: Record<
  LeadStage,
  { label: string; description: string; color: string }
> = {
  contacted: {
    label: "Contacted",
    description: "Initial conversation had with AI agent",
    color: "#3b82f6",
  },
  appointment_booked: {
    label: "Appointment Booked",
    description: "Appointment confirmed and scheduled",
    color: "#10b981",
  },
  not_booked: {
    label: "Not Booked",
    description: "Follow-up required or booking declined",
    color: "#f59e0b",
  },
  appointment_done: {
    label: "Appointment Done",
    description: "Scheduled appointment completed",
    color: "#8b5cf6",
  },
  closed: {
    label: "Closed / Won",
    description: "Lead successfully converted",
    color: "#059669",
  },
};

export function callLeadStage(call: RetellCall, overrides: Record<string, LeadStage> = {}): LeadStage {
  if (overrides[call.call_id]) return overrides[call.call_id] as LeadStage;

  const booked = callAppointmentBooked(call);
  const timing = callAppointmentTiming(call);

  if (booked) {
    if (timing) {
      const parsed = Date.parse(timing);
      if (!Number.isNaN(parsed) && parsed < Date.now()) {
        return "appointment_done";
      }
    }
    return "appointment_booked";
  }

  if (booked === false) {
    return "not_booked";
  }

  return "contacted";
}

/** Retrieve booking ID from collected variables or custom analysis. */
export function callBookingId(call: RetellCall): string | null {
  const collected = call.collected_dynamic_variables ?? {};
  for (const [key, value] of Object.entries(collected)) {
    if (key.toLowerCase().includes("booking") && value) return String(value);
  }
  const custom = call.call_analysis?.custom_analysis_data ?? {};
  for (const [key, value] of Object.entries(custom)) {
    if (key.toLowerCase().includes("booking") && typeof value === "string" && value) return value;
  }
  return null;
}

/** Appointment timing is free text from the agent; pretty-print it when it is an ISO timestamp. */
export function formatTiming(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return value;
  return new Date(ms).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
