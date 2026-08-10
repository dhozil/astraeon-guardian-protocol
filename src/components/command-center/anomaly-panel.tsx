import { useMemo } from "react";
import { useAstraeon } from "@/lib/astraeon/store";
import { computeReputation } from "@/lib/astraeon/reputation";
import { Panel, PanelTitle, Pill, Th, Td, StatusDot } from "./bits";
import { cn } from "@/lib/utils";

function toneForScore(score: number): string {
  if (score >= 80) return "text-ok";
  if (score >= 60) return "text-foreground";
  return "text-crimson";
}

function toneForKind(kind: string): "alert" | "warn" {
  return kind === "VELOCITY_BURST" || kind === "CRITICAL_RISK" ? "alert" : "warn";
}

export function AnomalyPanel() {
  const { state } = useAstraeon();

  const reputations = useMemo(
    () =>
      state.agents.map((a) => ({
        ...computeReputation(a.id, state.events, state.anomalies),
        name: a.name,
      })),
    [state.agents, state.events, state.anomalies],
  );

  const anomalies = useMemo(() => [...state.anomalies].reverse(), [state.anomalies]);

  return (
    <div className="space-y-5">
      <Panel>
        <PanelTitle>Anomaly Detection — Unusual Behavior Is Flagged</PanelTitle>
        {anomalies.length === 0 ? (
          <p className="px-5 py-8 text-[0.68rem] text-muted-foreground">
            No anomalies detected. Velocity bursts, critical-risk actions, and policy escapes appear
            here and can auto-pause the offending agent. Try the Demo → Scene 5 to trigger one.
          </p>
        ) : (
          <ul className="divide-y divide-border px-5">
            {anomalies.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-4 py-3">
                <div className="flex items-start gap-3">
                  <StatusDot
                    className={cn(
                      "mt-1.5",
                      a.kind === "VELOCITY_BURST" || a.kind === "CRITICAL_RISK"
                        ? "text-crimson"
                        : "text-warn",
                    )}
                  />
                  <div>
                    <p className="text-[0.68rem] font-semibold tracking-[0.14em] uppercase text-crimson">
                      {a.kind}
                    </p>
                    <p className="mt-0.5 text-[0.68rem] text-foreground/90">
                      {a.agentName} — {a.detail}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  <span className="text-[0.55rem] text-muted-foreground">
                    {new Date(a.timestamp).toLocaleTimeString()}
                  </span>
                  <Pill tone={toneForKind(a.kind)}>Flagged</Pill>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <PanelTitle>Agent Reputation — Trust From Verifiable Behavior</PanelTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr>
                <Th>Agent</Th>
                <Th>Tier</Th>
                <Th>Score</Th>
                <Th>Success Rate</Th>
                <Th>Tasks</Th>
                <Th>Violations</Th>
                <Th>Avg Risk</Th>
                <Th>Anomalies</Th>
              </tr>
            </thead>
            <tbody>
              {reputations.map((r) => (
                <tr key={r.agentId} className="transition-colors hover:bg-panel-2/40">
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center border border-hairline text-[0.6rem] text-gold/70">
                        ◇
                      </span>
                      <span className="text-[0.76rem]">{r.name}</span>
                    </div>
                  </Td>
                  <Td>
                    <Pill tone="gold">{r.tier}</Pill>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className={cn("font-display text-base", toneForScore(r.score))}>
                        {r.score}
                      </span>
                      <div className="h-[3px] w-20 bg-hairline">
                        <div
                          className={cn(
                            "h-full",
                            r.score >= 80 ? "bg-ok" : r.score >= 60 ? "bg-gold" : "bg-crimson",
                          )}
                          style={{ width: `${r.score}%` }}
                        />
                      </div>
                    </div>
                  </Td>
                  <Td className="text-[0.7rem]">{(r.successRate * 100).toFixed(1)}%</Td>
                  <Td className="text-[0.7rem]">{r.tasks}</Td>
                  <Td className="text-[0.7rem]">{r.denied}</Td>
                  <Td className="font-mono text-[0.66rem] text-muted-foreground">
                    {r.avgRisk.toFixed(0)}
                  </Td>
                  <Td className="text-[0.7rem]">{r.anomalies}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
