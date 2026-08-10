import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { RiskTier, Verdict, AgentStatus } from "@/lib/astraeon/types";

export function toneTier(tier: RiskTier): string {
  switch (tier) {
    case "SAFE":
    case "LOW":
      return "text-ok";
    case "MEDIUM":
      return "text-warn";
    case "HIGH":
    case "CRITICAL":
      return "text-crimson";
  }
}

export function toneVerdict(verdict: Verdict): string {
  if (verdict === "ALLOW") return "text-ok";
  if (verdict === "APPROVAL_REQUIRED") return "text-warn";
  return "text-crimson";
}

export function toneStatus(status: AgentStatus): string {
  if (status === "ACTIVE") return "text-ok";
  if (status === "PAUSED") return "text-crimson";
  return "text-muted-foreground";
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border border-hairline bg-panel/50", className)}>{children}</div>;
}

export function PanelTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
      <p className="label-micro">{children}</p>
      {right}
    </div>
  );
}

export function Pill({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "ok" | "warn" | "alert" | "muted" | "gold";
}) {
  const map: Record<string, string> = {
    ok: "border-ok/40 text-ok",
    warn: "border-warn/40 text-warn",
    alert: "border-crimson/40 text-crimson",
    gold: "border-gold/40 text-gold",
    muted: "border-hairline text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 text-[0.55rem] font-medium tracking-[0.14em] uppercase",
        map[tone],
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({ className }: { className?: string }) {
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full bg-current", className)} />;
}

export function Th({ children }: { children: ReactNode }) {
  return (
    <th className="border-b border-hairline px-5 py-3 text-left text-[0.55rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td
      className={cn(
        "border-b border-hairline px-5 py-3.5 text-[0.72rem] text-foreground",
        className,
      )}
    >
      {children}
    </td>
  );
}

export function GhostButton({
  children,
  onClick,
  tone = "default",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "default" | "alert" | "gold";
  disabled?: boolean | undefined;
}) {
  const map: Record<string, string> = {
    default: "border-hairline text-foreground/90 hover:border-gold/50 hover:text-gold",
    alert: "border-crimson/40 text-crimson hover:bg-crimson/10",
    gold: "border-gold/50 text-gold hover:bg-gold/10",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 border bg-transparent px-3 py-1.5 text-[0.6rem] font-semibold tracking-[0.18em] uppercase transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40",
        map[tone],
      )}
    >
      {children}
    </button>
  );
}

export function GoldSolidButton({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean | undefined;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 border border-gold/60 bg-[image:var(--gradient-gold)] px-5 py-2.5 text-[0.65rem] font-semibold tracking-[0.2em] text-primary-foreground uppercase transition-all duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full border border-hairline bg-background/60 px-3 py-2 text-[0.72rem] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-gold/60",
        className,
      )}
    />
  );
}

export function Select({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full cursor-pointer border border-hairline bg-background/60 px-3 py-2 text-[0.72rem] text-foreground outline-none focus:border-gold/60",
        className,
      )}
    >
      {children}
    </select>
  );
}
