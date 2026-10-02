import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { ShellSkeleton } from "@/components/app-shell";

/**
 * Client-side route guard. Unauthenticated visitors are sent to the login
 * page; subaccounts are bounced off admin-only pages. The server-side
 * endpoints enforce the same rules independently — this guard is UX only.
 */
export function RequireAuth({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/", replace: true });
    else if (adminOnly && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, isAdmin, adminOnly, navigate]);

  if (loading || !user || (adminOnly && !isAdmin)) return <ShellSkeleton />;
  return <>{children}</>;
}
