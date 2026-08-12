import { SectionHeading, GoldButton } from "./primitives";
import { ArrowUpRight } from "lucide-react";

const STEPS = [
  {
    n: "01",
    title: "Agent Requests",
    body: "An agent — or the operator — submits an action: a buy, a swap, an API call, a transfer. It asks for a path, never for a credential.",
  },
  {
    n: "02",
    title: "Guard Evaluates",
    body: "Astraeon checks identity, permissions, policy, budgets, velocity, and destinations — every check passes or fails with a reason.",
  },
  {
    n: "03",
    title: "Risk Scores",
    body: "The risk engine rates the action 0–100, from SAFE to CRITICAL. High-risk actions route to approvals or are blocked outright.",
  },
  {
    n: "04",
    title: "Executes on Rialo",
    body: "Allowed actions execute on-chain through the deployed guard program — a signed transaction on Rialo DevNet.",
  },
  {
    n: "05",
    title: "Audited & Verifiable",
    body: "Every action is logged. Real transactions can be verified on-chain: block, fee, and program logs straight from the node.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative border-t border-hairline py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <SectionHeading
          label="How It Works"
          title={
            <>
              From Request to
              <br />
              Verifiable Execution
            </>
          }
          description="Every action an agent takes flows through the same pipeline — bounded at each step, recorded end to end."
        />

        <div className="mt-16 grid gap-px border border-hairline bg-hairline md:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s) => (
            <article
              key={s.n}
              className="group relative bg-panel/60 px-6 py-8 transition-colors duration-500 hover:bg-panel-2/70"
            >
              <span className="absolute inset-x-0 top-0 h-px scale-x-0 bg-[image:var(--gradient-gold)] transition-transform duration-500 group-hover:scale-x-100" />
              <span className="font-display text-[0.72rem] tracking-[0.24em] text-gold/70">
                {s.n}
              </span>
              <h3 className="mt-6 text-[0.74rem] tracking-[0.18em] text-foreground uppercase">
                {s.title}
              </h3>
              <p className="mt-3 text-[0.7rem] leading-relaxed text-muted-foreground">{s.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border border-hairline bg-panel/40 px-6 py-5">
          <p className="max-w-xl text-[0.72rem] leading-relaxed text-muted-foreground">
            The boundary is enforced on-chain by a deployed Rialo guard program — the decision is
            made by the chain, and the frontend can only ask.
          </p>
          <GoldButton href="/command-center">
            Try the Pipeline <ArrowUpRight className="h-3.5 w-3.5" />
          </GoldButton>
        </div>
      </div>
    </section>
  );
}
