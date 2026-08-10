import {
  Activity,
  Fingerprint,
  Gauge,
  KeyRound,
  Landmark,
  OctagonPause,
  ScrollText,
  ScanEye,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { SectionHeading } from "./primitives";

const FEATURES = [
  {
    n: "01",
    icon: Fingerprint,
    title: "Agent Identity",
    body: "Every autonomous agent receives a verifiable identity and scoped authority.",
  },
  {
    n: "02",
    icon: ShieldCheck,
    title: "Policy Engine",
    body: "Define exactly what an agent can do, where, when, and under which conditions.",
  },
  {
    n: "03",
    icon: Gauge,
    title: "Risk Engine",
    body: "Evaluate transaction risk before execution.",
  },
  {
    n: "04",
    icon: KeyRound,
    title: "Credential Gateway",
    body: "Agents never need direct access to sensitive API credentials.",
  },
  {
    n: "05",
    icon: ScanEye,
    title: "Transaction Guard",
    body: "Inspect and validate actions before they reach the execution layer.",
  },
  {
    n: "06",
    icon: Wallet,
    title: "Spending Limits",
    body: "Set per-transaction, daily, weekly, or monthly economic boundaries.",
  },
  {
    n: "07",
    icon: Activity,
    title: "Anomaly Detection",
    body: "Detect unusual behavior and automatically pause dangerous agents.",
  },
  {
    n: "08",
    icon: OctagonPause,
    title: "Emergency Brake",
    body: "Instantly revoke permissions and freeze autonomous activity.",
  },
  {
    n: "09",
    icon: ScrollText,
    title: "Audit Trail",
    body: "Every important action becomes observable and verifiable.",
  },
  {
    n: "10",
    icon: Landmark,
    title: "Agent Reputation",
    body: "Build trust based on historical performance and behavior.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative border-t border-hairline py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <SectionHeading
          label="Capabilities"
          title={
            <>
              Autonomy,
              <br />
              Without Unbounded Power.
            </>
          }
          description="Agents can act independently. Astraeon makes sure they act within enforceable boundaries."
        />

        <div className="mt-16 grid gap-px border-t border-l border-hairline sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map(({ n, icon: Icon, title, body }) => (
            <article
              key={n}
              className="group relative border-r border-b border-hairline bg-panel/40 px-5 py-7 transition-colors duration-500 hover:bg-panel-2/70"
            >
              <span className="absolute inset-x-0 top-0 h-px scale-x-0 bg-[image:var(--gradient-gold)] transition-transform duration-500 group-hover:scale-x-100" />
              <div className="flex items-start justify-between">
                <Icon className="h-5 w-5 text-gold/75" strokeWidth={1.1} />
                <span className="font-display text-[0.7rem] tracking-[0.2em] text-muted-foreground/60">
                  {n}
                </span>
              </div>
              <h3 className="mt-6 text-[0.72rem] tracking-[0.18em] text-foreground uppercase">
                {title}
              </h3>
              <p className="mt-3 text-[0.7rem] leading-relaxed text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
