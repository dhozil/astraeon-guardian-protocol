import { useMemo } from "react";
import { ArrowUpRight } from "lucide-react";
import { useAstraeon } from "@/lib/astraeon/store";
import { SectionHeading, GoldButton } from "./primitives";

function tone(v: string) {
  if (["ACTIVE", "LOW", "SAFE", "EXECUTED"].includes(v)) return "text-ok";
  if (["WARNING", "MEDIUM", "REVIEW", "APPROVAL_REQUIRED"].includes(v)) return "text-warn";
  if (["PAUSED", "CRITICAL", "LOCKED", "BLOCKED", "DENIED"].includes(v)) return "text-crimson";
  return "text-foreground";
}

export function CommandCenter() {
  const { state, metrics } = useAstraeon();

  const stats = [
    ["Agents", `${metrics.activeAgents} Active`],
    ["Risk", "Low"],
    ["Capital Protected", `$${metrics.capitalProtected.toLocaleString()}`],
    ["Actions Evaluated", metrics.actionsEvaluated.toLocaleString()],
    ["Actions Blocked", String(metrics.blockedActions)],
    ["Policy Violations", String(metrics.policyViolations)],
  ];

  const rows = useMemo(
    () =>
      state.agents.map((a) => {
        const policy = state.policies.find((p) => p.id === a.policyId);
        const last = state.events.filter((e) => e.agentId === a.id).at(-1);
        return {
          agent: a.name,
          status: a.status,
          risk: last?.riskTier ?? "LOW",
          spending: last?.amountUsd != null ? `$${last.amountUsd}` : "$0",
          pct: 0,
          policy: policy?.name ?? "—",
          last: last?.actionLabel ?? "No action",
        };
      }),
    [state],
  );

  return (
    <section id="command-center" className="relative border-t border-hairline py-24 lg:py-32">
      <div className="mx-auto max-w-[1400px] px-5 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            label="Command Center"
            title="Every Agent, Under Watch"
            description="A single operational surface for identity, policy, spending, and risk across your entire agent fleet."
          />
          <GoldButton href="/command-center">
            Launch Command Center <ArrowUpRight className="h-3.5 w-3.5" />
          </GoldButton>
        </div>

        <div className="mt-14 grid gap-px border border-hairline bg-hairline sm:grid-cols-3 lg:grid-cols-6">
          {stats.map(([k, v]) => (
            <div key={k} className="bg-panel/60 px-5 py-6">
              <p className="label-micro">{k}</p>
              <p className="mt-3 font-display text-lg tracking-[0.06em] text-foreground">{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-x-auto border border-hairline bg-panel/50">
          <table className="w-full min-w-[840px] border-collapse text-left">
            <thead>
              <tr className="border-b border-hairline">
                {["Agent", "Status", "Risk", "Spending", "Policy", "Last Action"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-4 text-[0.55rem] font-medium tracking-[0.2em] text-muted-foreground uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.agent}
                  className="border-b border-hairline transition-colors last:border-b-0 hover:bg-panel-2/60"
                >
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center border border-hairline text-[0.6rem] text-gold/70">
                        ◇
                      </span>
                      <span className="text-[0.78rem] text-foreground">{r.agent}</span>
                    </div>
                  </td>
                  <td
                    className={`px-5 py-5 text-[0.62rem] tracking-[0.16em] uppercase ${tone(r.status)}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {r.status}
                    </span>
                  </td>
                  <td
                    className={`px-5 py-5 text-[0.62rem] tracking-[0.16em] uppercase ${tone(r.risk)}`}
                  >
                    {r.risk}
                  </td>
                  <td className="px-5 py-5">
                    <p className="text-[0.7rem] text-foreground">{r.spending}</p>
                    <div className="mt-2 h-[2px] w-24 bg-hairline">
                      <div className="h-full bg-gold/70" style={{ width: `${r.pct}%` }} />
                    </div>
                  </td>
                  <td
                    className={`px-5 py-5 text-[0.62rem] tracking-[0.16em] uppercase ${tone(r.policy)}`}
                  >
                    {r.policy}
                  </td>
                  <td className="px-5 py-5 text-[0.7rem] text-muted-foreground">{r.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
