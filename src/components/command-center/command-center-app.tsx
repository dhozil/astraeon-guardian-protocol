import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TempleMark, RialoMark } from "@/components/astraeon/primitives";
import { useAstraeon } from "@/lib/astraeon/store";
import { truncateAddress } from "@/lib/astraeon/wallet";
import { OverviewPanel } from "./overview-panel";
import { AgentsPanel } from "./agents-panel";
import { ActionConsole } from "./action-console";
import { PolicyPanel } from "./policy-panel";
import { AuditPanel } from "./audit-panel";
import { VaultPanel } from "./vault-panel";
import { ApprovalsPanel } from "./approvals-panel";
import { DemoPanel } from "./demo-panel";
import { AnomalyPanel } from "./anomaly-panel";
import { OperatorGate } from "./operator-gate";
import { StatusDot } from "./bits";

type Tab =
  | "overview"
  | "agents"
  | "actions"
  | "policies"
  | "audit"
  | "credentials"
  | "approvals"
  | "anomalies"
  | "demo";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "agents", label: "Agents" },
  { id: "actions", label: "Action Console" },
  { id: "policies", label: "Policies" },
  { id: "audit", label: "Audit Trail" },
  { id: "credentials", label: "Credentials" },
  { id: "approvals", label: "Approvals" },
  { id: "anomalies", label: "Anomalies" },
  { id: "demo", label: "Demo" },
];

function Sidebar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { state, connection } = useAstraeon();
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col justify-between border-r border-hairline bg-background/80 backdrop-blur-xl">
      <div>
        <div className="flex items-center gap-2.5 border-b border-hairline px-5 py-5">
          <TempleMark className="h-7 w-7" />
          <div className="leading-none">
            <p className="font-display text-sm tracking-[0.24em] text-foreground">ASTRAEON</p>
            <p className="mt-1.5 text-[0.48rem] tracking-[0.3em] text-gold/70 uppercase">
              Trust. Execute. Empower.
            </p>
          </div>
        </div>
        <nav className="px-3 py-4">
          {TABS.map((t) => {
            const badge =
              t.id === "approvals" && state.pendingApprovals.length > 0
                ? state.pendingApprovals.length
                : t.id === "audit"
                  ? state.events.length
                  : undefined;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex w-full items-center justify-between border-l-2 px-4 py-2.5 text-left text-[0.68rem] tracking-wide uppercase transition-colors",
                  tab === t.id
                    ? "border-gold bg-gold/10 text-gold"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{t.label}</span>
                {badge != null ? (
                  <span className="flex h-4 min-w-4 items-center justify-center border border-gold/40 px-1 text-[0.5rem] text-gold">
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-hairline px-5 py-4">
        <div className="flex items-center justify-between border border-hairline px-3 py-2.5">
          <div className="flex items-center gap-2">
            <StatusDot className={connection.reachable ? "text-ok" : "text-warn"} />
            <div className="leading-tight">
              <p className="text-[0.45rem] tracking-[0.2em] text-muted-foreground uppercase">
                {connection.reachable ? "Connected to" : "Simulated"}
              </p>
              <p className="text-[0.6rem] text-foreground/90">{connection.network}</p>
              <p className="font-mono text-[0.48rem] text-muted-foreground">
                {connection.reachable && connection.blockHeight != null
                  ? `block ${connection.blockHeight}`
                  : "RPC not reachable"}
              </p>
            </div>
          </div>
          <RialoMark className="h-3 w-3 text-gold/70" />
        </div>
      </div>
    </aside>
  );
}

function Header({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between border-b border-hairline px-8 py-6">
      <div>
        <h1 className="font-display text-2xl tracking-[0.08em] text-foreground uppercase">
          {title}
        </h1>
        <p className="mt-1.5 text-[0.68rem] tracking-wide text-muted-foreground">{subtitle}</p>
      </div>
      {right}
    </div>
  );
}

export function CommandCenterApp() {
  const [tab, setTab] = useState<Tab>("overview");
  const { state, connection, refreshConnection, treasury, operatorUnlocked, lockOperator } =
    useAstraeon();

  const panels: Record<Tab, ReactNode> = {
    overview: <OverviewPanel />,
    agents: <AgentsPanel />,
    actions: <ActionConsole />,
    policies: <PolicyPanel />,
    audit: <AuditPanel />,
    credentials: <VaultPanel />,
    approvals: <ApprovalsPanel />,
    anomalies: <AnomalyPanel />,
    demo: <DemoPanel />,
  };

  const headerCopy: Record<Tab, { title: string; subtitle: string }> = {
    overview: {
      title: "Overview",
      subtitle: "Monitor, protect, and empower your autonomous agents.",
    },
    agents: {
      title: "Agents",
      subtitle: "Identity, delegated authority, and operational control.",
    },
    actions: {
      title: "Action Console",
      subtitle: "Submit an action and watch the guard pipeline decide.",
    },
    policies: { title: "Policies", subtitle: "Declarative boundaries enforced before execution." },
    audit: { title: "Audit Trail", subtitle: "Every action, decision, and execution, recorded." },
    credentials: {
      title: "Credential Gateway",
      subtitle: "Agents never hold the keys. Astraeon does.",
    },
    approvals: {
      title: "Approvals",
      subtitle: "Human-in-the-loop decisions for high-value actions.",
    },
    anomalies: {
      title: "Anomalies & Reputation",
      subtitle: "Unusual behavior is flagged; trust is earned from verifiable behavior.",
    },
    demo: { title: "Guided Demo", subtitle: "The Astraeon story, scene by scene." },
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar tab={tab} setTab={setTab} />
      <main className="min-w-0 flex-1">
        <Header
          title={headerCopy[tab].title}
          subtitle={headerCopy[tab].subtitle}
          right={
            <div className="flex items-center gap-3 text-[0.6rem] text-muted-foreground">
              <span
                className={`flex items-center gap-2 border px-2.5 py-1.5 tracking-wider ${
                  operatorUnlocked ? "border-ok/40 text-ok" : "border-crimson/40 text-crimson"
                }`}
                title="Operator session"
              >
                <StatusDot /> {operatorUnlocked ? "Operator active" : "Locked"}
              </span>
              {operatorUnlocked ? (
                <button
                  type="button"
                  onClick={lockOperator}
                  className="border border-hairline px-2.5 py-1.5 tracking-wider transition-colors hover:border-crimson/50 hover:text-crimson"
                >
                  Lock
                </button>
              ) : null}
              <span
                className={`flex items-center gap-2 border px-2.5 py-1.5 tracking-wider ${
                  connection.reachable ? "border-ok/40 text-ok" : "border-warn/40 text-warn"
                }`}
              >
                <StatusDot /> {connection.reachable ? "Connected" : "Simulated"}
              </span>
              <button
                type="button"
                onClick={() => void refreshConnection()}
                className="border border-hairline px-2.5 py-1.5 tracking-wider transition-colors hover:border-gold/50 hover:text-gold"
                title="Re-probe Rialo RPC"
              >
                RPC:{" "}
                {connection.blockHeight != null && connection.reachable
                  ? `#${connection.blockHeight}`
                  : "offline"}
              </button>
              <span
                className="border border-hairline px-2.5 py-1.5 tracking-wider"
                title="Operator wallet (owned by the console operator)"
              >
                {treasury ? truncateAddress(treasury.address) : "…"}
              </span>
              {connection.balanceKelvin != null && connection.reachable ? (
                <span className="border border-hairline px-2.5 py-1.5 tracking-wider text-gold/80">
                  {(Number(connection.balanceKelvin) / 1_000_000_000).toFixed(2)} RLO
                </span>
              ) : null}
            </div>
          }
        />
        <div className="px-8 py-8">{operatorUnlocked ? panels[tab] : <OperatorGate />}</div>
      </main>
    </div>
  );
}
