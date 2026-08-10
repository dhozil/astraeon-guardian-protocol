import { useState } from "react";
import { useAstraeon } from "@/lib/astraeon/store";
import { Panel, PanelTitle, Select, Pill, GhostButton } from "./bits";

export function PolicyPanel() {
  const { state, updatePolicy } = useAstraeon();
  const [agentId, setAgentId] = useState(state.agents[0]?.id ?? "");

  const agent = state.agents.find((a) => a.id === agentId);
  const policy = agent ? state.policies.find((p) => p.id === agent.policyId) : undefined;

  if (!agent || !policy) {
    return (
      <Panel>
        <PanelTitle>Policy</PanelTitle>
        <p className="px-5 py-8 text-[0.7rem] text-muted-foreground">No agent selected.</p>
      </Panel>
    );
  }

  const clauses: Array<[string, string, "plain" | "gold" | "alert"]> = [
    ["agent", agent.name, "gold"],
    ["allow", policy.allow.join(", "), "plain"],
    ["deny", policy.deny.join(", ") || "none", "plain"],
    ["withdrawals", policy.withdrawEnabled ? "ENABLED" : "DISABLED", "alert"],
    ["max_per_transaction", `$${policy.spending.maxPerTransactionUsd}`, "plain"],
    ["max_daily_spend", `$${policy.spending.maxDailyUsd}`, "plain"],
    ["max_weekly_spend", `$${policy.spending.maxWeeklyUsd}`, "plain"],
    ["max_monthly_spend", `$${policy.spending.maxMonthlyUsd}`, "plain"],
    ["max_transactions_per_day", String(policy.spending.maxTransactionsPerDay), "plain"],
    [
      "velocity",
      `${policy.velocity.maxTransactions} tx / ${policy.velocity.windowMinutes} min`,
      "plain",
    ],
    ["max_slippage", `${policy.slippageLimitPercent}%`, "plain"],
    [
      "approved_destinations",
      policy.allowedDestinationIds
        .map((id) => state.destinations.find((d) => d.id === id)?.name ?? id)
        .join(", "),
      "plain",
    ],
    ["risk_limit", String(policy.riskLimit), "plain"],
    ["approvals_above", `$${policy.approvalsAboveUsd}`, "plain"],
    ["status", policy.active ? "ACTIVE" : "INACTIVE", "gold"],
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-5">
        <Panel>
          <PanelTitle>Policy</PanelTitle>
          <div className="space-y-4 px-5 py-5">
            <label className="block">
              <span className="label-micro">Agent</span>
              <Select value={agentId} onChange={setAgentId} className="mt-2">
                {state.agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </label>
            <div className="space-y-2 border-t border-hairline pt-4 text-[0.66rem] leading-relaxed text-muted-foreground">
              <p>
                Policy ID: <span className="font-mono text-gold">{policy.id}</span>
              </p>
              <p>{policy.name}</p>
              <p className="flex items-center gap-2">
                Policy status{" "}
                <Pill tone={policy.active ? "ok" : "alert"}>
                  {policy.active ? "Active" : "Inactive"}
                </Pill>
              </p>
            </div>
            <GhostButton onClick={() => updatePolicy({ ...policy, active: !policy.active })}>
              {policy.active ? "Deactivate Policy" : "Activate Policy"}
            </GhostButton>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelTitle
          right={
            <span className="font-mono text-[0.6rem] text-muted-foreground">
              policies / {policy.id}.policy
            </span>
          }
        >
          Programmable Trust
        </PanelTitle>
        <div className="grid grid-cols-[38px_1fr] font-mono text-[0.72rem]">
          <div className="border-r border-hairline py-5 text-center text-muted-foreground/40">
            {clauses.map((_, i) => (
              <p key={i} className="leading-8">
                {String(i + 1).padStart(2, "0")}
              </p>
            ))}
          </div>
          <div className="py-5 pl-5">
            {clauses.map(([k, v, tone]) => (
              <p key={k} className="flex items-baseline gap-3 leading-8">
                <span className="w-[12rem] shrink-0 text-muted-foreground">{k}:</span>
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
      </Panel>
    </div>
  );
}
