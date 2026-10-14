import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { API_URL, SUPABASE_KEY, SUPABASE_URL } from "./config";

// SecureStore caps values at ~2KB and a Supabase session is larger, so each
// value is split across chunked keys in the device keychain/keystore.
const CHUNK = 1800;

const secureStorage = {
  async getItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(`${key}.n`));
    if (!count) return null;
    const parts = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)));
    return parts.some((p) => p == null) ? null : parts.join("");
  },
  async setItem(key: string, value: string) {
    await secureStorage.removeItem(key);
    const parts = value.match(new RegExp(`.{1,${CHUNK}}`, "gs")) ?? [];
    await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(`${key}.${i}`, p)));
    await SecureStore.setItemAsync(`${key}.n`, String(parts.length));
  },
  async removeItem(key: string) {
    const count = Number(await SecureStore.getItemAsync(`${key}.n`));
    await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)));
    await SecureStore.deleteItemAsync(`${key}.n`);
  },
};

// Some carriers block *.supabase.co at DNS. Try Supabase directly first; if the network
// call itself fails (DNS/timeout/reset), retry through the web app's /api/mobile/sb relay
// and keep using it for the rest of the session. HTTP errors (e.g. wrong password) are
// real answers from Supabase and are never retried.
const RELAY = `${API_URL}/api/mobile/sb`;
let useRelay = false;

function viaRelay(url: string) {
  // Guard against SUPABASE_URL being empty (misconfigured env): "".startsWith("")
  // is always true, which would otherwise mangle every URL instead of just ours.
  return SUPABASE_URL && url.startsWith(SUPABASE_URL) ? RELAY + url.slice(SUPABASE_URL.length) : url;
}

const resilientFetch: typeof fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (!SUPABASE_URL) {
    // Fail loudly instead of quietly hitting "http://localhost" and cascading into a
    // confusing, unrelated-looking error — this means EXPO_PUBLIC_SUPABASE_URL wasn't
    // baked into this build/update (check EAS env vars for its branch/channel).
    throw new Error("App isn't configured (missing Supabase URL). Please contact your administrator.");
  }
  if (useRelay) return fetch(viaRelay(url), init);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (init?.signal?.aborted) throw e; // caller cancelled — not a network problem
    useRelay = true;
    return fetch(viaRelay(url), init);
  } finally {
    clearTimeout(timer);
  }
};

// SecureStore has no web implementation; browsers fall back to localStorage.
const webStorage = {
  getItem: async (k: string) => globalThis.localStorage?.getItem(k) ?? null,
  setItem: async (k: string, v: string) => void globalThis.localStorage?.setItem(k, v),
  removeItem: async (k: string) => void globalThis.localStorage?.removeItem(k),
};

export const supabase = createClient(SUPABASE_URL || "http://localhost", SUPABASE_KEY || "missing", {
  global: { fetch: resilientFetch },
  auth: {
    storage: Platform.OS === "web" ? webStorage : secureStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
