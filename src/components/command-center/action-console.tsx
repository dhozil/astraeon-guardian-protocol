import { useState } from "react";
import { useAstraeon } from "@/lib/astraeon/store";
import type { ActionRequest, ActionType, Asset } from "@/lib/astraeon/types";
import { ASSETS } from "@/lib/astraeon/types";
import {
  Panel,
  PanelTitle,
  Select,
  Input,
  GoldSolidButton,
  Pill,
  StatusDot,
  toneVerdict,
  toneTier,
} from "./bits";
import { cn } from "@/lib/utils";

const ACTION_TYPES: ActionType[] = [
  "API_CALL",
  "BUY",
  "SELL",
  "SWAP",
  "TRANSFER",
  "WITHDRAW",
  "CONTRACT_CALL",
];

const HAS_AMOUNT: ActionType[] = ["BUY", "SELL", "SWAP", "TRANSFER", "WITHDRAW"];
const HAS_ASSET: ActionType[] = ["BUY", "SELL", "SWAP", "TRANSFER", "WITHDRAW"];
const HAS_SLIPPAGE: ActionType[] = ["SWAP"];
const HAS_DESTINATION: ActionType[] = ["SWAP", "TRANSFER", "CONTRACT_CALL"];

export function ActionConsole() {
  const { state, submitAction } = useAstraeon();
  const [agentId, setAgentId] = useState(state.agents[0]?.id ?? "");
  const [type, setType] = useState<ActionType>("BUY");
  const [asset, setAsset] = useState<Asset>("BTC");
  const [amount, setAmount] = useState("75");
  const [destinationId, setDestinationId] = useState("dest-dex-router");
  const [slippage, setSlippage] = useState("1");
  const [last, setLast] = useState<Awaited<ReturnType<typeof submitAction>> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const agent = state.agents.find((a) => a.id === agentId);
  const policy = agent ? state.policies.find((p) => p.id === agent.policyId) : undefined;

  const submit = async () => {
    const request: ActionRequest = {
      agentId,
      type,
      ...(HAS_ASSET.includes(type) ? { asset } : {}),
      ...(HAS_AMOUNT.includes(type) ? { amountUsd: Number(amount) || 0 } : {}),
      ...(HAS_SLIPPAGE.includes(type) ? { slippagePercent: Number(slippage) } : {}),
      ...(HAS_DESTINATION.includes(type) ? { destinationId } : {}),
      ...(type === "API_CALL" ? { data: "Market Data", method: "/v1/market" } : {}),
    };
    setSubmitting(true);
    try {
      setLast(await submitAction(request));
    } finally {
      setSubmitting(false);
    }
  };

  const failed = last?.decision.checks.filter((c) => c.status === "FAIL") ?? [];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-5">
        <Panel>
          <PanelTitle>Request</PanelTitle>
          <div className="space-y-4 px-5 py-5">
            <label className="block">
              <span className="label-micro">Agent</span>
              <Select value={agentId} onChange={setAgentId} className="mt-2">
                {state.agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.status}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="label-micro">Action Type</span>
              <Select value={type} onChange={(v) => setType(v as ActionType)} className="mt-2">
                {ACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </label>
            {HAS_ASSET.includes(type) ? (
              <label className="block">
                <span className="label-micro">Asset</span>
                <Select value={asset} onChange={(v) => setAsset(v as Asset)} className="mt-2">
                  {ASSETS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
              </label>
            ) : null}
            {HAS_AMOUNT.includes(type) ? (
              <label className="block">
                <span className="label-micro">Amount (USD)</span>
                <Input value={amount} onChange={setAmount} type="number" className="mt-2" />
              </label>
            ) : null}
            {HAS_SLIPPAGE.includes(type) ? (
              <label className="block">
                <span className="label-micro">Max Slippage (%)</span>
                <Input value={slippage} onChange={setSlippage} type="number" className="mt-2" />
              </label>
            ) : null}
            {HAS_DESTINATION.includes(type) ? (
              <label className="block">
                <span className="label-micro">Destination</span>
                <Select value={destinationId} onChange={setDestinationId} className="mt-2">
                  {state.destinations.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {d.reputation.toLowerCase()} · {d.address}
                    </option>
                  ))}
                </Select>
              </label>
            ) : null}
            <GoldSolidButton
              onClick={submit}
              disabled={!agent || submitting}
              className="w-full justify-center"
            >
              {submitting ? "Submitting…" : "Submit Action"}
            </GoldSolidButton>
            {policy ? (
              <p className="border-t border-hairline pt-3 text-[0.6rem] leading-relaxed text-muted-foreground">
                Guarded by <span className="text-gold">{policy.name}</span> · max $
                {policy.spending.maxPerTransactionUsd}/tx · ${policy.spending.maxDailyUsd}/day ·
                risk limit {policy.riskLimit}
              </p>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelTitle>Guard Pipeline — Verdict</PanelTitle>
        {!last ? (
          <div className="px-5 py-16 text-center">
            <p className="font-display text-2xl tracking-[0.08em] text-muted-foreground/60 uppercase">
              Awaiting Request
            </p>
            <p className="mx-auto mt-3 max-w-sm text-[0.66rem] leading-relaxed text-muted-foreground">
              Submit an action and Astraeon will evaluate identity, policy, spending, velocity,
              risk, and destination before a single byte reaches the execution layer.
            </p>
          </div>
        ) : (
          <div className="px-5 py-5">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "font-display text-2xl tracking-[0.1em] uppercase",
                  toneVerdict(last.decision.verdict),
                )}
              >
                {last.decision.verdict}
              </span>
              <Pill
                tone={
                  last.decision.verdict === "ALLOW"
                    ? "ok"
                    : last.decision.verdict === "APPROVAL_REQUIRED"
                      ? "warn"
                      : "alert"
                }
              >
                {last.event.actionLabel}
              </Pill>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-px border border-hairline bg-hairline text-center">
              <div className="bg-panel/60 px-3 py-3">
                <p className="label-micro">Risk Score</p>
                <p className={cn("mt-2 font-display text-xl", toneTier(last.decision.riskTier))}>
                  {last.decision.riskScore}/100
                </p>
                <p
                  className={cn(
                    "mt-1 text-[0.58rem] uppercase tracking-[0.16em]",
                    toneTier(last.decision.riskTier),
                  )}
                >
                  {last.decision.riskTier}
                </p>
              </div>
              <div className="bg-panel/60 px-3 py-3">
                <p className="label-micro">Status</p>
                <p className="mt-2 font-display text-xl text-foreground">{last.event.status}</p>
                <p
                  className={cn(
                    "mt-1 text-[0.58rem] uppercase tracking-[0.16em]",
                    last.execution && !last.execution.simulated
                      ? "text-ok"
                      : "text-muted-foreground",
                  )}
                >
                  {last.execution && !last.execution.simulated
                    ? "on-chain · confirmed"
                    : "simulated execution"}
                </p>
              </div>
              <div className="bg-panel/60 px-3 py-3">
                <p className="label-micro">Hash</p>
                <p className="mt-2 truncate font-mono text-[0.62rem] text-foreground">
                  {last.event.txHash ?? "—"}
                </p>
                <p className="mt-1 text-[0.58rem] uppercase tracking-[0.16em] text-muted-foreground">
                  {last.execution && !last.execution.simulated
                    ? "Rialo DevNet"
                    : last.event.txHash?.startsWith("gway_")
                      ? "gateway proxy"
                      : "Rialo txn"}
                </p>
              </div>
            </div>

            <div className="mt-5">
              <p className="label-micro mb-3">Policy Checks</p>
              <ul className="divide-y divide-border border border-hairline">
                {last.decision.checks.map((c) => (
                  <li key={c.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="text-[0.64rem] text-foreground/90">{c.name}</span>
                    <span className="flex items-center gap-2 text-[0.58rem] text-muted-foreground">
                      {c.detail}
                      <span
                        className={cn(
                          "text-[0.55rem] font-semibold tracking-[0.14em] uppercase",
                          c.status === "PASS" ? "text-ok" : "text-crimson",
                        )}
                      >
                        {c.status === "PASS" ? "✓" : "✕"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {last.decision.verdict === "DENY" ? (
              <div className="mt-5 border border-crimson/30 bg-crimson/[0.06] px-4 py-3">
                <p className="label-micro text-crimson">Denied</p>
                <p className="mt-1 text-[0.7rem] text-foreground/90">{last.decision.reason}</p>
              </div>
            ) : null}

            {last.decision.verdict === "APPROVAL_REQUIRED" ? (
              <div className="mt-5 border border-warn/30 bg-warn/[0.06] px-4 py-3">
                <p className="label-micro text-warn">Human approval required</p>
                <p className="mt-1 text-[0.7rem] text-foreground/90">
                  {last.decision.reason}. Approve from the Approvals panel.
                </p>
              </div>
            ) : null}

            {last.simulation && last.decision.verdict === "ALLOW" ? (
              <div className="mt-5 border border-hairline bg-panel/60 px-4 py-3">
                <p className="label-micro">Preflight Simulation</p>
                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[0.64rem] text-muted-foreground sm:grid-cols-4">
                  <span>
                    Expected: <b className="text-foreground">${last.simulation.expectedOut}</b>
                  </span>
                  <span>
                    Minimum: <b className="text-foreground">${last.simulation.minimumOut}</b>
                  </span>
                  <span>
                    Fee: <b className="text-foreground">${last.simulation.estimatedFeeUsd}</b>
                  </span>
                  <span>
                    Gas: <b className="text-foreground">{last.simulation.gasUsed}</b>
                  </span>
                </div>
              </div>
            ) : null}

            {last.anomalies.length > 0 ? (
              <div className="mt-5 space-y-2">
                {last.anomalies.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between border border-crimson/30 bg-crimson/[0.06] px-4 py-2.5"
                  >
                    <div>
                      <p className="text-[0.62rem] font-semibold tracking-[0.16em] text-crimson uppercase">
                        {a.kind}
                      </p>
                      <p className="mt-0.5 text-[0.64rem] text-muted-foreground">{a.detail}</p>
                    </div>
                    <Pill tone="alert">Flagged</Pill>
                  </div>
                ))}
              </div>
            ) : null}

            {failed.length > 0 ? (
              <p className="mt-4 flex items-center gap-2 text-[0.62rem] text-muted-foreground">
                <StatusDot className="text-crimson" /> {failed.length} check
                {failed.length > 1 ? "s" : ""} failed — action held at the boundary.
              </p>
            ) : null}
          </div>
        )}
      </Panel>
    </div>
  );
}
