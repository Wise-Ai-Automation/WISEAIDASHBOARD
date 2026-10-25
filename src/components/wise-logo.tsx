import { cn } from "@/lib/utils";

/** ONEWISE AI mark: the brand's "1" + maple-leaf icon. */
export function WiseMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/onewise-mark.png"
      alt="ONEWISE AI"
      className={cn("size-10 rounded-[11px] bg-white object-contain p-0.5", className)}
    />
  );
}

export function WiseLogo({ subtitle = "Voice analytics", invert = false }: { subtitle?: string; invert?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <WiseMark className="shadow-glow" />
      <div className="leading-tight">
        <div className={cn("font-display text-[15px] font-extrabold tracking-tight", invert ? "text-primary-foreground" : "text-[#0D2A54] dark:text-white")}>
          onewise<span className={invert ? "text-primary-foreground/70" : "text-[#E6001E]"}>AI</span>
        </div>
        <div className={cn("text-xs", invert ? "text-primary-foreground/65" : "text-muted-foreground")}>{subtitle}</div>
      </div>
    </div>
  );
}
