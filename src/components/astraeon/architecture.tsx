import { ArrowRight, Boxes, Globe, Link2, Brain } from "lucide-react";
import { SectionHeading, TempleMark } from "./primitives";

const NODES = [
  { icon: Brain, title: "AI Agents", sub: "Autonomous Agents" },
  { icon: TempleMark, title: "Astraeon", sub: "Trust & Execution Layer", primary: true },
  { icon: Link2, title: "Rialo (REX)", sub: "Confidential Execution" },
  { icon: Globe, title: "Real World", sub: "APIs, Data, Payments, IoT, Web2" },
  { icon: Boxes, title: "On-Chain", sub: "Verification & Audit Trail" },
];

function Connector() {
  return (
    <div className="relative hidden h-px w-full min-w-6 flex-1 items-center bg-gold/25 lg:flex">
      <span className="flow-particle absolute h-1 w-1 rounded-full bg-gold shadow-[0_0_8px_var(--gold)]" />
      <ArrowRight className="absolute right-0 h-3 w-3 -translate-y-1/2 text-gold/60" />
    </div>
  );
}

export function Architecture() {
  return (
    <section id="architecture" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <SectionHeading
            label="Architecture"
            title={
              <>
                A New Standard for
                <br />
                Agent Trust
              </>
            }
            description="Astraeon sits between your agents and the real world, enforcing policies, securing credentials, and guaranteeing that every action is safe, compliant, and verifiable."
          />

          <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
            {NODES.map(({ icon: Icon, title, sub, primary }, i) => (
              <div key={title} className="flex flex-1 items-center gap-3">
                <div
                  className={`panel-hover relative flex-1 border px-4 py-6 text-center ${
                    primary
                      ? "border-gold/55 bg-gold/[0.06] shadow-[0_0_40px_-20px_var(--gold)]"
                      : "border-hairline bg-panel/60"
                  }`}
                >
                  <Icon
                    className={`mx-auto h-6 w-6 ${primary ? "text-gold" : "text-silver/70"}`}
                    strokeWidth={1.1}
                  />
                  <p
                    className={`mt-4 font-display text-[0.72rem] tracking-[0.18em] uppercase ${
                      primary ? "text-gold" : "text-foreground"
                    }`}
                  >
                    {title}
                  </p>
                  <p className="mt-2 text-[0.62rem] leading-relaxed text-muted-foreground">{sub}</p>
                </div>
                {i < NODES.length - 1 ? <Connector /> : null}
              </div>
            ))}
          </div>
        </div>

        <a
          href="#features"
          className="mt-14 inline-flex items-center gap-3 text-[0.66rem] font-semibold tracking-[0.22em] text-gold uppercase transition-colors hover:text-champagne"
        >
          Explore Architecture <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </section>
  );
}
