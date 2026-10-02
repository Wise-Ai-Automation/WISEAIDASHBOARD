import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { checkRetellConnection, updatePassword } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings | Voice Agent Dashboard" },
      { name: "description", content: "Manage your profile, password and Retell AI connection." },
      { property: "og:title", content: "Settings | Voice Agent Dashboard" },
      { property: "og:description", content: "Manage your profile, password and Retell AI connection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <SettingsPage />
    </RequireAuth>
  ),
});

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <h2 className="font-display text-[15px] font-bold text-foreground">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function RetellStatus() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["retell-status"],
    queryFn: checkRetellConnection,
    staleTime: 60_000,
  });

  if (isLoading) return <Skeleton className="h-10 w-48" />;

  const connected = Boolean(!isError && data?.connected);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge
        className={
          connected
            ? "border border-success/20 bg-success/10 text-success"
            : "border border-destructive/20 bg-destructive/10 text-destructive"
        }
      >
        {connected ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
        {connected
          ? data?.agentCount
            ? `Connected (${data.agentCount} ${data.agentCount === 1 ? "agent" : "agents"})`
            : "Connected"
          : "Not connected"}
      </Badge>
      <span className="text-sm text-muted-foreground">
        Your API key is stored as a server secret and is never shown here.
      </span>
      <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
        {isFetching ? <Loader2 className="size-4 animate-spin" /> : null}
        Re-check
      </Button>
    </div>
  );
}

function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("The two passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      await updatePassword(password);
      toast.success("Password updated");
      setPassword("");
      setConfirm("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Settings" description="Your profile and account security">
      <div className="grid max-w-3xl gap-5">
        <Card title="Appearance" description="Choose the view that feels best for you.">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-foreground"><span>Light / dark mode</span><ThemeToggle /></div>
        </Card>
        <Card title="Profile">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full name</Label>
              <Input value={user?.full_name ?? ""} readOnly />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ""} readOnly />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            Role:
            <Badge variant={isAdmin ? "default" : "secondary"} className="capitalize">
              {user?.role}
            </Badge>
          </div>
        </Card>

        <Card title="Change password" description="Use at least 8 characters.">
          <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new">New password</Label>
              <Input
                id="new"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
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
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Update password
              </Button>
            </div>
          </form>
        </Card>

        {isAdmin ? (
          <Card title="Retell connection" description="Verifies the stored API key by listing your agents.">
            <RetellStatus />
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
