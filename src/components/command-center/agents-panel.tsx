import { useState } from "react";
import { useAstraeon } from "@/lib/astraeon/store";
import type { Agent, Asset, Policy } from "@/lib/astraeon/types";
import { ASSETS } from "@/lib/astraeon/types";
import { computeReputation } from "@/lib/astraeon/reputation";
import {
  Panel,
  PanelTitle,
  Th,
  Td,
  Pill,
  GhostButton,
  GoldSolidButton,
  Input,
  Select,
  StatusDot,
  toneStatus,
} from "./bits";
import { isoNow } from "@/lib/astraeon/audit";
import { PLACEHOLDER_OPERATOR_ADDRESS } from "@/lib/astraeon/wallet";

function defaultPolicy(
  agentId: string,
  name: string,
  daily: number,
  perTx: number,
  assets: Asset[],
): Policy {
  return {
    id: `pol-${agentId}`,
    name: `${name} Policy`,
    agentId,
    allow: assets,
    deny: ["WITHDRAW", "TRANSFER"],
    withdrawEnabled: false,
    spending: {
      maxPerTransactionUsd: perTx,
      maxDailyUsd: daily,
      maxWeeklyUsd: daily * 5,
      maxMonthlyUsd: daily * 20,
      maxTransactionsPerDay: 10,
    },
    velocity: { maxTransactions: 5, windowMinutes: 10 },
    slippageLimitPercent: 1,
    allowedDestinationIds: ["dest-market-api", "dest-dex-router"],
    riskLimit: 60,
    approvalsAboveUsd: Math.max(100, perTx * 3),
    active: true,
  };
}

function CreateAgentForm({ onClose }: { onClose: () => void }) {
  const { createAgent } = useAstraeon();
  const [name, setName] = useState("");
  const [role, setRole] = useState("Trading Agent");
  const [daily, setDaily] = useState("100");
  const [perTx, setPerTx] = useState("25");
  const [assets, setAssets] = useState<Asset[]>(["BTC", "ETH"]);

  const toggleAsset = (a: Asset) => {
    setAssets((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  };

  const submit = () => {
    if (!name.trim()) return;
    const id = `agent-${Date.now().toString(36)}`;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    const agent: Agent = {
      id,
      name: name.trim(),
      owner: PLACEHOLDER_OPERATOR_ADDRESS,
      role,
      status: "ACTIVE",
      trustLevel: "B",
      createdAt: isoNow(),
      authority: {
        wallet: PLACEHOLDER_OPERATOR_ADDRESS,
        maxDailyUsd: Number(daily) || 100,
        maxPerTxUsd: Number(perTx) || 25,
        withdrawEnabled: false,
        expiresAt: expiry.toISOString(),
      },
      policyId: `pol-${id}`,
      baseline: { requestsPerHour: 10, tradesPerHour: 2, avgTxUsd: Number(perTx) || 25 },
    };
    const policy = defaultPolicy(
      id,
      agent.name,
      Number(daily) || 100,
      Number(perTx) || 25,
      assets.length > 0 ? assets : ["BTC"],
    );
    createAgent(agent, policy);
    onClose();
  };

  return (
    <Panel className="mt-5">
      <PanelTitle
        right={
          <button
            type="button"
            onClick={onClose}
            className="text-[0.6rem] uppercase text-muted-foreground hover:text-gold"
          >
            close
          </button>
        }
      >
        Create Agent
      </PanelTitle>
      <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
        <label className="block">
          <span className="label-micro">Agent Name</span>
          <Input value={name} onChange={setName} placeholder="e.g. YieldBot-01" className="mt-2" />
        </label>
        <label className="block">
          <span className="label-micro">Role</span>
          <Select value={role} onChange={setRole} className="mt-2">
            {[
              "Trading Agent",
              "Research Agent",
              "Treasury Manager",
              "Risk Monitor",
              "Support Agent",
            ].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="label-micro">Daily Budget ($)</span>
          <Input value={daily} onChange={setDaily} type="number" className="mt-2" />
        </label>
        <label className="block">
          <span className="label-micro">Max Per Transaction ($)</span>
          <Input value={perTx} onChange={setPerTx} type="number" className="mt-2" />
        </label>
        <div className="md:col-span-2">
          <span className="label-micro">Allowed Assets</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {ASSETS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleAsset(a)}
                className={`border px-3 py-1.5 text-[0.62rem] tracking-widest transition-colors ${
                  assets.includes(a)
                    ? "border-gold/60 bg-gold/10 text-gold"
                    : "border-hairline text-muted-foreground"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-hairline px-5 py-4">
        <GhostButton onClick={onClose}>Cancel</GhostButton>
        <GoldSolidButton onClick={submit}>Create Agent</GoldSolidButton>
      </div>
    </Panel>
  );
}

export function AgentsPanel() {
  const { state, pauseAgent, resumeAgent, revokeAgent } = useAstraeon();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(state.agents[0]?.id ?? "");

  const selected = state.agents.find((a) => a.id === selectedId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[0.68rem] text-muted-foreground">
          {state.agents.length} agents · {state.agents.filter((a) => a.status === "ACTIVE").length}{" "}
          active
        </p>
        <GoldSolidButton onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Close Form" : "New Agent"}
        </GoldSolidButton>
      </div>

      {showCreate ? <CreateAgentForm onClose={() => setShowCreate(false)} /> : null}

      <Panel>
        <PanelTitle>Delegated Authority — Ownership ≠ Agent Power</PanelTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr>
                <Th>Agent</Th>
                <Th>Status</Th>
                <Th>Authority</Th>
                <Th>Policy</Th>
                <Th>Expiry</Th>
                <Th>Controls</Th>
              </tr>
            </thead>
            <tbody>
              {state.agents.map((a) => {
                const policy = state.policies.find((p) => p.id === a.policyId);
                const rep = computeReputation(a.id, state.events, state.anomalies);
                return (
                  <tr key={a.id} className="transition-colors hover:bg-panel-2/40">
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center border border-hairline text-[0.6rem] text-gold/70">
                          ◇
                        </span>
                        <div className="leading-tight">
                          <p className="text-[0.76rem] text-foreground">{a.name}</p>
                          <p className="text-[0.58rem] text-muted-foreground">{a.role}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span
                        className={`flex items-center gap-1.5 text-[0.6rem] tracking-[0.16em] uppercase ${toneStatus(a.status)}`}
                      >
                        <StatusDot /> {a.status}
                      </span>
                    </Td>
                    <Td>
                      <p className="text-[0.68rem]">
                        ${a.authority.maxPerTxUsd}/tx · ${a.authority.maxDailyUsd}/day
                      </p>
                      <p className="mt-0.5 text-[0.58rem] text-muted-foreground">
                        withdraw {a.authority.withdrawEnabled ? "enabled" : "disabled"}
                      </p>
                    </Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => setSelectedId(a.id)}
                        className="text-[0.66rem] text-gold hover:text-champagne"
                      >
                        {policy?.name ?? "—"}
                      </button>
                    </Td>
                    <Td className="text-[0.62rem] text-muted-foreground">
                      {new Date(a.authority.expiresAt).toLocaleDateString()}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        {a.status === "ACTIVE" ? (
                          <GhostButton
                            tone="alert"
                            onClick={() => pauseAgent(a.id, "paused by operator")}
                          >
                            Pause
                          </GhostButton>
                        ) : (
                          <GhostButton tone="gold" onClick={() => resumeAgent(a.id)}>
                            Resume
                          </GhostButton>
                        )}
                        <GhostButton onClick={() => revokeAgent(a.id)}>Revoke</GhostButton>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {selected ? (
        <Panel>
          <PanelTitle>Delegation for {selected.name}</PanelTitle>
          <div className="grid gap-x-8 gap-y-4 px-5 py-5 md:grid-cols-2">
            <div>
              <p className="label-micro">Scoped Authority</p>
              <ul className="mt-3 space-y-2 text-[0.68rem] text-muted-foreground">
                <li>Wallet · {selected.authority.wallet}</li>
                <li>Max / tx · ${selected.authority.maxPerTxUsd}</li>
                <li>Max / day · ${selected.authority.maxDailyUsd}</li>
                <li>Withdraw · {selected.authority.withdrawEnabled ? "allowed" : "disabled"}</li>
                <li>Expires · {new Date(selected.authority.expiresAt).toLocaleString()}</li>
              </ul>
            </div>
            <div>
              <p className="label-micro">Behavior Baseline</p>
              <ul className="mt-3 space-y-2 text-[0.68rem] text-muted-foreground">
                <li>{selected.baseline.requestsPerHour} API calls / hour</li>
                <li>{selected.baseline.tradesPerHour} trades / hour</li>
                <li>${selected.baseline.avgTxUsd} average transaction</li>
              </ul>
              <div className="mt-4 flex items-center gap-3">
                <Pill tone={selected.status === "ACTIVE" ? "ok" : "alert"}>{selected.status}</Pill>
                <Pill tone="gold">
                  {(() => {
                    const r = computeReputation(selected.id, state.events, state.anomalies);
                    return `Reputation ${r.tier} · ${r.score}/100`;
                  })()}
                </Pill>
              </div>
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
