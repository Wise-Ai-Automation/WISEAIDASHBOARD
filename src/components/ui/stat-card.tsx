import { ArrowDown, ArrowUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  delta?: number | null;
  /** When true, a downward movement is the good outcome. */
  invertDelta?: boolean;
  loading?: boolean;
}

export function StatCard({ label, value, icon, delta, invertDelta, loading }: StatCardProps) {
  const positive = delta != null && (invertDelta ? delta < 0 : delta > 0);

  return (
    <div className="group relative min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase text-muted-foreground sm:text-xs">{label}</span>
        {icon ? (
          <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground ring-1 ring-primary/10 transition-colors group-hover:bg-primary group-hover:text-primary-foreground sm:flex [&_svg]:size-4">
            {icon}
          </span>
        ) : null}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-9 w-28" />
      ) : (
        <div className="num mt-2 break-words font-display text-xl font-bold leading-tight text-foreground sm:text-[28px]">
          {value}
        </div>
      )}
      {delta != null && !loading ? (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span
            className={cn(
              "num inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold",
              positive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
            )}
          >
            {delta >= 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
           <span className="hidden text-muted-foreground sm:inline">vs previous period</span>
        </div>
      ) : null}
    </div>
  );
}
