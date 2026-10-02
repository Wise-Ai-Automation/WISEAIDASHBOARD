import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
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
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (active) { setSessionReady(Boolean(data.session)); setChecking(false); }
    };
    void check();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setSessionReady(Boolean(session)); setChecking(false);
      }
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionReady) { toast.error("Open a fresh password reset link from your email first."); return; }
    if (password !== confirm) {
      toast.error("The two passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => navigate({ to: "/" }), 2000);
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
        ) : checking ? <p className="py-12 text-center text-sm text-muted-foreground">Checking your reset link…</p> : !sessionReady ? (
          <div className="space-y-4 py-6 text-center">
            <h1 className="font-display text-xl font-bold text-foreground">Reset link unavailable</h1>
            <p className="text-sm text-muted-foreground">This link may have expired. Request a new one to reset your password.</p>
            <Button asChild className="w-full"><Link to="/forgot-password">Request a new link</Link></Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Set a new password</h1>
              <p className="mt-1 text-sm text-muted-foreground">Use at least 8 characters.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
