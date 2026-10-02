import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password | Voice Agent Dashboard" },
      { name: "description", content: "Request a password reset link for your voice agent dashboard account." },
      { property: "og:title", content: "Reset password | Voice Agent Dashboard" },
      { property: "og:description", content: "Request a password reset link for your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the reset email.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="relative w-full max-w-[440px] rounded-2xl border border-border bg-card p-7 shadow-card sm:p-9">
        <div className="absolute right-5 top-5"><ThemeToggle /></div>
        {sent ? (
          <div className="space-y-3 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
              <MailCheck className="size-6" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Check your inbox</h1>
            <p className="text-sm text-muted-foreground">
              If an account exists for {email}, we've sent a link to reset your password.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Forgot your password?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your email and we'll send you a reset link.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <Button type="submit" className="h-11 w-full bg-brand-gradient font-semibold shadow-glow" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Send reset link
            </Button>
            <Link
              to="/"
              className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
