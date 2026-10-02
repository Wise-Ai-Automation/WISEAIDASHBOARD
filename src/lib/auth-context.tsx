import type React from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as api from "./api";
import type { Profile } from "./types";

interface AuthValue {
  user: Profile | null;
  /** The profile whose data is being viewed (admin "View as" impersonation). */
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

// Keep one context instance across hot reloads so the provider and hooks never disagree.
const gAuthContext = globalThis as unknown as { __AuthContext?: React.Context<AuthValue | null> };
const AuthContext = (gAuthContext.__AuthContext ??= createContext<AuthValue | null>(null));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [viewingAs, setViewingAs] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const current = await api.getCurrentUser();
    setUser(current);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
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
        const profile = await api.signIn(email, password);
        setUser(profile);
        setViewingAs(null);
      },
      signOut: async () => {
        await api.signOut();
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
