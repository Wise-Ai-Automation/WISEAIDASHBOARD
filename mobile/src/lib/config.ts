const required = (name: string, value: string | undefined) => {
  if (!value) console.warn(`[config] Missing ${name} — copy mobile/.env.example to mobile/.env`);
  return value ?? "";
};

export const SUPABASE_URL = required("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL);
export const SUPABASE_KEY = required(
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
/** Deployed web app that hosts the /api/mobile/* endpoints. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://wiseaidashboard.netlify.app").replace(/\/$/, "");
/** Where the password-reset email link lands (handled by the web app). */
export const RESET_REDIRECT = `${API_URL}/reset-password`;
