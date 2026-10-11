import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { focusManager, QueryClient } from "@tanstack/react-query";
import { AppState } from "react-native";

const DAY = 24 * 60 * 60 * 1000;
const PERSIST_KEY = "wise.queryCache.v1";

// Data is served instantly from memory/disk and revalidated in the background:
// fresh for 5 minutes, kept for a day so a cold start can paint last-known data.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, gcTime: DAY, retry: 1, refetchOnReconnect: true },
  },
});

export const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: PERSIST_KEY, throttleTime: 2000 });

// Only list-style queries are written to disk (not single-call transcripts).
const PERSISTED = new Set(["agents", "calls", "calls-prev", "campaigns", "campaign-options"]);
export const persistOptions = {
  persister,
  maxAge: DAY,
  buster: "1",
  dehydrateOptions: {
    shouldDehydrateQuery: (q: { queryKey: readonly unknown[]; state: { status: string } }) =>
      q.state.status === "success" && PERSISTED.has(String(q.queryKey[0])),
  },
};

// Refetch stale data when the app returns to the foreground.
AppState.addEventListener("change", (s) => focusManager.setFocused(s === "active"));

/** Wipe memory + disk cache — called on sign-out so no call data outlives the session. */
export async function clearCache() {
  queryClient.clear();
  await AsyncStorage.removeItem(PERSIST_KEY).catch(() => {});
}
