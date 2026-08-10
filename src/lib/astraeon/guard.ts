import type {
  ActionRequest,
  Agent,
  AnomalyEvent,
  AuditEvent,
  Decision,
  DestinationRule,
  EventDecision,
  Policy,
  VaultCredential,
} from "./types";
import { evaluatePolicy, computeLedger, type PolicyContext } from "./policy";
import { evaluateRisk, type RiskInput } from "./risk";
import { tierForScore } from "./types";
import { CredentialGateway } from "./vault";
import { RialoExecutor, type RialoSimulation, type RialoExecutionResult } from "./rialo";
import { isoNow, nextId } from "./audit";

export interface GuardContext {
  agents: Agent[];
  policies: Policy[];
  destinations: DestinationRule[];
  events: AuditEvent[];
  vault: CredentialGateway;
  executor: RialoExecutor;
  now?: Date;
}

export interface GuardResult {
  event: AuditEvent;
  decision: Decision;
  simulation?: RialoSimulation;
  execution?: RialoExecutionResult;
  anomalies: AnomalyEvent[];
  shouldPause: boolean;
  gatewayData?: unknown;
}

const BURST_WINDOW_MS = 60 * 1000;
const BURST_THRESHOLD = 15;
const CRITICAL_RISK_THRESHOLD = 85;

function actionLabel(req: ActionRequest): string {
  const asset = req.asset ?? "";
  const amount = req.amountUsd != null ? `$${req.amountUsd}` : "";
  const subject = [req.type.replaceAll("_", " "), asset, amount].filter(Boolean).join(" ");
  return subject || "ACTION";
}

function decisionToEventDecision(v: Decision["verdict"]): EventDecision {
  if (v === "ALLOW") return "ALLOWED";
  if (v === "APPROVAL_REQUIRED") return "APPROVAL_REQUIRED";
  return "DENIED";
}

function detectAnomalies(
  request: ActionRequest,
  agent: Agent,
  riskScore: number,
  events: AuditEvent[],
  now: number,
): AnomalyEvent[] {
  const anomalies: AnomalyEvent[] = [];
  const recent = events.filter(
    (e) => e.agentId === agent.id && new Date(e.timestamp).getTime() > now - BURST_WINDOW_MS,
  );
  if (recent.length >= BURST_THRESHOLD) {
    anomalies.push({
      id: nextId("anom"),
      agentId: agent.id,
      agentName: agent.name,
      timestamp: isoNow(new Date(now)),
      kind: "VELOCITY_BURST",
      detail: `${recent.length} requests in 60s (limit ${BURST_THRESHOLD})`,
    });
  }
  if (riskScore >= CRITICAL_RISK_THRESHOLD) {
    anomalies.push({
      id: nextId("anom"),
      agentId: agent.id,
      agentName: agent.name,
      timestamp: isoNow(new Date(now)),
      kind: "CRITICAL_RISK",
      detail: `action scored ${riskScore}/100`,
    });
  }
  if (request.amountUsd != null && request.amountUsd > agent.baseline.avgTxUsd * 8) {
    const ratio =
      request.amountUsd > 0
        ? Math.round(request.amountUsd / Math.max(1, agent.baseline.avgTxUsd))
        : 0;
    anomalies.push({
      id: nextId("anom"),
      agentId: agent.id,
      agentName: agent.name,
      timestamp: isoNow(new Date(now)),
      kind: "POLICY_ESCAPE",
      detail: `amount $${request.amountUsd} is ${ratio}x above baseline`,
    });
  }
  return anomalies;
}

export function guard(request: ActionRequest, ctx: GuardContext): GuardResult {
  const now = (ctx.now ?? new Date()).getTime();
  const agent = ctx.agents.find((a) => a.id === request.agentId);
  const policy = agent ? ctx.policies.find((p) => p.id === agent.policyId) : undefined;

  const mkEvent = (partial: {
    decision: EventDecision;
    verdict: Decision["verdict"];
    riskScore: number;
    reason: string;
    status: AuditEvent["status"];
    policyId?: string;
    txHash?: string;
  }): AuditEvent => ({
    id: nextId("ev"),
    agentId: agent?.id ?? request.agentId,
    agentName: agent?.name ?? "unknown agent",
    timestamp: isoNow(new Date(now)),
    type: request.type,
    asset: request.asset,
    amountUsd: request.amountUsd,
    actionLabel: actionLabel(request),
    decision: partial.decision,
    verdict: partial.verdict,
    riskScore: partial.riskScore,
    riskTier: tierForScore(partial.riskScore),
    reason: partial.reason,
    policyId: partial.policyId,
    txHash: partial.txHash,
    status: partial.status,
  });

  if (!agent || !policy) {
    const e = mkEvent({
      decision: "DENIED",
      verdict: "DENY",
      riskScore: 100,
      reason: !agent ? "unknown agent identity" : "no policy bound to agent",
      status: "BLOCKED",
    });
    return {
      event: e,
      decision: {
        verdict: "DENY",
        riskScore: 100,
        riskTier: "CRITICAL",
        checks: [],
        reason: e.reason,
        approvalsRequired: 0,
      },
      anomalies: [],
      shouldPause: false,
    };
  }

  let destination = request.destinationId
    ? ctx.destinations.find((d) => d.id === request.destinationId)
    : undefined;

  // For API_CALL the requested service resolves through the credential vault
  // to its destination, so the policy can enforce the service allowlist.
  let apiCredential: VaultCredential | undefined;
  if (request.type === "API_CALL") {
    const service = request.data ?? "Market Data";
    const credential = ctx.vault.findByService(service);
    apiCredential = credential;
    if (credential != null) {
      destination = ctx.destinations.find((d) => d.id === credential.destinationId);
    }
  }

  const ledger = computeLedger(ctx.events, now);
  const apiCallsInWindow = policy.velocity
    ? ctx.events.filter(
        (e) =>
          e.agentId === agent.id &&
          e.type === "API_CALL" &&
          new Date(e.timestamp).getTime() > now - policy.velocity.windowMinutes * 60_000,
      ).length
    : 0;
  const policyCtx: PolicyContext = { ledger, now, destination, apiCallsInWindow };

  const riskInput: RiskInput = {
    request,
    agent,
    destination,
    windowTxCount: ctx.events.filter((e) => new Date(e.timestamp).getTime() > now - BURST_WINDOW_MS)
      .length,
    baselineTxPerWindow: Math.max(1, Math.round(agent.baseline.requestsPerHour / 60)),
  };
  const risk = evaluateRisk(riskInput);

  const decision = evaluatePolicy({
    request,
    agent,
    policy,
    riskScore: risk.score,
    ctx: policyCtx,
  });

  const anomalies = detectAnomalies(request, agent, risk.score, ctx.events, now);
  const shouldPause = anomalies.some(
    (a) => a.kind === "VELOCITY_BURST" || a.kind === "CRITICAL_RISK",
  );

  const simReq = {
    agentId: agent.id,
    agentName: agent.name,
    actionLabel: actionLabel(request),
    asset: request.asset,
    amountUsd: request.amountUsd,
    method: request.method,
    destination: request.destinationId,
  };

  if (decision.verdict === "DENY") {
    const e = mkEvent({
      decision: "DENIED",
      verdict: "DENY",
      riskScore: risk.score,
      reason: decision.reason,
      status: "BLOCKED",
      policyId: policy.id,
    });
    return { event: e, decision, anomalies, shouldPause };
  }

  if (decision.verdict === "APPROVAL_REQUIRED") {
    const e = mkEvent({
      decision: "APPROVAL_REQUIRED",
      verdict: "APPROVAL_REQUIRED",
      riskScore: risk.score,
      reason: decision.reason,
      status: "PENDING_APPROVAL",
      policyId: policy.id,
    });
    return { event: e, decision, anomalies, shouldPause };
  }

  const simulation = ctx.executor.simulate(simReq);

  if (request.type === "API_CALL") {
    const service = apiCredential?.service ?? request.data ?? "Market Data";
    const path = apiCredential?.path ?? request.method ?? "/v1/market";
    const gatewayData = ctx.vault.proxy({ agentId: agent.id, service, path });
    const e = mkEvent({
      decision: "ALLOWED",
      verdict: "ALLOW",
      riskScore: risk.score,
      reason: `allowed; proxied via credential gateway → ${destination?.name ?? service}`,
      status: "EXECUTED",
      policyId: policy.id,
      txHash: "gway_" + nextId("px").slice(-8),
    });
    return { event: e, decision, simulation, anomalies, shouldPause, gatewayData };
  }

  const execution = ctx.executor.execute(simReq);
  const e = mkEvent({
    decision: "ALLOWED",
    verdict: "ALLOW",
    riskScore: risk.score,
    reason: "allowed; executed through Rialo",
    status: execution.status === "CONFIRMED" ? "EXECUTED" : "FAILED",
    policyId: policy.id,
    txHash: execution.txHash,
  });
  return { event: e, decision, simulation, execution, anomalies, shouldPause };
}
