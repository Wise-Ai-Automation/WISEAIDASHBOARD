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
  { label: string; description: string; color: string; badgeClass: string }
> = {
  contacted: {
    label: "Contacted",
    description: "Initial conversation had with AI agent",
    color: "#3b82f6",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  appointment_booked: {
    label: "Appointment Booked",
    description: "Appointment confirmed and scheduled",
    color: "#10b981",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  not_booked: {
    label: "Not Booked",
    description: "Follow-up required or booking declined",
    color: "#f59e0b",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  appointment_done: {
    label: "Appointment Done",
    description: "Scheduled appointment completed",
    color: "#8b5cf6",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  closed: {
    label: "Closed / Won",
    description: "Lead successfully converted",
    color: "#059669",
    badgeClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
  },
};

export function callLeadStage(call: RetellCall): LeadStage {
  if (typeof window !== "undefined") {
    try {
      const overrides = JSON.parse(localStorage.getItem("lead_stage_overrides") || "{}");
      if (overrides[call.call_id]) return overrides[call.call_id] as LeadStage;
    } catch {
      // ignore
    }
  }

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

export function setLeadStageOverride(callId: string, stage: LeadStage) {
  if (typeof window === "undefined") return;
  try {
    const overrides = JSON.parse(localStorage.getItem("lead_stage_overrides") || "{}");
    overrides[callId] = stage;
    localStorage.setItem("lead_stage_overrides", JSON.stringify(overrides));
  } catch {
    // ignore
  }
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

export function toCsv(calls: RetellCall[], includeCost = true) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const headers = [
    "Phone",
    "Customer Name",
    "Email",
    "Appointment Booked",
    "Booking ID",
    "Summary",
    "Duration (s)",
    "Date",
    "Sentiment",
    "Success",
  ];
  if (includeCost) headers.push("Cost (USD)");

  const rows = [
    headers.join(","),
    ...calls.map((c) => {
      const booked = callAppointmentBooked(c);
      const bookedStr = booked === true ? "Yes" : booked === false ? "No" : "";
      const row = [
        escape(callPhoneNumber(c)),
        escape(callCustomerName(c) ?? ""),
        escape(callEmail(c) ?? ""),
        escape(bookedStr),
        escape(callBookingId(c) ?? ""),
        escape(c.call_analysis?.call_summary ?? ""),
        Math.round(c.duration_ms / 1000),
        escape(new Date(c.start_timestamp).toISOString()),
        escape(c.call_analysis?.user_sentiment ?? "Unknown"),
        c.call_analysis?.call_successful ? "Yes" : "No",
      ];
      if (includeCost) {
        row.push(c.call_cost ? c.call_cost.combined_cost.toFixed(3) : "");
      }
      return row.join(",");
    }),
  ];
  return rows.join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
