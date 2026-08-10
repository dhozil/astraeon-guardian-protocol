import { RialoMark, SectionHeading, TempleMark } from "./primitives";
import { Brain, Plus } from "lucide-react";

const NATIVE = [
  "Native Web / API Connectivity",
  "Automation",
  "Payments",
  "Confidential Execution",
  "On-chain Verification",
  "Agent Workflows",
];

export function RialoSection() {
  return (
    <section id="rialo" className="grain relative border-t border-hairline py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <SectionHeading label="Built on Rialo" align="center" title="Built for the Rialo Era." />

        <div className="mt-16 flex flex-col items-center justify-center gap-4 lg:flex-row">
          {[
            { icon: Brain, k: "AI Intelligence" },
            { icon: TempleMark, k: "Astraeon Trust", primary: true },
            { icon: RialoMark, k: "Rialo Execution" },
          ].map(({ icon: Icon, k, primary }, i) => (
            <div key={k} className="flex items-center gap-4">
              <div
                className={`flex min-w-[220px] items-center gap-3 border px-6 py-5 ${
                  primary ? "border-gold/50 bg-gold/[0.05]" : "border-hairline bg-panel/60"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${primary ? "text-gold" : "text-silver/70"}`}
                  strokeWidth={1.1}
                />
                <span className="font-display text-[0.7rem] tracking-[0.18em] uppercase">{k}</span>
              </div>
              {i < 2 ? <Plus className="h-4 w-4 text-gold/50" /> : null}
            </div>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-xl text-center">
          <div className="rule-gold" />
          <p className="mt-6 font-display text-sm tracking-[0.24em] text-champagne uppercase sm:text-base">
            Autonomous Economic Infrastructure
          </p>
        </div>

        <div className="mt-16 grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          {NATIVE.map((n) => (
            <div key={n} className="panel-hover flex items-center gap-3 bg-panel/60 px-6 py-5">
              <span className="h-1.5 w-1.5 rotate-45 bg-gold/70" />
              <p className="text-[0.68rem] tracking-[0.14em] text-foreground/90 uppercase">{n}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-[0.6rem] tracking-[0.16em] text-muted-foreground/70 uppercase">
          Astraeon is an independent protocol. Built on Rialo.
        </p>
      </div>
    </section>
  );
}
