import { Bell, ChevronRight, Settings2, Wallet } from "lucide-react";
import { useMemo } from "react";
import { useAstraeon } from "@/lib/astraeon/store";
import { truncateAddress } from "@/lib/astraeon/wallet";
import { TempleMark, RialoMark } from "./primitives";

const SIDEBAR = [
  "Overview",
  "Agents",
  "Policies",
  "Transactions",
  "Credentials",
  "Permissions",
  "Treasury",
  "Alerts",
  "Analytics",
  "Settings",
];

const SPARK = [18, 26, 22, 34, 30, 46, 40, 58, 52, 66, 61, 78, 70, 88];

function Sparkline() {
  const w = 100;
  const h = 34;
  const max = Math.max(...SPARK);
  const pts = SPARK.map((v, i) => {
    const x = (i / (SPARK.length - 1)) * w;
    const y = h - (v / max) * (h - 4) - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = `M ${pts.join(" L ")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-16 w-full">
      <defs>
        <linearGradient id="astra-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ok)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--ok)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L ${w},${h} L 0,${h} Z`} fill="url(#astra-spark)" />
      <path
        d={line}
        fill="none"
        stroke="var(--ok)"
        strokeWidth="0.8"
        vectorEffect="non-scaling-stroke"
        strokeDasharray="260"
        strokeDashoffset="260"
        style={{ animation: "astra-dash 2.6s ease-out forwards" }}
      />
      <style>{`@keyframes astra-dash { to { stroke-dashoffset: 0; } }`}</style>
    </svg>
  );
}

function HealthRing({
  healthy,
  warn,
  critical,
}: {
  healthy: number;
  warn: number;
  critical: number;
}) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const total = Math.max(1, healthy + warn + critical);
  const h = healthy / total;
  const w = warn / total;
  const k = critical / total;
  return (
    <svg viewBox="0 0 64 64" className="h-24 w-24 -rotate-90">
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--hairline)" strokeWidth="5" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="var(--ok)"
        strokeWidth="5"
        strokeDasharray={`${c * h} ${c}`}
      />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="var(--warn)"
        strokeWidth="5"
        strokeDasharray={`${c * w} ${c}`}
        strokeDashoffset={`${-c * h}`}
      />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="var(--crimson)"
        strokeWidth="5"
        strokeDasharray={`${c * k} ${c}`}
        strokeDashoffset={`${-c * (h + w)}`}
      />
    </svg>
  );
}

export function CommanderDashboard() {
  const { state, metrics, connection, treasury } = useAstraeon();

  const activity = useMemo(
    () =>
      [...state.events]
        .slice(-4)
        .reverse()
        .map((e) => ({
          agent: e.agentName,
          detail: e.actionLabel,
          time: timeAgo(e.timestamp),
          state:
            e.status === "EXECUTED"
              ? "Executed"
              : e.status === "PENDING_APPROVAL"
                ? "Approval"
                : "Blocked",
        })),
    [state.events],
  );

  const topAgents = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of state.events) counts.set(e.agentId, (counts.get(e.agentId) ?? 0) + 1);
    return state.agents
      .map((a) => ({
        name: a.name,
        pct: Math.min(
          100,
          Math.round(((counts.get(a.id) ?? 0) / Math.max(1, state.events.length)) * 100) + 8,
        ),
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4);
  }, [state.agents, state.events]);

  const healthy = state.agents.filter((a) => a.status === "ACTIVE").length;
  const paused = state.agents.filter((a) => a.status === "PAUSED").length;
  const revoked = state.agents.filter((a) => a.status === "REVOKED").length;
  const healthPct = Math.round((healthy / Math.max(1, state.agents.length)) * 100);

  return (
    <div className="grid min-w-[860px] grid-cols-[168px_1fr] bg-panel/95 text-[0.7rem] shadow-[var(--shadow-panel)] backdrop-blur-xl">
      {/* Sidebar */}
      <aside className="flex flex-col justify-between border-r border-hairline bg-background/70 py-5">
        <div>
          <div className="flex items-center gap-2 px-4 pb-5">
            <TempleMark className="h-5 w-5" />
            <div>
              <p className="font-display text-[0.68rem] tracking-[0.2em]">ASTRAEON</p>
              <p className="text-[0.42rem] tracking-[0.28em] text-gold/60 uppercase">
                Trust. Execute. Empower.
              </p>
            </div>
          </div>
          <nav className="space-y-0.5">
            {SIDEBAR.map((item, i) => (
              <div
                key={item}
                className={`flex items-center justify-between px-4 py-[7px] text-[0.66rem] tracking-wide ${
                  i === 0
                    ? "border-l-2 border-gold bg-gold/10 text-gold"
                    : "border-l-2 border-transparent text-muted-foreground"
                }`}
              >
                <span>{item}</span>
                {i === 0 ? <ChevronRight className="h-3 w-3" /> : null}
              </div>
            ))}
          </nav>
        </div>
        <div className="mx-4 mt-6 flex items-center justify-between border border-hairline px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`pulse-dot h-1.5 w-1.5 rounded-full ${connection.reachable ? "bg-ok" : "bg-warn"}`}
            />
            <div className="leading-tight">
              <p className="text-[0.45rem] tracking-[0.2em] text-muted-foreground uppercase">
                {connection.reachable ? "Connected to" : "Simulated"}
              </p>
              <p className="text-[0.6rem] text-foreground/90">
                {connection.network}
                {connection.blockHeight != null && connection.reachable
                  ? ` · #${connection.blockHeight}`
                  : ""}
              </p>
            </div>
          </div>
          <RialoMark className="h-3 w-3 text-gold/70" />
        </div>
      </aside>

      {/* Main */}
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[0.66rem] text-muted-foreground">Welcome back,</p>
            <h3 className="font-serif text-2xl tracking-wide text-foreground">Commander.</h3>
            <p className="mt-1 max-w-[15rem] text-[0.62rem] leading-relaxed text-muted-foreground">
              Monitor, protect, and empower your autonomous agents.
            </p>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Bell className="h-3.5 w-3.5" />
            <Settings2 className="h-3.5 w-3.5" />
            <span className="flex items-center gap-2 border border-hairline px-2.5 py-1.5 text-[0.6rem] tracking-wider">
              <Wallet className="h-3 w-3 text-gold/80" />{" "}
              {treasury ? truncateAddress(treasury.address) : "…"}
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3">
          {[
            { label: "Total Agents", value: String(metrics.totalAgents), delta: "", up: true },
            {
              label: "Actions Evaluated",
              value: metrics.actionsEvaluated.toLocaleString(),
              delta: "",
              up: true,
            },
            { label: "Executed Txns", value: String(metrics.executedTxns), delta: "", up: true },
            {
              label: "Blocked Actions",
              value: String(metrics.blockedActions),
              delta: "",
              up: false,
            },
          ].map((m) => (
            <div key={m.label} className="border border-hairline bg-background/50 px-3 py-3">
              <p className="text-[0.45rem] tracking-[0.18em] text-muted-foreground uppercase">
                {m.label}
              </p>
              <div className="mt-2 flex items-end justify-between">
                <span className="font-display text-xl leading-none text-foreground">{m.value}</span>
                <span className={`text-[0.55rem] ${m.up ? "text-ok" : "text-crimson"}`}>
                  {m.delta}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-[1.35fr_1fr] gap-3">
          <div className="border border-hairline bg-background/50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[0.45rem] tracking-[0.18em] text-muted-foreground uppercase">
                Requests over time
              </p>
              <span className="border border-hairline px-1.5 py-0.5 text-[0.5rem] text-muted-foreground">
                24H
              </span>
            </div>
            <Sparkline />
          </div>
          <div className="border border-hairline bg-background/50 p-3">
            <p className="text-[0.45rem] tracking-[0.18em] text-muted-foreground uppercase">
              Agent health
            </p>
            <div className="mt-1 flex items-center gap-3">
              <div className="relative">
                <HealthRing healthy={healthy} warn={paused} critical={revoked} />
                <span className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-sm text-foreground">{healthPct}%</span>
                  <span className="text-[0.42rem] text-muted-foreground">Healthy</span>
                </span>
              </div>
              <ul className="space-y-1.5 text-[0.58rem]">
                {[
                  ["Healthy", healthy, "bg-ok"],
                  ["Paused", paused, "bg-crimson"],
                  ["Revoked", revoked, "bg-warn"],
                ].map(([k, v, color]) => (
                  <li key={k} className="flex items-center gap-2 text-muted-foreground">
                    <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
                    <span className="w-14">{k}</span>
                    <span className="text-foreground">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[1.35fr_1fr] gap-3">
          <div className="border border-hairline bg-background/50 p-3">
            <p className="text-[0.45rem] tracking-[0.18em] text-muted-foreground uppercase">
              Recent activity
            </p>
            <ul className="mt-2 divide-y divide-border">
              {activity.length === 0
                ? null
                : activity.map((a) => (
                    <li key={a.agent} className="flex items-center justify-between gap-2 py-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center border border-hairline text-[0.5rem] text-gold/70">
                          ◇
                        </span>
                        <div className="leading-tight">
                          <p className="text-[0.62rem] text-foreground">{a.agent}</p>
                          <p className="text-[0.55rem] text-muted-foreground">{a.detail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-[0.5rem] text-muted-foreground">{a.time}</span>
                        <span
                          className={`border px-1.5 py-0.5 text-[0.48rem] tracking-[0.12em] uppercase ${
                            a.state === "Blocked"
                              ? "border-crimson/40 text-crimson"
                              : "border-ok/40 text-ok"
                          }`}
                        >
                          {a.state}
                        </span>
                      </div>
                    </li>
                  ))}
            </ul>
          </div>
          <div className="border border-hairline bg-background/50 p-3">
            <p className="text-[0.45rem] tracking-[0.18em] text-muted-foreground uppercase">
              Top agents
            </p>
            <ul className="mt-3 space-y-3">
              {topAgents.map((a) => (
                <li key={a.name}>
                  <div className="flex items-center justify-between text-[0.58rem]">
                    <span className="text-muted-foreground">{a.name}</span>
                    <span className="text-foreground">{a.pct}%</span>
                  </div>
                  <div className="mt-1.5 h-[3px] w-full bg-hairline">
                    <div
                      className="h-full bg-[image:var(--gradient-gold)]"
                      style={{ width: `${a.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
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
