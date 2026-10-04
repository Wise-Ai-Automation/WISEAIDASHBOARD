import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password | Voice Agent Dashboard" },
      { name: "description", content: "Choose a new password for your voice agent dashboard account." },
      { property: "og:title", content: "Set a new password | Voice Agent Dashboard" },
      { property: "og:description", content: "Choose a new password for your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function initSession() {
      try {
        if (typeof window === "undefined") return;

        // 1. Check for error parameters in query or hash
        const searchParams = new URLSearchParams(window.location.search);
        const hashRaw = window.location.hash.replace(/^#/, "");
        const hashParams = new URLSearchParams(hashRaw);

        const errorDesc =
          searchParams.get("error_description") ||
          hashParams.get("error_description") ||
          searchParams.get("error") ||
          hashParams.get("error");

        if (errorDesc) {
          if (active) {
            setLinkError(decodeURIComponent(errorDesc).replace(/\+/g, " "));
            setChecking(false);
          }
          return;
        }

        // 2. Check for PKCE exchange code in query (?code=...)
        const code = searchParams.get("code");
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session && active) {
            setSessionReady(true);
            setChecking(false);
            return;
          }
        }

        // 3. Check for hash tokens (#access_token=...&refresh_token=...)
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error && data.session && active) {
            setSessionReady(true);
            setChecking(false);
            return;
          }
        }

        // 4. Check existing session
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session && active) {
          setSessionReady(true);
          setChecking(false);
          return;
        }

        // 5. Fallback timer in case Supabase's internal listener is still parsing
        const timer = setTimeout(async () => {
          if (!active) return;
          const { data: finalCheck } = await supabase.auth.getSession();
          if (active) {
            setSessionReady(Boolean(finalCheck.session));
            setChecking(false);
          }
        }, 1200);

        return () => clearTimeout(timer);
      } catch (err) {
        if (active) setChecking(false);
      }
    }

    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        if (active) {
          setSessionReady(true);
          setChecking(false);
        }
      }
    });

    void initSession();

    return () => {
      active = false;
      authSub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionReady) {
      toast.error("Open a fresh password reset link from your email first.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("The two passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      setDone(true);
      await supabase.auth.signOut();
      setTimeout(() => navigate({ to: "/" }), 2200);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="relative w-full max-w-[440px] rounded-2xl border border-border bg-card p-7 shadow-card sm:p-9">
        <div className="absolute right-5 top-5"><ThemeToggle /></div>

        {done ? (
          <div className="space-y-3 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
              <CheckCircle2 className="size-6" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Password updated</h1>
            <p className="text-sm text-muted-foreground">You can now sign in with your new password.</p>
            <Button className="w-full" asChild>
              <Link to="/">Go to sign in</Link>
            </Button>
          </div>
        ) : checking ? (
          <div className="space-y-3 py-10 text-center">
            <Loader2 className="mx-auto size-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
          </div>
        ) : !sessionReady ? (
          <div className="space-y-4 py-4 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="size-6" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">Reset link unavailable</h1>
            <p className="text-sm text-muted-foreground">
              {linkError || "This link may have expired or already been used. Please request a new one."}
            </p>
            <Button asChild className="w-full">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Set a new password</h1>
              <p className="mt-1 text-sm text-muted-foreground">Use at least 8 characters.</p>
            </div>
            <div className="relative space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-11"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 bottom-0 h-10 w-10 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="h-11 w-full bg-brand-gradient font-semibold shadow-glow" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Update password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
