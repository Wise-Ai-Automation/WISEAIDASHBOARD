import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, KeyRound, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Profile, RetellAgent } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/subaccounts")({
  head: () => ({
    meta: [
      { title: "Subaccounts | Voice Agent Dashboard" },
      { name: "description", content: "Create subaccounts and control which voice agents each client can see." },
      { property: "og:title", content: "Subaccounts | Voice Agent Dashboard" },
      { property: "og:description", content: "Create subaccounts and control agent access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth adminOnly>
      <SubaccountsPage />
    </RequireAuth>
  ),
});

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
  return Array.from(crypto.getRandomValues(new Uint32Array(14)))
    .map((n) => chars[n % chars.length])
    .join("");
}

function AgentPicker({
  agents,
  selected,
  onToggle,
}: {
  agents: RetellAgent[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const list = agents.filter((a) => a.agent_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-2">
      <Input placeholder="Search agents" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-1">
        {list.map((agent) => {
          const active = selected.includes(agent.agent_id);
          return (
            <button
              key={agent.agent_id}
              type="button"
              onClick={() => onToggle(agent.agent_id)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-accent",
                active && "bg-accent text-accent-foreground",
              )}
            >
              <span className="truncate">{agent.agent_name}</span>
              {active ? <Badge variant="secondary">Assigned</Badge> : null}
            </button>
          );
        })}
        {list.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No agents found.</p> : null}
      </div>
    </div>
  );
}

function SubaccountPanel({
  open,
  onOpenChange,
  editing,
  agents,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Profile | null;
  agents: RetellAgent[];
}) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(editing?.full_name ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState<string[]>(
    editing?.agents.map((a) => a.retell_agent_id) ?? [],
  );
  const [numbers, setNumbers] = useState<string[]>(editing?.phone_numbers ?? []);
  const { data: retellNumbers = [] } = useQuery({ queryKey: ["retell-numbers"], queryFn: api.listRetellNumbers });

  const mutation = useMutation({
    mutationFn: async () => {
      const assignments = selected.map((id) => ({
        retell_agent_id: id,
        agent_name: agents.find((a) => a.agent_id === id)?.agent_name ?? id,
      }));
      if (!assignments.length) throw new Error("Assign at least one agent.");
      const saved = editing
        ? await api.updateSubaccount(editing.id, { full_name: fullName, agents: assignments })
        : await api.createSubaccount({ full_name: fullName, email, password, agents: assignments });
      await api.setSubaccountNumbers(saved.id, numbers);
      return saved;
    },
    onSuccess: () => {
      toast.success(editing ? "Subaccount updated" : "Subaccount created");
      void queryClient.invalidateQueries({ queryKey: ["subaccounts"] });
      onOpenChange(false);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Something went wrong."),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit subaccount" : "Create subaccount"}</SheetTitle>
        </SheetHeader>
        <form
          className="space-y-4 px-4 pb-8"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          {!editing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Temporary password</Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
                    Generate
                  </Button>
                </div>
              </div>
            </>
          ) : null}
          <div className="space-y-2">
            <Label>Assigned agents</Label>
            <AgentPicker
              agents={agents}
              selected={selected}
              onToggle={(id) =>
                setSelected(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Caller numbers for campaigns</Label>
            <div className="space-y-1 rounded-lg border border-border p-1">
              {retellNumbers.map((n) => {
                const active = numbers.includes(n.phone_number);
                return (
                  <button
                    key={n.phone_number}
                    type="button"
                    onClick={() =>
                      setNumbers(active ? numbers.filter((x) => x !== n.phone_number) : [...numbers, n.phone_number])
                    }
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm tabular-nums hover:bg-accent",
                      active && "bg-accent text-accent-foreground",
                    )}
                  >
                    <span>{n.pretty}</span>
                    {active ? <Badge variant="secondary">Assigned</Badge> : null}
                  </button>
                );
              })}
              {retellNumbers.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">No phone numbers on your Retell account yet.</p>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">Optional. Without a number this client can't launch campaigns.</p>
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {editing ? "Save changes" : "Create subaccount"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function SubaccountsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setViewingAs } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Profile | null>(null);
  const [resetting, setResetting] = useState<Profile | null>(null);

  const { data: users, isLoading } = useQuery({ queryKey: ["subaccounts"], queryFn: api.listSubaccounts });
  const { data: agents = [] } = useQuery({ queryKey: ["all-agents"], queryFn: api.listAgents });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["subaccounts"] });

  return (
    <AppShell
      title="Subaccounts"
      description="Client logins and the agents they can see"
      actions={
        <Button
          className="gap-2"
          onClick={() => {
            setEditing(null);
            setPanelOpen(true);
          }}
        >
          <Plus className="size-4" /> Create Subaccount
        </Button>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !users?.length ? (
          <div className="p-12 text-center">
            <p className="text-sm text-muted-foreground">No subaccounts yet.</p>
            <Button
              className="mt-4 gap-2"
              onClick={() => {
                setEditing(null);
                setPanelOpen(true);
              }}
            >
              <Plus className="size-4" /> Create your first subaccount
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Assigned agents</th>
                  <th className="px-4 py-3 font-medium">Active</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-border transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium text-foreground">{user.full_name}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.agents.map((a) => (
                          <Badge key={a.retell_agent_id} variant="secondary" className="font-normal">
                            {a.agent_name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Switch
                        checked={user.is_active}
                        onCheckedChange={async (checked) => {
                          await api.updateSubaccount(user.id, { is_active: checked });
                          toast.success(checked ? "Account activated" : "Account deactivated");
                          void refresh();
                        }}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View as"
                          onClick={() => {
                            setViewingAs(user);
                            navigate({ to: "/dashboard" });
                          }}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          onClick={() => {
                            setEditing(user);
                            setPanelOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Reset password" onClick={() => setResetting(user)}>
                          <KeyRound className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          className="text-destructive"
                          onClick={() => setConfirmDelete(user)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {panelOpen ? (
        <SubaccountPanel
          key={editing?.id ?? "new"}
          open={panelOpen}
          onOpenChange={setPanelOpen}
          editing={editing}
          agents={agents}
        />
      ) : null}

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes their login and agent assignments permanently. Call data is unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDelete) return;
                await api.deleteSubaccount(confirmDelete.id);
                toast.success("Subaccount deleted");
                setConfirmDelete(null);
                void refresh();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!resetting} onOpenChange={(open) => !open && setResetting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset password for {resetting?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              A new temporary password will be generated and shown once. Share it securely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!resetting) return;
                const next = generatePassword();
                await api.resetSubaccountPassword(resetting.id, next);
                setResetting(null);
                toast.success(`New temporary password: ${next}`, { duration: 15000 });
              }}
            >
              Reset password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
