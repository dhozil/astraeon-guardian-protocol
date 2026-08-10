import { BadgeCheck, Globe2, ShieldHalf, SlidersHorizontal } from "lucide-react";

const ITEMS = [
  {
    icon: ShieldHalf,
    title: "Secure by Design",
    body: "Policy-driven execution with granular permissions.",
  },
  {
    icon: BadgeCheck,
    title: "Verifiable Actions",
    body: "Every action is recorded, verified, and auditable.",
  },
  {
    icon: Globe2,
    title: "Real World Connectivity",
    body: "Native access to APIs, data, payments, and more.",
  },
  {
    icon: SlidersHorizontal,
    title: "Autonomy with Control",
    body: "Empower agents without sacrificing security.",
  },
];

export function TrustStrip() {
  return (
    <section className="grain relative border-y border-gold/20 bg-background/60">
      <div className="rule-gold absolute inset-x-0 top-0" />
      <div className="mx-auto grid max-w-[1400px] gap-px px-5 py-10 lg:grid-cols-[1.1fr_repeat(4,minmax(0,1fr))] lg:gap-0 lg:px-10">
        <div className="flex items-start gap-4 pr-8">
          <svg
            viewBox="0 0 24 32"
            fill="none"
            aria-hidden="true"
            className="mt-1 h-8 w-6 shrink-0 text-gold/70"
          >
            <path
              d="M12 31C6 26 3 20 4 12c3 1 6 3 8 6 2-3 5-5 8-6 1 8-2 14-8 19Z"
              stroke="currentColor"
              strokeWidth="0.9"
            />
            <path d="M12 31V14" stroke="currentColor" strokeWidth="0.9" />
          </svg>
          <h2 className="max-w-xs text-sm leading-[1.6] tracking-[0.14em] text-foreground uppercase sm:text-base">
            Astraeon ensures your AI agents act within boundaries, every time.
          </h2>
        </div>
        {ITEMS.map(({ icon: Icon, title, body }) => (
          <div key={title} className="px-0 py-4 lg:border-l lg:border-hairline lg:px-7 lg:py-0">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-gold/80" strokeWidth={1.2} />
              <p className="text-[0.66rem] font-semibold tracking-[0.16em] uppercase">{title}</p>
            </div>
            <p className="mt-3 max-w-[15rem] text-[0.72rem] leading-relaxed text-muted-foreground">
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
