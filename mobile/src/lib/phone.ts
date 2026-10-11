// Same normalisation the server applies (src/lib/csv.ts on the web app).
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^\d]/g, "");
  let out: string;
  if (trimmed.startsWith("+")) out = "+" + digits;
  else if (digits.length === 10) out = "+1" + digits;
  else if (digits.length === 11 && digits.startsWith("1")) out = "+" + digits;
  else out = "+" + digits;
  return /^\+\d{8,15}$/.test(out) ? out : null;
}
