import { useMemo, useState } from "react";
import { useAstraeon } from "@/lib/astraeon/store";
import { isRealOnChainHash } from "@/lib/astraeon/rialo";
import { Panel, PanelTitle, Pill, Th, Td, toneTier } from "./bits";
import { cn } from "@/lib/utils";

const FILTERS = ["ALL", "EXECUTED", "BLOCKED", "APPROVAL", "DENIED"] as const;

export function AuditPanel() {
  const { state, verifyOnChain } = useAstraeon();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [verifying, setVerifying] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = [...state.events].reverse();
    if (filter === "ALL") return list;
    if (filter === "DENIED") return list.filter((e) => e.decision === "DENIED");
    return list.filter((e) => e.status === filter);
  }, [state.events, filter]);

  const verify = async (eventId: string) => {
    setVerifying(eventId);
    try {
      await verifyOnChain(eventId);
    } finally {
      setVerifying(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[0.68rem] text-muted-foreground">{rows.length} events</p>
        <div className="flex gap-px border border-hairline bg-hairline">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-[0.55rem] tracking-[0.16em] uppercase transition-colors",
                filter === f
                  ? "bg-panel-2 text-gold"
                  : "bg-panel/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <Panel>
        <div className="max-h-[62vh] overflow-auto">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead className="sticky top-0 bg-panel">
              <tr>
                <Th>Time</Th>
                <Th>Agent</Th>
                <Th>Action</Th>
                <Th>Risk</Th>
                <Th>Decision</Th>
                <Th>Status</Th>
                <Th>On-Chain</Th>
                <Th>Reason / Hash</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="transition-colors hover:bg-panel-2/40">
                  <Td className="whitespace-nowrap text-[0.62rem] text-muted-foreground">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <span className="text-[0.72rem]">{e.agentName}</span>
                  </Td>
                  <Td>
                    <span className="text-[0.68rem]">{e.actionLabel}</span>
                  </Td>
                  <Td>
                    <span className={cn("font-mono text-[0.66rem]", toneTier(e.riskTier))}>
                      {e.riskScore}
                    </span>
                  </Td>
                  <Td>
                    <Pill
                      tone={
                        e.decision === "ALLOWED"
                          ? "ok"
                          : e.decision === "APPROVAL_REQUIRED"
                            ? "warn"
                            : "alert"
                      }
                    >
                      {e.decision}
                    </Pill>
                  </Td>
                  <Td>
                    <Pill
                      tone={
                        e.status === "EXECUTED"
                          ? "ok"
                          : e.status === "PENDING_APPROVAL"
                            ? "warn"
                            : "alert"
                      }
                    >
                      {e.status}
                    </Pill>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {isRealOnChainHash(e.txHash) ? (
                      e.onChain ? (
                        <span className="flex flex-col gap-0.5 text-[0.58rem]">
                          <span className="text-ok">✓ verified on-chain</span>
                          <span className="font-mono text-muted-foreground">
                            block {e.onChain.blockHeight.toLocaleString()} · fee {e.onChain.fee}
                          </span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void verify(e.id)}
                          disabled={verifying === e.id}
                          className="border border-hairline px-2 py-1 text-[0.55rem] uppercase tracking-wider text-muted-foreground transition-colors hover:border-gold/50 hover:text-gold disabled:opacity-40"
                        >
                          {verifying === e.id ? "Verifying…" : "Verify"}
                        </button>
                      )
                    ) : (
                      <span className="text-[0.58rem] text-muted-foreground/50">—</span>
                    )}
                  </Td>
                  <Td className="max-w-[16rem]">
                    <p className="truncate text-[0.62rem] text-muted-foreground">{e.reason}</p>
                    {e.txHash ? (
                      <p className="mt-0.5 truncate font-mono text-[0.55rem] text-gold/70">
                        {e.txHash}
                      </p>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
