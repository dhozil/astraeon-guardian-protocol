import { SectionHeading } from "./primitives";

const POLICY: Array<[string, string, "gold" | "plain" | "alert"]> = [
  ["agent", "TradingBot-01", "gold"],
  ["allow", "BTC, ETH", "plain"],
  ["max_per_transaction", "$100", "plain"],
  ["max_daily_spend", "$500", "plain"],
  ["max_slippage", "1%", "plain"],
  ["withdrawals", "DISABLED", "alert"],
  ["approved_destinations", "VERIFIED ONLY", "plain"],
  ["risk_limit", "60", "plain"],
];

export function PolicyEngine() {
  return (
    <section className="relative border-t border-hairline py-24 lg:py-32">
      <div className="mx-auto grid max-w-[1400px] gap-14 px-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-10">
        <SectionHeading
          label="Policy Engine"
          title="Programmable Trust"
          description="Policies are declarative, versioned, and enforced before execution — not audited after the fact. Every clause is a boundary the agent physically cannot cross."
        />

        <div className="border border-hairline bg-panel/70 shadow-[var(--shadow-panel)]">
          <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
            <p className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground">
              policies / tradingbot-01.policy
            </p>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 bg-gold/60" />
              <span className="h-1.5 w-1.5 bg-silver/40" />
              <span className="h-1.5 w-1.5 bg-silver/25" />
            </div>
          </div>

          <div className="grid grid-cols-[38px_1fr] font-mono text-[0.72rem]">
            <div className="border-r border-hairline py-5 text-center text-muted-foreground/40">
              {POLICY.map((_, i) => (
                <p key={i} className="leading-7">
                  {String(i + 1).padStart(2, "0")}
                </p>
              ))}
            </div>
            <div className="py-5 pl-5">
              {POLICY.map(([k, v, tone]) => (
                <p key={k} className="flex items-baseline gap-3 leading-7">
                  <span className="w-[13rem] shrink-0 text-muted-foreground">{k}:</span>
                  <span
                    className={
                      tone === "gold"
                        ? "text-gold"
                        : tone === "alert"
                          ? "text-crimson"
                          : "text-foreground"
                    }
                  >
                    {v}
                  </span>
                </p>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gold/25 bg-gold/[0.04] px-5 py-4">
            <p className="label-micro">Policy Status</p>
            <span className="flex items-center gap-2 text-[0.68rem] tracking-[0.2em] text-ok uppercase">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-ok" /> Active
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
