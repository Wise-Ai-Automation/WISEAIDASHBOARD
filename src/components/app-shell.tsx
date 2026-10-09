import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Kanban,
  Megaphone,
  Eye,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  PhoneCall,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { WiseLogo } from "@/components/wise-logo";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, adminOnly: false },
  { to: "/calls", label: "Call Logs", icon: PhoneCall, adminOnly: false },
  { to: "/pipeline", label: "Lead Pipeline", icon: Kanban, adminOnly: false },
  { to: "/analytics", label: "Analytics", icon: BarChart3, adminOnly: false },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone, adminOnly: false },
  { to: "/admin/subaccounts", label: "Subaccounts", icon: Users, adminOnly: true },
  { to: "/admin/billing", label: "Billing", icon: Wallet, adminOnly: true },
  { to: "/settings", label: "Settings", icon: Settings, adminOnly: false },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-1">
      <span className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80">
        Workspace
      </span>
      {NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => {
        const active = pathname === item.to || pathname.startsWith(item.to + "/");
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 hover:translate-x-0.5",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {active ? (
              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
            ) : null}
            <item.icon
              className={cn("size-[18px] transition-colors", active ? "text-primary" : "group-hover:text-foreground")}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="px-1">
      <WiseLogo />
    </div>
  );
}

function UserMenu() {
  const { user, signOut, viewingAs, setViewingAs } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const initials = user.full_name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="space-y-2">
      {viewingAs ? (
        <button
          onClick={() => setViewingAs(null)}
          className="flex w-full items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-left text-xs font-medium text-foreground"
        >
          <Eye className="size-3.5 shrink-0" />
          <span className="truncate">Viewing as {viewingAs.full_name}</span>
          <span className="ml-auto text-primary">Exit</span>
        </button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-sidebar-accent/60">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{user.full_name}</span>
              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center justify-between">
            Account
            <Badge variant={user.role === "admin" ? "default" : "secondary"} className="capitalize">
              {user.role}
            </Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
            <Settings className="size-4" /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={async () => {
              await signOut();
              navigate({ to: "/", replace: true });
            }}
          >
            <LogOut className="size-4" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
       <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col justify-between border-r border-sidebar-border bg-sidebar p-5 lg:flex">
        <div className="space-y-8">
          <Brand />
          <NavLinks />
        </div>
         <div className="space-y-4"><div className="flex items-center justify-between px-2 text-xs text-muted-foreground"><span>Appearance</span><ThemeToggle /></div><UserMenu /></div>
      </aside>

      <div className="lg:pl-64">
         <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
           <div className="mx-auto grid max-w-[1400px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 md:px-8 md:py-5">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-5">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-full flex-col justify-between">
                <div className="space-y-8">
                  <Brand />
                  <NavLinks onNavigate={() => setOpen(false)} />
                </div>
                 <div className="space-y-4"><div className="flex items-center justify-between px-2 text-xs text-muted-foreground"><span>Appearance</span><ThemeToggle /></div><UserMenu /></div>
              </div>
            </SheetContent>
          </Sheet>

           <div className="min-w-0">
             <h1 className="truncate font-display text-xl font-bold text-foreground md:text-2xl">{title}</h1>
            {description ? <p className="mt-0.5 truncate text-sm text-muted-foreground">{description}</p> : null}
          </div>
           <div className="flex shrink-0 items-center gap-2"><div className="hidden lg:block"><ThemeToggle /></div>{actions ? <div className="hidden items-center gap-2 sm:flex">{actions}</div> : null}</div>
          </div>
        </header>

         <main className="mx-auto max-w-[1400px] px-4 py-5 pb-28 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 md:px-8 md:py-8 lg:pb-8">
           {actions ? <div className="mb-4 flex justify-end sm:hidden">{actions}</div> : null}
          {children}
        </main>
         <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 items-center border-t border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-card backdrop-blur-xl lg:hidden">
           {NAV.filter(item => !item.adminOnly && item.to !== "/campaigns").map(item => (
             <Link key={item.to} to={item.to} className="flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground transition-colors [&.active]:text-primary" activeProps={{ className: "active" }}>
               <item.icon className="size-5" /><span>{item.label === "Call Logs" ? "Logs" : item.label === "Analytics" ? "Insights" : item.label}</span>
             </Link>
           )).slice(0, 2)}
           <Link to="/campaigns" aria-label="Create or view campaigns" title="Campaigns" className="-mt-6 mx-auto flex size-12 items-center justify-center rounded-2xl border-4 border-card bg-primary text-primary-foreground shadow-glow"><Plus className="size-5" /></Link>
           {NAV.filter(item => !item.adminOnly && item.to !== "/campaigns").slice(2).map(item => (
             <Link key={item.to} to={item.to} className="flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium text-muted-foreground transition-colors [&.active]:text-primary" activeProps={{ className: "active" }}>
               <item.icon className="size-5" /><span>{item.label === "Analytics" ? "Insights" : item.label}</span>
             </Link>
           ))}
         </nav>
      </div>
    </div>
  );
}

export function ShellSkeleton() {
  return (
    <div className="min-h-screen bg-background p-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-6 h-64 w-full" />
    </div>
  );
}
