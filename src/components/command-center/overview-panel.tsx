import { useMemo } from "react";
import { useAstraeon } from "@/lib/astraeon/store";
import { computeLedger } from "@/lib/astraeon/policy";
import { Panel, PanelTitle, Pill, StatusDot, toneStatus } from "./bits";

export function OverviewPanel() {
  const { state, metrics, connection, chainInfo, refreshChainInfo, treasury } = useAstraeon();

  const ledger = useMemo(() => computeLedger(state.events, Date.now()), [state.events]);

  const cards = [
    {
      label: "Total Agents",
      value: String(metrics.totalAgents),
      sub: `${metrics.activeAgents} active`,
    },
    {
      label: "Actions Evaluated",
      value: metrics.actionsEvaluated.toLocaleString(),
      sub: `${metrics.executedTxns} executed`,
    },
    { label: "Blocked Actions", value: String(metrics.blockedActions), sub: "denied by policy" },
    {
      label: "Capital Protected",
      value: `$${metrics.capitalProtected.toLocaleString()}`,
      sub: "all-time under policy",
    },
    {
      label: "Today Spent",
      value: `$${ledger.lastDayUsd.toLocaleString()}`,
      sub: `${ledger.todayCount} txns`,
    },
    { label: "Anomalies", value: String(metrics.anomalies), sub: "flagged events" },
  ];

  const recent = [...state.events].slice(-8).reverse();

  const health = {
    healthy: state.agents.filter((a) => a.status === "ACTIVE").length,
    paused: state.agents.filter((a) => a.status === "PAUSED").length,
    revoked: state.agents.filter((a) => a.status === "REVOKED").length,
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-px border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-panel/60 px-5 py-6">
            <p className="label-micro">{c.label}</p>
            <p className="mt-3 font-display text-xl tracking-[0.04em] text-foreground">{c.value}</p>
            <p className="mt-1 text-[0.6rem] text-muted-foreground">{c.sub}</p>
          </div>
        ))}
      </div>

      <Panel>
        <PanelTitle
          right={
            <button
              type="button"
              onClick={() => void refreshChainInfo()}
              className="text-[0.6rem] uppercase text-muted-foreground transition-colors hover:text-gold"
            >
              refresh
            </button>
          }
        >
          Rialo Network
        </PanelTitle>
        <div className="grid gap-px border-t border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Connection",
              value: connection.reachable ? "Connected" : "Simulated",
              tone: connection.reachable ? "text-ok" : "text-warn",
            },
            {
              label: "Block Height",
              value: chainInfo ? chainInfo.blockHeight.toLocaleString() : "—",
              tone: "text-foreground",
            },
            {
              label: "Transactions",
              value: chainInfo ? chainInfo.transactionCount.toLocaleString() : "—",
              tone: "text-foreground",
            },
            {
              label: "Config Hash Prefix",
              value: chainInfo ? chainInfo.configHashPrefix.slice(0, 10) : "—",
              tone: "text-gold",
            },
          ].map((c) => (
            <div key={c.label} className="bg-panel/60 px-5 py-4">
              <p className="label-micro">{c.label}</p>
              <p className={`mt-2 font-mono text-[0.78rem] ${c.tone}`}>{c.value}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline px-5 py-3">
          <p className="text-[0.58rem] text-muted-foreground">
            Operator wallet:{" "}
            {treasury ? `${treasury.address.slice(0, 8)}…${treasury.address.slice(-4)}` : "…"} ·{" "}
            {connection.balanceKelvin != null
              ? `${(Number(connection.balanceKelvin) / 1_000_000_000).toFixed(4)} RLO`
              : "no balance"}
          </p>
          <p className="text-[0.55rem] text-muted-foreground">
            node time {chainInfo ? new Date(chainInfo.nodeTimeMs).toLocaleTimeString() : "—"}
          </p>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Panel>
          <PanelTitle
            right={
              <span className="text-[0.55rem] tracking-[0.16em] text-muted-foreground uppercase">
                latest first
              </span>
            }
          >
            Live Activity
          </PanelTitle>
          <ul className="divide-y divide-border px-5">
            {recent.length === 0 ? (
              <li className="py-6 text-[0.7rem] text-muted-foreground">No activity yet.</li>
            ) : (
              recent.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-hairline text-[0.55rem] text-gold/70">
                      ◇
                    </span>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-[0.68rem] text-foreground">
                        {e.agentName}{" "}
                        <span className="text-muted-foreground">· {e.actionLabel}</span>
                      </p>
                      <p className="mt-0.5 truncate text-[0.58rem] text-muted-foreground">
                        {e.reason}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2.5">
                    {e.txHash ? (
                      <span className="max-w-[9rem] truncate font-mono text-[0.55rem] text-muted-foreground">
                        {e.txHash}
                      </span>
                    ) : null}
                    <span className="text-[0.52rem] text-muted-foreground">
                      {timeAgo(e.timestamp)}
                    </span>
                    <Pill
                      tone={
                        e.status === "EXECUTED"
                          ? "ok"
                          : e.status === "PENDING_APPROVAL"
                            ? "warn"
                            : "alert"
                      }
                    >
                      {e.status === "EXECUTED"
                        ? "Executed"
                        : e.status === "PENDING_APPROVAL"
                          ? "Approval"
                          : "Blocked"}
                    </Pill>
                  </div>
                </li>
              ))
            )}
          </ul>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <PanelTitle>Fleet Health</PanelTitle>
            <div className="px-5 py-5">
              <div className="flex items-end justify-between">
                <span className="font-display text-4xl text-foreground">
                  {health.healthy + health.paused + health.revoked > 0
                    ? Math.round(
                        (health.healthy / (health.healthy + health.paused + health.revoked)) * 100,
                      )
                    : 0}
                  %
                </span>
                <span className="label-micro">Healthy</span>
              </div>
              <ul className="mt-5 space-y-2 text-[0.62rem]">
                {(
                  [
                    ["Active", health.healthy, "text-ok"],
                    ["Paused", health.paused, "text-crimson"],
                    ["Revoked", health.revoked, "text-muted-foreground"],
                  ] as Array<[string, number, string]>
                ).map(([k, v, color]) => (
                  <li key={k} className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <StatusDot className={color} /> {k}
                    </span>
                    <span className="text-foreground">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          <Panel>
            <PanelTitle>Global Risk</PanelTitle>
            <div className="px-5 py-5">
              <div className="flex items-center justify-between">
                <Pill tone="ok">Low</Pill>
                <span className="text-[0.6rem] text-muted-foreground">no critical open events</span>
              </div>
              <p className="mt-4 text-[0.62rem] leading-relaxed text-muted-foreground">
                {metrics.blockedActions} actions blocked and {metrics.policyViolations} policy
                violations since inception. TreasuryAgent's last withdraw attempt was blocked at
                risk 98/100.
              </p>
            </div>
          </Panel>
        </div>
      </div>

      <Panel>
        <PanelTitle>Agent Fleet</PanelTitle>
        <div className="grid gap-px border-t border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          {state.agents.map((a) => (
            <div key={a.id} className="bg-panel/60 px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="text-[0.7rem] text-foreground">{a.name}</p>
                <span
                  className={`flex items-center gap-1.5 text-[0.55rem] tracking-[0.16em] uppercase ${toneStatus(a.status)}`}
                >
                  <StatusDot /> {a.status}
                </span>
              </div>
              <p className="mt-1 text-[0.58rem] text-muted-foreground">{a.role}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.floor(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
