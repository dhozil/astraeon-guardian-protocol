import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function TempleMark({ className }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("h-7 w-7 text-gold", className)}
    >
      <path d="M16 3 3 9.5h26L16 3Z" stroke="currentColor" strokeWidth="1" />
      <path d="M4 12h24" stroke="currentColor" strokeWidth="1" />
      <path
        d="M7 12v13M12 12v13M16 12v13M20 12v13M25 12v13"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.85"
      />
      <path d="M3 27h26M5 29.5h22" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function RialoMark({ className }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cn("h-4 w-4", className)}>
      <path
        d="M7 20V4h6.2a4.4 4.4 0 0 1 0 8.8H7"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinejoin="miter"
      />
      <path d="M12 12.8 17.5 20" stroke="currentColor" strokeWidth="2.1" />
    </svg>
  );
}

export function MicroLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("label-micro", className)}>{children}</p>;
}

export function SectionHeading({
  label,
  title,
  description,
  align = "left",
  className,
}: {
  label?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn("max-w-2xl", align === "center" && "mx-auto max-w-3xl text-center", className)}
    >
      {label ? (
        <div className={cn("flex items-center gap-3", align === "center" && "justify-center")}>
          <span className="h-px w-8 bg-gold/50" />
          <MicroLabel className="text-gold/80">{label}</MicroLabel>
        </div>
      ) : null}
      <h2 className="mt-5 text-3xl leading-[1.15] tracking-wide uppercase sm:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>
      {description ? (
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function GoldButton({
  children,
  href = "#",
  className,
}: {
  children: ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 border border-gold/60 bg-[image:var(--gradient-gold)] px-6 py-3 text-[0.7rem] font-semibold tracking-[0.2em] text-primary-foreground uppercase transition-all duration-300 hover:brightness-110",
        className,
      )}
    >
      {children}
    </a>
  );
}

export function GhostButton({
  children,
  href = "#",
  className,
}: {
  children: ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center gap-2 border border-hairline bg-panel/60 px-6 py-3 text-[0.7rem] font-semibold tracking-[0.2em] text-foreground/90 uppercase transition-colors duration-300 hover:border-gold/50 hover:text-gold",
        className,
      )}
    >
      {children}
    </a>
  );
}

export function Corners({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)}>
      <span className="absolute top-0 left-0 h-3 w-3 border-t border-l border-gold/50" />
      <span className="absolute top-0 right-0 h-3 w-3 border-t border-r border-gold/50" />
      <span className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-gold/50" />
      <span className="absolute right-0 bottom-0 h-3 w-3 border-r border-b border-gold/50" />
    </span>
  );
}
