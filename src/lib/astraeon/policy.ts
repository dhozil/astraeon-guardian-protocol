import type {
  ActionRequest,
  Agent,
  AuditEvent,
  CheckResult,
  Decision,
  DestinationRule,
  Policy,
} from "./types";

export interface LedgerWindow {
  lastDayUsd: number;
  lastWeekUsd: number;
  lastMonthUsd: number;
  todayCount: number;
}

export function computeLedger(events: AuditEvent[], now: number): LedgerWindow {
  const day = 24 * 60 * 60 * 1000;
  const dayStart = now - day;
  const weekStart = now - 7 * day;
  const monthStart = now - 30 * day;

  let lastDayUsd = 0;
  let lastWeekUsd = 0;
  let lastMonthUsd = 0;
  let todayCount = 0;

  for (const e of events) {
    if (e.status !== "EXECUTED") continue;
    const t = new Date(e.timestamp).getTime();
    const usd = e.amountUsd ?? 0;
    if (t >= monthStart) lastMonthUsd += usd;
    if (t >= weekStart) lastWeekUsd += usd;
    if (t >= dayStart) {
      lastDayUsd += usd;
      todayCount += 1;
    }
  }

  return { lastDayUsd, lastWeekUsd, lastMonthUsd, todayCount };
}

export interface PolicyContext {
  ledger: LedgerWindow;
  now: number;
  destination?: DestinationRule | undefined;
  apiCallsInWindow?: number | undefined;
}

export interface PolicyDecisionInput {
  request: ActionRequest;
  agent: Agent;
  policy: Policy;
  riskScore: number;
  ctx: PolicyContext;
}

function check(checks: CheckResult[], name: string, ok: boolean, detail: string): void {
  checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
}

export function evaluatePolicy(input: PolicyDecisionInput): Decision {
  const { request, agent, policy, riskScore, ctx } = input;
  const checks: CheckResult[] = [];
  const approvalsRequired = policy.approvalsAboveUsd > 0 ? 1 : 0;

  check(checks, "Identity", agent.status === "ACTIVE", `agent ${agent.status}`);
  check(checks, "Policy active", policy.active, policy.name);
  check(
    checks,
    "Delegation expiry",
    new Date(agent.authority.expiresAt).getTime() > ctx.now,
    agent.authority.expiresAt,
  );

  if (request.type !== "API_CALL") {
    const assetOk = request.asset != null && policy.allow.includes(request.asset);
    check(checks, "Asset allowlist", assetOk, request.asset ?? "none");
  } else {
    // Credential Gateway: the requested service must map to an API destination
    // that this agent's policy explicitly allows, and stay under the velocity cap.
    const serviceAllowed =
      ctx.destination != null &&
      ctx.destination.kind === "API" &&
      policy.allowedDestinationIds.includes(ctx.destination.id);
    check(
      checks,
      "Service allowlist",
      serviceAllowed,
      ctx.destination?.name ?? request.data ?? "unknown",
    );
    if (ctx.apiCallsInWindow != null) {
      check(
        checks,
        "API rate limit",
        ctx.apiCallsInWindow < policy.velocity.maxTransactions,
        `${ctx.apiCallsInWindow}/${policy.velocity.maxTransactions} in ${policy.velocity.windowMinutes}m`,
      );
    }
  }

  const typeDenied = policy.deny.includes(request.type);
  if (request.type === "WITHDRAW") {
    check(
      checks,
      "Withdraw enabled",
      policy.withdrawEnabled && agent.authority.withdrawEnabled,
      "policy or delegation disabled",
    );
  } else {
    check(checks, "Action not denied", !typeDenied, request.type);
  }

  if (request.amountUsd != null) {
    check(checks, "Amount positive", request.amountUsd > 0, `$${request.amountUsd}`);
    check(
      checks,
      "Max per transaction",
      request.amountUsd <= policy.spending.maxPerTransactionUsd,
      `$${request.amountUsd} <= $${policy.spending.maxPerTransactionUsd}`,
    );
    check(
      checks,
      "Daily budget",
      ctx.ledger.lastDayUsd + request.amountUsd <= policy.spending.maxDailyUsd,
      `$${Math.round(ctx.ledger.lastDayUsd + request.amountUsd)} <= $${policy.spending.maxDailyUsd}`,
    );
    check(
      checks,
      "Weekly budget",
      ctx.ledger.lastWeekUsd + request.amountUsd <= policy.spending.maxWeeklyUsd,
      `$${Math.round(ctx.ledger.lastWeekUsd + request.amountUsd)} <= $${policy.spending.maxWeeklyUsd}`,
    );
    check(
      checks,
      "Monthly budget",
      ctx.ledger.lastMonthUsd + request.amountUsd <= policy.spending.maxMonthlyUsd,
      `$${Math.round(ctx.ledger.lastMonthUsd + request.amountUsd)} <= $${policy.spending.maxMonthlyUsd}`,
    );
  }

  check(
    checks,
    "Daily tx count",
    ctx.ledger.todayCount < policy.spending.maxTransactionsPerDay,
    `${ctx.ledger.todayCount}/${policy.spending.maxTransactionsPerDay}`,
  );

  if (request.type === "SWAP" && request.slippagePercent != null) {
    check(
      checks,
      "Slippage limit",
      request.slippagePercent <= policy.slippageLimitPercent,
      `${request.slippagePercent}% <= ${policy.slippageLimitPercent}%`,
    );
  }

  if (request.destinationId != null) {
    const allowed = policy.allowedDestinationIds.includes(request.destinationId);
    check(checks, "Destination allowlist", allowed, ctx.destination?.name ?? request.destinationId);
  }

  check(checks, "Risk limit", riskScore <= policy.riskLimit, `${riskScore} <= ${policy.riskLimit}`);

  const failed = checks.filter((c) => c.status === "FAIL");
  if (failed.length > 0) {
    const first = failed[0];
    return {
      verdict: "DENY",
      riskScore,
      riskTier: tierForRisk(riskScore),
      checks,
      reason: `${first?.name}: ${first?.detail ?? "failed"}`,
      approvalsRequired: 0,
    };
  }

  if (request.amountUsd != null && request.amountUsd > policy.approvalsAboveUsd) {
    return {
      verdict: "APPROVAL_REQUIRED",
      riskScore,
      riskTier: tierForRisk(riskScore),
      checks,
      reason: `exceeds approval threshold $${policy.approvalsAboveUsd}`,
      approvalsRequired,
    };
  }

  return {
    verdict: "ALLOW",
    riskScore,
    riskTier: tierForRisk(riskScore),
    checks,
    reason: "all policy checks passed",
    approvalsRequired: 0,
  };
}

function tierForRisk(score: number): Decision["riskTier"] {
  if (score <= 20) return "SAFE";
  if (score <= 40) return "LOW";
  if (score <= 60) return "MEDIUM";
  if (score <= 80) return "HIGH";
  return "CRITICAL";
}

export function decisionTone(verdict: Decision["verdict"]): "ok" | "warn" | "alert" {
  if (verdict === "ALLOW") return "ok";
  if (verdict === "APPROVAL_REQUIRED") return "warn";
  return "alert";
}
