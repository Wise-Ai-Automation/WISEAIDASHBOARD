import { cn } from "@/lib/utils";

/** WISE AI mark: a stylised "W" made of voice-wave strokes inside a gradient tile. */
export function WiseMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-10", className)} role="img" aria-label="Wise AI">
      <defs>
        <linearGradient id="wise-g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="oklch(0.55 0.25 277)" />
          <stop offset="1" stopColor="oklch(0.56 0.24 300)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#wise-g)" />
      <path
        d="M9 13 L14.5 28 L20 17 L25.5 28 L31 13"
        fill="none"
        stroke="white"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="31" cy="13" r="2.4" fill="white" opacity="0.9" />
    </svg>
  );
}

export function WiseLogo({ subtitle = "Voice analytics", invert = false }: { subtitle?: string; invert?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <WiseMark className="shadow-glow rounded-[11px]" />
      <div className="leading-tight">
        <div className={cn("font-display text-[15px] font-extrabold tracking-tight", invert ? "text-primary-foreground" : "text-foreground")}>
          WISE <span className={invert ? "text-primary-foreground/70" : "text-primary"}>AI</span>
        </div>
        <div className={cn("text-xs", invert ? "text-primary-foreground/65" : "text-muted-foreground")}>{subtitle}</div>
      </div>
    </div>
  );
}
