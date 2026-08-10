import { useMemo, useState } from "react";
import { useAstraeon } from "@/lib/astraeon/store";
import type { Agent, Asset, Policy } from "@/lib/astraeon/types";
import { Panel, PanelTitle, Pill, GhostButton, GoldSolidButton, StatusDot } from "./bits";
import { isoNow } from "@/lib/astraeon/audit";
import { PLACEHOLDER_OPERATOR_ADDRESS } from "@/lib/astraeon/wallet";
import { cn } from "@/lib/utils";

interface Narration {
  id: string;
  scene: string;
  text: string;
  tone: "ok" | "alert" | "warn" | "muted";
}

const DEMO_AGENT_ID = "agent-demo-trader";

function demoPolicy(): Policy {
  return {
    id: "pol-demo-trader",
    name: "DeFi Trader Policy",
    agentId: DEMO_AGENT_ID,
    allow: ["BTC", "ETH"],
    deny: ["WITHDRAW", "TRANSFER"],
    withdrawEnabled: false,
    spending: {
      maxPerTransactionUsd: 100,
      maxDailyUsd: 500,
      maxWeeklyUsd: 2500,
      maxMonthlyUsd: 10000,
      maxTransactionsPerDay: 10,
    },
    velocity: { maxTransactions: 5, windowMinutes: 10 },
    slippageLimitPercent: 1,
    allowedDestinationIds: ["dest-dex-router", "dest-uniswap", "dest-market-api"],
    riskLimit: 60,
    approvalsAboveUsd: 500,
    active: true,
  };
}

export function DemoPanel() {
  const { state, createAgent, submitAction, reset } = useAstraeon();
  const [narration, setNarration] = useState<Narration[]>([]);
  const [busy, setBusy] = useState(false);

  const demoAgent: Agent | undefined = state.agents.find((a) => a.id === DEMO_AGENT_ID);

  const push = (scene: string, text: string, tone: Narration["tone"] = "muted") => {
    setNarration((prev) =>
      [...prev, { id: `n_${Math.random().toString(36).slice(2)}`, scene, text, tone }].slice(-40),
    );
  };

  const clear = () => setNarration([]);

  const scene1 = () => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    createAgent(
      {
        id: DEMO_AGENT_ID,
        name: "DeFi Trader",
        owner: PLACEHOLDER_OPERATOR_ADDRESS,
        role: "Trading Agent",
        status: "ACTIVE",
        trustLevel: "B",
        createdAt: isoNow(),
        authority: {
          wallet: PLACEHOLDER_OPERATOR_ADDRESS,
          maxDailyUsd: 500,
          maxPerTxUsd: 100,
          withdrawEnabled: false,
          expiresAt: expiry.toISOString(),
        },
        policyId: "pol-demo-trader",
        baseline: { requestsPerHour: 10, tradesPerHour: 3, avgTxUsd: 80 },
      },
      demoPolicy(),
    );
    push(
      "SCENE 1",
      'Agent "DeFi Trader" registered with identity. Budget $500/day, BTC + ETH, withdrawals disabled.',
      "ok",
    );
  };

  const scene2 = async () => {
    setBusy(true);
    try {
      const r = await submitAction({
        agentId: DEMO_AGENT_ID,
        type: "API_CALL",
        data: "Market Data",
        method: "/v1/market",
      });
      push(
        "SCENE 2",
        "DeFi Trader fetches market data via the Credential Gateway — no API key exposed.",
        "ok",
      );
      if (r.event.status !== "EXECUTED")
        push("SCENE 2", `Gateway call blocked: ${r.event.reason}`, "alert");
    } finally {
      setBusy(false);
    }
  };

  const scene3 = async () => {
    setBusy(true);
    try {
      const r = await submitAction({
        agentId: DEMO_AGENT_ID,
        type: "BUY",
        asset: "BTC",
        amountUsd: 75,
        destinationId: "dest-dex-router",
      });
      const executed =
        r.execution && !r.execution.simulated
          ? `Rialo EXECUTE (tx ${r.execution.txHash.slice(0, 12)}…)`
          : r.event.status === "EXECUTED"
            ? "Rialo EXECUTE (simulated)"
            : `blocked: ${r.event.reason}`;
      push(
        "SCENE 3",
        `BUY BTC $75 → Policy PASSED · Risk ${r.decision.riskScore}/100 · Simulation PASSED · ${executed}.`,
        "ok",
      );
    } finally {
      setBusy(false);
    }
  };

  const scene4 = async () => {
    setBusy(true);
    try {
      const r = await submitAction({
        agentId: DEMO_AGENT_ID,
        type: "WITHDRAW",
        asset: "USDC",
        amountUsd: 1000,
      });
      push(
        "SCENE 4",
        `WITHDRAW $1,000 → Policy ${r.decision.verdict} · Risk ${r.decision.riskScore}/100 · ${r.decision.reason}.`,
        "alert",
      );
    } finally {
      setBusy(false);
    }
  };

  const scene5 = () => {
    if (!state.agents.some((a) => a.id === DEMO_AGENT_ID)) {
      scene1();
      push("SCENE 5", "Creating agent first…", "warn");
    }
    setBusy(true);
    push("SCENE 5", "DeFi Trader suddenly fires 16 rapid buy requests…", "warn");
    const total = 16;
    for (let i = 0; i < total; i += 1) {
      window.setTimeout(() => {
        void submitAction(
          {
            agentId: DEMO_AGENT_ID,
            type: "BUY",
            asset: "BTC",
            amountUsd: 75,
            destinationId: "dest-dex-router",
          },
          { onChain: false },
        );
        if (i === total - 1) {
          setBusy(false);
          push("SCENE 5", "Velocity anomaly detected — agent auto-paused by Astraeon.", "alert");
        }
      }, 40 * i);
    }
  };

  const scene6 = () => {
    push(
      "SCENE 6",
      "Dashboard shows: agent protected. Autonomy + Control + Security + Rialo.",
      "ok",
    );
  };

  const steps: Array<{ label: string; desc: string; run: () => void; disabled?: boolean }> = [
    {
      label: "Scene 1 — Create Agent",
      desc: "DeFi Trader · $500/day · BTC+ETH · no withdraw",
      run: scene1,
      disabled: busy,
    },
    {
      label: "Scene 2 — Fetch Market Data",
      desc: "via credential gateway",
      run: scene2,
      disabled: busy || !demoAgent || demoAgent.status !== "ACTIVE",
    },
    {
      label: "Scene 3 — BUY BTC $75",
      desc: "policy pass → executed on Rialo",
      run: scene3,
      disabled: busy || !demoAgent || demoAgent.status !== "ACTIVE",
    },
    {
      label: "Scene 4 — WITHDRAW $1,000",
      desc: "policy deny · risk 100",
      run: scene4,
      disabled: busy || !demoAgent,
    },
    {
      label: "Scene 5 — 16 Rapid Requests",
      desc: "velocity burst → auto-pause",
      run: scene5,
      disabled: busy || !demoAgent,
    },
    {
      label: "Scene 6 — Verdict",
      desc: "agent protected",
      run: scene6,
      disabled: busy || !demoAgent,
    },
  ];

  const demoEvents = useMemo(
    () => state.events.filter((e) => e.agentId === DEMO_AGENT_ID),
    [state.events],
  );

  return (
    <div className="space-y-5">
      <Panel>
        <PanelTitle
          right={
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={clear}
                className="text-[0.6rem] uppercase text-muted-foreground hover:text-gold"
              >
                Clear log
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  clear();
                }}
                className="text-[0.6rem] uppercase text-muted-foreground hover:text-crimson"
              >
                Reset demo
              </button>
            </div>
          }
        >
          The Astraeon Story — Autonomy Meets Control
        </PanelTitle>
        <div className="grid gap-5 px-5 py-5 lg:grid-cols-2">
          <div className="space-y-2">
            {steps.map((s) => (
              <div
                key={s.label}
                className="flex items-center justify-between gap-4 border border-hairline bg-panel/50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[0.68rem] text-foreground">{s.label}</p>
                  <p className="mt-0.5 text-[0.58rem] text-muted-foreground">{s.desc}</p>
                </div>
                <GhostButton tone="gold" onClick={s.run} disabled={s.disabled}>
                  Run
                </GhostButton>
              </div>
            ))}
          </div>
          <div className="border border-hairline bg-panel/40 px-4 py-4">
            <div className="flex items-center justify-between">
              <p className="label-micro">DeFi Trader Status</p>
              <Pill
                tone={
                  demoAgent?.status === "ACTIVE"
                    ? "ok"
                    : demoAgent?.status === "PAUSED"
                      ? "alert"
                      : "muted"
                }
              >
                {demoAgent?.status ?? "not created"}
              </Pill>
            </div>
            <ul className="mt-4 space-y-2 text-[0.64rem] text-muted-foreground">
              <li className="flex items-center justify-between">
                <span>Identity</span>
                <span className="text-foreground">{demoAgent ? "registered" : "—"}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Authority</span>
                <span className="text-foreground">
                  {demoAgent
                    ? `$${demoAgent.authority.maxPerTxUsd}/tx · $${demoAgent.authority.maxDailyUsd}/day`
                    : "—"}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Withdraw</span>
                <span className="text-crimson">{demoAgent ? "disabled" : "—"}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Actions guarded</span>
                <span className="text-foreground">{demoEvents.length}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Blocked</span>
                <span className="text-crimson">
                  {demoEvents.filter((e) => e.status === "BLOCKED").length}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Executed on Rialo</span>
                <span className="text-ok">
                  {demoEvents.filter((e) => e.status === "EXECUTED").length}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelTitle>Live Narrative</PanelTitle>
        {narration.length === 0 ? (
          <p className="px-5 py-8 text-[0.68rem] text-muted-foreground">
            Run the scenes in order to replay the Astraeon thesis. Watch the Audit Trail and
            Overview update in real time.
          </p>
        ) : (
          <ul className="divide-y divide-border px-5">
            {narration.map((n) => (
              <li key={n.id} className="flex items-start gap-3 py-3">
                <span className="w-16 shrink-0 pt-0.5 text-[0.55rem] tracking-[0.18em] text-gold/70 uppercase">
                  {n.scene}
                </span>
                <StatusDot
                  className={cn(
                    "mt-1.5",
                    n.tone === "ok"
                      ? "text-ok"
                      : n.tone === "alert"
                        ? "text-crimson"
                        : n.tone === "warn"
                          ? "text-warn"
                          : "text-muted-foreground",
                  )}
                />
                <p className="text-[0.68rem] leading-relaxed text-foreground/90">{n.text}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
