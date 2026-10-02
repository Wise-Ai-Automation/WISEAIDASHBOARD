import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Loader2, Megaphone, Plus, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const SAMPLE_CSV_CONTENT = `phone,name,email,company,notes
+14155552671,Alex Johnson,alex@example.com,Acme Corp,Requested callback regarding enterprise plan
+12125550198,Sarah Williams,sarah@example.com,Nexus Media,Follow-up on product demo
+13125558832,Michael Brown,michael@example.com,Peak Solutions,Interested in voice agent integration
`;

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV_CONTENT], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "sample-campaign-contacts.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success("Sample CSV downloaded");
}
import { AppShell } from "@/components/app-shell";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { guessColumn, normalizePhone, parseCsv, toVarKey } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";
import type { CampaignContactInput } from "@/lib/types";

export const Route = createFileRoute("/campaigns")({
  head: () => ({
    meta: [
      { title: "Campaigns | Voice Agent Dashboard" },
      { name: "description", content: "Launch bulk outbound calling campaigns with your voice agents from a CSV." },
      { property: "og:title", content: "Campaigns | Voice Agent Dashboard" },
      { property: "og:description", content: "Upload a contact list and let your voice agent call everyone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <CampaignsPage />
    </RequireAuth>
  ),
});

const NONE = "__none__";

function CampaignsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [open, setOpen] = useState(false);
  const { data: campaigns, isLoading } = useQuery({ queryKey: ["campaigns"], queryFn: api.listCampaigns });

  return (
    <AppShell
      title="Campaigns"
      description="Upload a contact list and your agent calls everyone on it"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadSampleCsv}>
            <Download className="size-4" /> Sample CSV
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> New campaign
          </Button>
        </div>
      }
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !campaigns?.length ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Megaphone className="size-6" />
            </div>
            <p className="font-display text-base font-semibold text-foreground">No campaigns yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Upload a CSV of contacts to start calling.</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button variant="outline" className="gap-2" onClick={downloadSampleCsv}>
                <Download className="size-4" /> Download sample CSV
              </Button>
              <Button className="gap-2" onClick={() => setOpen(true)}>
                <Plus className="size-4" /> Create your first campaign
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Campaign</th>
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Caller number</th>
                  <th className="px-4 py-3 text-right font-medium">Contacts</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-t border-border transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {c.name}
                      {isAdmin && c.user_id !== user?.id ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">(client)</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{c.agent_name}</td>
                    <td className="px-4 py-3 tabular-nums">{c.from_number}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.total_contacts.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="capitalize">{c.status}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDateTime(new Date(c.created_at).getTime())}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Call results show up in Call Logs and Analytics as the agent works through the list.
      </p>
      {open ? <NewCampaignSheet open={open} onOpenChange={setOpen} /> : null}
    </AppShell>
  );
}

function NewCampaignSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient();
  const { data: options, isLoading } = useQuery({ queryKey: ["campaign-options"], queryFn: api.getCampaignOptions });
  const [name, setName] = useState("");
  const [agentId, setAgentId] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [phoneCol, setPhoneCol] = useState(-1);
  const [nameCol, setNameCol] = useState(-1);
  const [emailCol, setEmailCol] = useState(-1);
  const [confirming, setConfirming] = useState(false);

  const contacts = useMemo(() => {
    if (phoneCol < 0) return { valid: [] as CampaignContactInput[], invalid: rows.length };
    const valid: CampaignContactInput[] = [];
    const seen = new Set<string>();
    let invalid = 0;
    for (const r of rows) {
      const phone = normalizePhone(r[phoneCol] ?? "");
      if (!phone || seen.has(phone)) {
        invalid++;
        continue;
      }
      seen.add(phone);
      const vars: Record<string, string> = {};
      headers.forEach((h, i) => {
        if (i !== phoneCol && i !== nameCol && i !== emailCol) vars[toVarKey(h)] = (r[i] ?? "").trim();
      });
      valid.push({
        phone,
        name: nameCol >= 0 ? (r[nameCol] ?? "").trim() : "",
        email: emailCol >= 0 ? (r[emailCol] ?? "").trim() : "",
        vars,
      });
    }
    return { valid, invalid };
  }, [rows, headers, phoneCol, nameCol, emailCol]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("That file is larger than 5 MB.");
      return;
    }
    const parsed = parseCsv(await file.text());
    if (!parsed.headers.length || !parsed.rows.length) {
      toast.error("That file has no rows.");
      return;
    }
    setFileName(file.name);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setPhoneCol(guessColumn(parsed.headers, [/phone/i, /mobile/i, /cell/i, /tel/i, /number/i]));
    setNameCol(guessColumn(parsed.headers, [/^name$/i, /full.?name/i, /first.?name/i, /name/i]));
    setEmailCol(guessColumn(parsed.headers, [/e-?mail/i]));
    if (!name) setName(file.name.replace(/\.csv$/i, ""));
  }

  const mutation = useMutation({
    mutationFn: () =>
      api.createCampaign({ name: name.trim(), agent_id: agentId, from_number: fromNumber, contacts: contacts.valid }),
    onSuccess: (c) => {
      toast.success(`Campaign started — calling ${c.total_contacts} contacts`);
      void queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Something went wrong."),
  });

  const noNumbers = !isLoading && options && options.numbers.length === 0;
  const canLaunch = name.trim() && agentId && fromNumber && contacts.valid.length > 0 && !mutation.isPending;

  const columnSelect = (label: string, value: number, set: (n: number) => void, required = false) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={String(value < 0 ? NONE : value)} onValueChange={(v) => set(v === NONE ? -1 : Number(v))}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {!required ? <SelectItem value={NONE}>Not in file</SelectItem> : <SelectItem value={NONE}>Choose column</SelectItem>}
          {headers.map((h, i) => (
            <SelectItem key={i} value={String(i)}>
              {h || `Column ${i + 1}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>New campaign</SheetTitle>
        </SheetHeader>
        <form
          className="space-y-5 px-4 pb-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (canLaunch) setConfirming(true);
          }}
        >
          {noNumbers ? (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              No caller number is assigned to your account yet. Ask your admin to assign one before launching.
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="cname">Campaign name</Label>
            <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. October follow-ups" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Voice agent</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? "Loading…" : "Choose an agent"} />
                </SelectTrigger>
                <SelectContent>
                  {options?.agents.map((a) => (
                    <SelectItem key={a.retell_agent_id} value={a.retell_agent_id}>
                      {a.agent_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Call from</Label>
              <Select value={fromNumber} onValueChange={setFromNumber}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? "Loading…" : "Choose a number"} />
                </SelectTrigger>
                <SelectContent>
                  {options?.numbers.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Contact list (CSV)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={downloadSampleCsv}
              >
                <Download className="size-3.5" /> Download sample CSV
              </Button>
            </div>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center transition hover:border-primary/50 hover:bg-primary/5">
              {fileName ? <FileSpreadsheet className="size-6 text-primary" /> : <Upload className="size-6 text-muted-foreground" />}
              <span className="text-sm font-medium text-foreground">{fileName || "Click to upload a CSV file"}</span>
              <span className="text-xs text-muted-foreground">
                {fileName ? `${rows.length.toLocaleString()} rows` : "Columns like phone, name, email, and any custom variables"}
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => void onFile(e.target.files?.[0])}
              />
            </label>
          </div>

          {headers.length ? (
            <div className="space-y-4 rounded-xl border border-border p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {columnSelect("Phone column", phoneCol, setPhoneCol, true)}
                {columnSelect("Name column", nameCol, setNameCol)}
                {columnSelect("Email column", emailCol, setEmailCol)}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                  {contacts.valid.length.toLocaleString()} will be called
                </Badge>
                {contacts.invalid ? (
                  <Badge variant="secondary">{contacts.invalid.toLocaleString()} skipped (missing, invalid or duplicate phone)</Badge>
                ) : null}
              </div>
              {headers.length > 1 ? (
                <p className="text-xs text-muted-foreground">
                  Every other column is passed to the agent as a variable you can use in its prompt, e.g.{" "}
                  <code className="rounded bg-muted px-1">{"{{name}}"}</code>
                  {headers
                    .filter((_, i) => i !== phoneCol && i !== nameCol && i !== emailCol)
                    .slice(0, 3)
                    .map((h) => (
                      <span key={h}>
                        , <code className="rounded bg-muted px-1">{`{{${toVarKey(h)}}}`}</code>
                      </span>
                    ))}
                  .
                </p>
              ) : null}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Phone</th>
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.valid.slice(0, 5).map((c) => (
                      <tr key={c.phone} className="border-t border-border">
                        <td className="px-3 py-2 tabular-nums">{c.phone}</td>
                        <td className="px-3 py-2">{c.name || "—"}</td>
                        <td className="px-3 py-2">{c.email || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <Button type="submit" className="w-full gap-2" disabled={!canLaunch}>
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Megaphone className="size-4" />}
            Launch campaign
          </Button>
        </form>

        <AlertDialog open={confirming} onOpenChange={setConfirming}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start calling {contacts.valid.length.toLocaleString()} people now?</AlertDialogTitle>
              <AlertDialogDescription>
                Your agent will begin calling immediately from {fromNumber}. Retell charges per call minute.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => mutation.mutate()}>Start calling</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}
