import { useState } from "react";
import { vault, useAstraeon } from "@/lib/astraeon/store";
import { kelvinToRlo } from "@/lib/astraeon/wallet";
import { Panel, PanelTitle, Pill, Th, Td, GoldSolidButton, StatusDot, GhostButton } from "./bits";

export function VaultPanel() {
  const credentials = vault.list();
  const { state, treasury, connection, fundTreasury, rememberKey, setRememberKey } = useAstraeon();
  const [funding, setFunding] = useState(false);
  const [fundResult, setFundResult] = useState<string | null>(null);

  const balanceRlo =
    connection.balanceKelvin != null ? kelvinToRlo(Number(connection.balanceKelvin)) : null;

  const allowedAgents = (destinationId: string) =>
    state.agents
      .filter((a) => {
        const policy = state.policies.find((p) => p.id === a.policyId);
        return policy?.allowedDestinationIds.includes(destinationId) ?? false;
      })
      .map((a) => a.name);

  const fund = async () => {
    setFunding(true);
    setFundResult(null);
    try {
      const tx = await fundTreasury();
      setFundResult(
        tx && !tx.simulated
          ? `Confirmed · ${tx.txHash.slice(0, 16)}…`
          : (tx?.result ?? "No transaction"),
      );
    } finally {
      setFunding(false);
    }
  };

  return (
    <div className="space-y-5">
      <Panel>
        <PanelTitle>Operator Wallet — On-Chain Authority</PanelTitle>
        <div className="grid gap-x-8 gap-y-4 px-5 py-5 md:grid-cols-2">
          <div>
            <p className="label-micro">Address (Ed25519 / base58)</p>
            <p className="mt-2 font-mono text-[0.72rem] text-gold">
              {treasury ? treasury.address : "not created yet"}
            </p>
            <p className="mt-1 text-[0.6rem] text-muted-foreground">
              {treasury
                ? `generated ${new Date(treasury.createdAt).toLocaleString()}`
                : "click Generate Wallet (top right) to create it"}
            </p>
          </div>
          <div>
            <p className="label-micro">Balance</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="font-display text-2xl text-foreground">
                {balanceRlo != null ? `${balanceRlo.toFixed(4)} RLO` : "—"}
              </span>
              <Pill tone={connection.reachable ? "ok" : "warn"}>
                <StatusDot /> {connection.reachable ? "DevNet connected" : "simulated"}
              </Pill>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <GoldSolidButton onClick={fund} disabled={funding || !treasury}>
                {funding ? "Funding…" : "Fund +1 RLO"}
              </GoldSolidButton>
              {fundResult ? (
                <span className="text-[0.6rem] text-muted-foreground">{fundResult}</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-5 py-3">
          <p className="text-[0.6rem] leading-relaxed text-muted-foreground">
            Agents never sign. The operator wallet signs execution transactions on Rialo DevNet —
            the approved action is confirmed on-chain and its signature is written to the audit
            trail. Astraeon holds no keys; this wallet belongs to the console operator (DevNet
            faucet for demonstration).
          </p>
          <div className="flex items-center gap-3">
            <GhostButton onClick={() => setRememberKey(!rememberKey)} disabled={!treasury}>
              {rememberKey ? "Key: persisted in browser" : "Key: memory only"}
            </GhostButton>
            {rememberKey ? (
              <Pill tone="alert">Insecure — demo only</Pill>
            ) : (
              <Pill tone="ok">Safer</Pill>
            )}
          </div>
        </div>
        {rememberKey ? (
          <div className="border-t border-crimson/30 bg-crimson/[0.06] px-5 py-3">
            <p className="text-[0.6rem] leading-relaxed text-crimson">
              The signing key is stored in this browser's localStorage. Anyone with access to this
              browser (XSS, shared machine, malicious extension) can extract it and control the
              wallet. Disable "remember key" to keep the key in memory for this session only — note
              that a page reload will generate a fresh DevNet wallet.
            </p>
          </div>
        ) : (
          <div className="border-t border-hairline px-5 py-3">
            <p className="text-[0.6rem] leading-relaxed text-muted-foreground">
              The signing key lives in memory for this session only and is not written to the
              browser. On reload a fresh DevNet wallet is generated.
            </p>
          </div>
        )}
      </Panel>

      <Panel>
        <PanelTitle>Credential Vault — Agents Never See The Keys</PanelTitle>
        <div className="px-5 py-5">
          <p className="max-w-3xl text-[0.68rem] leading-relaxed text-muted-foreground">
            Agent requests are proxied through the Astraeon gateway. Each call resolves to a vaulted
            credential, is checked against the agent's service allowlist and rate limit, then
            proxied and logged. A raw API key is never handed to the model or exposed to its tools.
          </p>
        </div>
      </Panel>

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                <Th>Service</Th>
                <Th>Path</Th>
                <Th>Masked Credential</Th>
                <Th>Binding</Th>
                <Th>Allowed Agents</Th>
              </tr>
            </thead>
            <tbody>
              {credentials.map((c) => {
                const agents = allowedAgents(c.destinationId);
                return (
                  <tr key={c.id} className="transition-colors hover:bg-panel-2/40">
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center border border-hairline text-[0.5rem] text-gold/70">
                          ◇
                        </span>
                        <span className="text-[0.74rem]">{c.service}</span>
                      </div>
                    </Td>
                    <Td className="font-mono text-[0.62rem] text-muted-foreground">{c.path}</Td>
                    <Td>
                      <Pill tone="muted">{c.maskedKey}</Pill>
                    </Td>
                    <Td>
                      <Pill tone="ok">Policy-bound</Pill>
                    </Td>
                    <Td>
                      <span className="text-[0.62rem] text-muted-foreground">
                        {agents.length > 0 ? agents.join(", ") : "no agents bound"}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
