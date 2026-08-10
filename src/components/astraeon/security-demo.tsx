import { Ban, Check } from "lucide-react";
import { SectionHeading } from "./primitives";

function Row({
  k,
  v,
  tone = "default",
}: {
  k: string;
  v: string;
  tone?: "default" | "ok" | "alert";
}) {
  return (
    <div className="flex items-center justify-between border-b border-hairline py-3 last:border-b-0">
      <span className="text-[0.58rem] tracking-[0.18em] text-muted-foreground uppercase">{k}</span>
      <span
        className={`text-[0.68rem] tracking-[0.12em] uppercase ${
          tone === "ok" ? "text-ok" : tone === "alert" ? "text-crimson" : "text-foreground"
        }`}
      >
        {v}
      </span>
    </div>
  );
}

function Meter({ value, alert }: { value: number; alert?: boolean }) {
  return (
    <div className="mt-1 h-[3px] w-full bg-hairline">
      <div
        className={`h-full ${alert ? "bg-crimson/80" : "bg-ok/80"}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function SecurityDemo() {
  return (
    <section className="relative border-t border-hairline py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <SectionHeading
          label="Demonstration"
          align="center"
          title="Autonomy Meets Control"
          description="One agent, two requests. The boundary decides what reaches the real world."
        />

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 lg:grid-cols-2">
          {/* Normal */}
          <div className="relative border border-hairline bg-panel/60 p-7">
            <div className="flex items-center justify-between">
              <p className="label-micro text-ok/80">Normal Action</p>
              <span className="flex h-6 w-6 items-center justify-center border border-ok/40 text-ok">
                <Check className="h-3 w-3" />
              </span>
            </div>
            <div className="mt-6 flex items-end gap-3">
              <h3 className="font-display text-2xl tracking-[0.1em]">BUY BTC</h3>
              <span className="pb-1 text-sm text-muted-foreground">$75</span>
            </div>
            <div className="mt-7">
              <Row k="Policy" v="Passed" tone="ok" />
              <div className="border-b border-hairline py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[0.58rem] tracking-[0.18em] text-muted-foreground uppercase">
                    Risk
                  </span>
                  <span className="text-[0.68rem] text-foreground">18 / 100</span>
                </div>
                <Meter value={18} />
              </div>
              <Row k="Simulation" v="Passed" tone="ok" />
              <Row k="Status" v="Executed" tone="ok" />
            </div>
          </div>

          {/* Dangerous */}
          <div className="relative border border-crimson/30 bg-[color-mix(in_oklab,var(--crimson)_6%,var(--panel))] p-7">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_9px,color-mix(in_oklab,var(--crimson)_9%,transparent)_9px,color-mix(in_oklab,var(--crimson)_9%,transparent)_10px)] opacity-40"
            />
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="label-micro text-crimson/80">Dangerous Action</p>
                <span className="flex h-6 w-6 items-center justify-center border border-crimson/40 text-crimson">
                  <Ban className="h-3 w-3" />
                </span>
              </div>
              <div className="mt-6 flex items-end gap-3">
                <h3 className="font-display text-2xl tracking-[0.1em]">WITHDRAW</h3>
                <span className="pb-1 text-sm text-muted-foreground">$1,000</span>
              </div>
              <div className="mt-7">
                <Row k="Policy" v="Withdrawals disabled" tone="alert" />
                <div className="border-b border-hairline py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.58rem] tracking-[0.18em] text-muted-foreground uppercase">
                      Risk
                    </span>
                    <span className="text-[0.68rem] text-crimson">98 / 100</span>
                  </div>
                  <Meter value={98} alert />
                </div>
                <Row k="Status" v="Blocked" tone="alert" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
