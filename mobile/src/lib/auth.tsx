import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as api from "./api";
import { clearCache } from "./query";
import { supabase } from "./supabase";
import type { Profile } from "./types";

interface AuthValue {
  user: Profile | null;
  /** The profile whose data is being viewed (admin "View as"). */
  viewingAs: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  /** null = unrestricted (admin). Otherwise the only agent ids that may be queried. */
  allowedAgentIds: string[] | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setViewingAs: (profile: Profile | null) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [viewingAs, setViewingAs] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await api.getCurrentUser());
    } catch {
      // Offline at launch: keep whatever we had rather than logging out.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        void clearCache();
        setUser(null);
        setViewingAs(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const value = useMemo<AuthValue>(() => {
    const effective = viewingAs ?? user;
    const isAdmin = user?.role === "admin" && !viewingAs;
    return {
      user,
      viewingAs,
      loading,
      isAdmin,
      allowedAgentIds: isAdmin ? null : (effective?.agents.map((a) => a.retell_agent_id) ?? []),
      signIn: async (email, password) => {
        setUser(await api.signIn(email, password));
        setViewingAs(null);
      },
      signOut: async () => {
        await api.signOut();
        await clearCache();
        setUser(null);
        setViewingAs(null);
      },
      refresh,
      setViewingAs,
    };
  }, [user, viewingAs, loading, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
