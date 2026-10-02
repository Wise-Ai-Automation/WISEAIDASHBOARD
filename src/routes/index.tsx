import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { WiseLogo } from "@/components/wise-logo";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in | Voice Agent Dashboard" },
      { name: "description", content: "Sign in to your Retell AI voice agent analytics dashboard." },
      { property: "og:title", content: "Sign in | Voice Agent Dashboard" },
      { property: "og:description", content: "Sign in to your Retell AI voice agent analytics dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign you in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-brand-mesh p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="grid-fade pointer-events-none absolute inset-0" />
        <div className="relative">
          <WiseLogo invert subtitle="Voice Agent Dashboard" />
        </div>

        <div className="relative max-w-md space-y-6">
          <h2 className="font-display text-4xl font-bold leading-[1.15] xl:text-5xl">
            Every call your agents take, understood.
          </h2>
          <p className="text-base leading-relaxed text-primary-foreground/75">
            Live analytics, transcripts and recordings from your Retell AI voice agents — in one calm, focused workspace.
          </p>
          <div className="flex items-end gap-1.5 pt-4" aria-hidden>
            {[28, 44, 36, 60, 48, 72, 54, 80, 64, 90, 70, 58].map((h, i) => (
              <span
                key={i}
                className="w-3 rounded-full bg-primary-foreground/70"
                style={{ height: h, opacity: 0.35 + i * 0.05 }}
              />
            ))}
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-6 border-t border-primary-foreground/15 pt-6 text-sm">
          {[
            ["Live", "Straight from Retell"],
            ["Private", "Per-client access"],
            ["Secure", "Keys stay server-side"],
          ].map(([t, d]) => (
            <div key={t}>
              <div className="font-display font-semibold">{t}</div>
              <div className="text-primary-foreground/65">{d}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* Form */}
      <main className="relative flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="absolute right-5 top-5"><ThemeToggle /></div>
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <WiseLogo subtitle="Voice Agent Dashboard" />
          </div>

          <h1 className="font-display text-3xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to see how your voice agents are performing.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="relative space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="h-11 bg-card"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 bg-card pr-11"
              />
              <Button type="button" variant="ghost" size="icon" className="absolute right-0 bottom-0 h-11 w-11" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button>
            </div>
            <Button
              type="submit"
              className="h-11 w-full bg-brand-gradient text-sm font-semibold shadow-glow transition-transform hover:-translate-y-px"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Accounts are created by an administrator. Contact yours if you need access.
          </p>
        </div>
      </main>
    </div>
  );
}
