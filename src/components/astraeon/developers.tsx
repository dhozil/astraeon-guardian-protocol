import { GhostButton, SectionHeading } from "./primitives";

const SDKS = [
  { name: "TypeScript", cmd: "npm i @astraeon/sdk" },
  { name: "Python", cmd: "pip install astraeon" },
  { name: "Rust", cmd: "cargo add astraeon" },
];

const METHODS = [
  "createAgent()",
  "createPolicy()",
  "grantPermission()",
  "simulate()",
  "execute()",
  "pauseAgent()",
  "revokePermission()",
  "getRiskScore()",
  "getAuditLog()",
];

export function Developers() {
  return (
    <section id="developers" className="relative border-t border-hairline py-24 lg:py-32">
      <div className="mx-auto grid max-w-[1400px] gap-14 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
        <div>
          <SectionHeading
            label="Developers"
            title={
              <>
                Build Agents.
                <br />
                Not Security Systems.
              </>
            }
            description="Astraeon provides the primitives developers need to safely deploy autonomous agents."
          />
          <div className="mt-10 grid gap-px border border-hairline bg-hairline">
            {SDKS.map((s) => (
              <div
                key={s.name}
                className="panel-hover flex items-center justify-between bg-panel/60 px-5 py-4"
              >
                <span className="text-[0.68rem] tracking-[0.18em] uppercase">{s.name}</span>
                <code className="font-mono text-[0.65rem] text-gold/80">{s.cmd}</code>
              </div>
            ))}
          </div>
          <GhostButton href="#developers" className="mt-8">
            Read Documentation
          </GhostButton>
        </div>

        <div className="border border-hairline bg-panel/70">
          <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
            <p className="label-micro">API Surface</p>
            <p className="font-mono text-[0.6rem] text-muted-foreground">v1.0 · stable</p>
          </div>
          <div className="grid gap-px bg-hairline sm:grid-cols-2">
            {METHODS.map((m) => (
              <div
                key={m}
                className="group flex items-center gap-3 bg-panel/60 px-5 py-4 transition-colors hover:bg-panel-2/70"
              >
                <span className="h-1 w-1 bg-gold/60 transition-transform group-hover:scale-150" />
                <code className="font-mono text-[0.72rem] text-foreground/90">{m}</code>
              </div>
            ))}
          </div>
          <div className="border-t border-hairline px-5 py-6 font-mono text-[0.68rem] leading-6 text-muted-foreground">
            <p>
              <span className="text-gold/80">const</span> agent ={" "}
              <span className="text-silver">await</span> astraeon.createAgent
              {"({"}
            </p>
            <p className="pl-5">
              name: <span className="text-champagne">&quot;TradingBot-01&quot;</span>,
            </p>
            <p className="pl-5">policy: tradingPolicy,</p>
            <p className="pl-5">limits: {"{ perTx: 100, daily: 500 }"}</p>
            <p>{"});"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
