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
  const custom = call.call_analysis.custom_analysis_data ?? {};
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
  const custom = call.call_analysis.custom_analysis_data ?? {};
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
  const custom = call.call_analysis.custom_analysis_data ?? {};
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

/** Retrieve booking ID from collected variables or custom analysis. */
export function callBookingId(call: RetellCall): string | null {
  const collected = call.collected_dynamic_variables ?? {};
  for (const [key, value] of Object.entries(collected)) {
    if (key.toLowerCase().includes("booking") && value) return String(value);
  }
  const custom = call.call_analysis.custom_analysis_data ?? {};
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
        escape(c.call_analysis.call_summary ?? ""),
        Math.round(c.duration_ms / 1000),
        escape(new Date(c.start_timestamp).toISOString()),
        escape(c.call_analysis.user_sentiment),
        c.call_analysis.call_successful ? "Yes" : "No",
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
