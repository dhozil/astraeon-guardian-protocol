import { useState } from "react";
import { useAstraeon } from "@/lib/astraeon/store";
import { Panel, PanelTitle, Pill, GhostButton, GoldSolidButton } from "./bits";

export function ApprovalsPanel() {
  const { state, approveAction, rejectAction } = useAstraeon();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const pending = state.events.filter((e) => state.pendingApprovals.includes(e.id));

  const approve = async (eventId: string) => {
    setProcessingId(eventId);
    try {
      await approveAction(eventId);
    } finally {
      setProcessingId(null);
    }
  };

  if (pending.length === 0) {
    return (
      <Panel>
        <PanelTitle>Human-in-the-Loop</PanelTitle>
        <div className="px-5 py-16 text-center">
          <p className="font-display text-xl tracking-[0.08em] text-muted-foreground/60 uppercase">
            No pending approvals
          </p>
          <p className="mx-auto mt-3 max-w-md text-[0.66rem] leading-relaxed text-muted-foreground">
            Actions above the approval threshold route here for a human decision. Submit a
            high-value action in the Action Console (e.g. DeFiGuardian rebalancing $180, or
            TreasuryAgent above $400) to see it queued.
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      {pending.map((e) => {
        const agent = state.agents.find((a) => a.id === e.agentId);
        const isProcessing = processingId === e.id;
        return (
          <Panel key={e.id}>
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-[0.76rem] text-foreground">{e.actionLabel}</p>
                  <Pill tone="warn">Approval Required</Pill>
                </div>
                <p className="mt-1.5 text-[0.62rem] leading-relaxed text-muted-foreground">
                  {e.agentName} · risk {e.riskScore}/100 · {e.reason}
                  {agent ? ` · threshold $${agent.authority.maxPerTxUsd > 0 ? "100+" : "0"}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <GhostButton
                  tone="alert"
                  onClick={() => rejectAction(e.id)}
                  disabled={isProcessing}
                >
                  Reject
                </GhostButton>
                <GoldSolidButton onClick={() => void approve(e.id)} disabled={isProcessing}>
                  {isProcessing ? "Approving…" : "Approve"}
                </GoldSolidButton>
              </div>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
