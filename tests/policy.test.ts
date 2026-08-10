import { describe, expect, it } from "vitest";
import { evaluateRisk } from "@/lib/astraeon/risk";
import { evaluatePolicy, computeLedger, type PolicyContext } from "@/lib/astraeon/policy";
import { tierForScore } from "@/lib/astraeon/types";
import type { Agent, AuditEvent, DestinationRule, Policy } from "@/lib/astraeon/types";

const agent: Agent = {
  id: "agent-trader-01",
  name: "TradingBot-01",
  owner: "0x7F…A3E9",
  role: "Trading Agent",
  status: "ACTIVE",
  trustLevel: "B+",
  createdAt: new Date().toISOString(),
  authority: {
    wallet: "0x7F…A3E9",
    maxDailyUsd: 500,
    maxPerTxUsd: 100,
    withdrawEnabled: false,
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
  },
  policyId: "pol-trader-01",
  baseline: { requestsPerHour: 10, tradesPerHour: 3, avgTxUsd: 80 },
};

const policy: Policy = {
  id: "pol-trader-01",
  name: "Safe Trading Policy",
  agentId: "agent-trader-01",
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
  allowedDestinationIds: ["dest-dex-router", "dest-market-api"],
  riskLimit: 60,
  approvalsAboveUsd: 500,
  active: true,
};

const destVerified: DestinationRule = {
  id: "dest-dex-router",
  name: "DEX Router",
  kind: "CONTRACT",
  address: "0xABC",
  reputation: "VERIFIED",
};
const destUnknown: DestinationRule = {
  id: "dest-unknown",
  name: "Unknown DEX",
  kind: "CONTRACT",
  address: "0xDEF",
  reputation: "UNKNOWN",
};

function ctx(
  events: AuditEvent[] = [],
  destination?: DestinationRule,
  apiCallsInWindow?: number,
): PolicyContext {
  return {
    ledger: computeLedger(events, Date.now()),
    now: Date.now(),
    destination,
    apiCallsInWindow,
  };
}

describe("risk engine", () => {
  it("scores low-risk buy as SAFE", () => {
    const r = evaluateRisk({
      request: {
        agentId: agent.id,
        type: "BUY",
        asset: "BTC",
        amountUsd: 75,
        destinationId: "dest-dex-router",
      },
      agent,
      destination: destVerified,
      windowTxCount: 1,
      baselineTxPerWindow: 10,
    });
    expect(r.score).toBeLessThanOrEqual(40);
    expect(r.tier).toBe("SAFE");
  });

  it("scores withdraw critically high", () => {
    const r = evaluateRisk({
      request: { agentId: agent.id, type: "WITHDRAW", asset: "USDC", amountUsd: 1000 },
      agent,
      windowTxCount: 0,
      baselineTxPerWindow: 1,
    });
    expect(r.score).toBeGreaterThanOrEqual(85);
    expect(r.tier).toBe("CRITICAL");
  });

  it("unknown destination raises risk", () => {
    const a = evaluateRisk({
      request: {
        agentId: agent.id,
        type: "SWAP",
        asset: "ETH",
        amountUsd: 50,
        destinationId: "dest-unknown",
      },
      agent,
      destination: destUnknown,
      windowTxCount: 1,
      baselineTxPerWindow: 10,
    });
    const b = evaluateRisk({
      request: {
        agentId: agent.id,
        type: "SWAP",
        asset: "ETH",
        amountUsd: 50,
        destinationId: "dest-dex-router",
      },
      agent,
      destination: destVerified,
      windowTxCount: 1,
      baselineTxPerWindow: 10,
    });
    expect(a.score).toBeGreaterThan(b.score);
  });

  it("tier boundaries are correct", () => {
    expect(tierForScore(0)).toBe("SAFE");
    expect(tierForScore(20)).toBe("SAFE");
    expect(tierForScore(21)).toBe("LOW");
    expect(tierForScore(41)).toBe("MEDIUM");
    expect(tierForScore(61)).toBe("HIGH");
    expect(tierForScore(81)).toBe("CRITICAL");
  });
});

describe("policy engine", () => {
  it("allows an in-policy buy", () => {
    const d = evaluatePolicy({
      request: {
        agentId: agent.id,
        type: "BUY",
        asset: "BTC",
        amountUsd: 75,
        destinationId: "dest-dex-router",
      },
      agent,
      policy,
      riskScore: 12,
      ctx: ctx([], destVerified),
    });
    expect(d.verdict).toBe("ALLOW");
  });

  it("rejects non-positive amounts", () => {
    expect(
      evaluatePolicy({
        request: {
          agentId: agent.id,
          type: "BUY",
          asset: "BTC",
          amountUsd: 0,
          destinationId: "dest-dex-router",
        },
        agent,
        policy,
        riskScore: 5,
        ctx: ctx([], destVerified),
      }).verdict,
    ).toBe("DENY");
    expect(
      evaluatePolicy({
        request: {
          agentId: agent.id,
          type: "BUY",
          asset: "BTC",
          amountUsd: -40,
          destinationId: "dest-dex-router",
        },
        agent,
        policy,
        riskScore: 5,
        ctx: ctx([], destVerified),
      }).verdict,
    ).toBe("DENY");
  });

  it("rejects withdrawal (disabled)", () => {
    const d = evaluatePolicy({
      request: { agentId: agent.id, type: "WITHDRAW", asset: "BTC", amountUsd: 100 },
      agent,
      policy,
      riskScore: 95,
      ctx: ctx(),
    });
    expect(d.verdict).toBe("DENY");
    expect(d.reason).toContain("Withdraw");
  });

  it("denies once daily budget is exceeded", () => {
    const spent: AuditEvent[] = Array.from({ length: 5 }, (_, i) => ({
      id: `e${i}`,
      agentId: agent.id,
      agentName: agent.name,
      timestamp: new Date().toISOString(),
      type: "BUY",
      asset: "BTC",
      amountUsd: 100,
      actionLabel: "BUY",
      decision: "ALLOWED",
      verdict: "ALLOW",
      riskScore: 20,
      riskTier: "LOW",
      reason: "ok",
      status: "EXECUTED",
    }));
    const d = evaluatePolicy({
      request: {
        agentId: agent.id,
        type: "BUY",
        asset: "BTC",
        amountUsd: 100,
        destinationId: "dest-dex-router",
      },
      agent,
      policy,
      riskScore: 20,
      ctx: ctx(spent, destVerified),
    });
    expect(d.verdict).toBe("DENY");
    expect(d.reason).toContain("Daily budget");
  });

  it("requires approval above the threshold", () => {
    const wide: Policy = {
      ...policy,
      spending: { ...policy.spending, maxPerTransactionUsd: 1000, maxDailyUsd: 5000 },
      approvalsAboveUsd: 500,
    };
    const d = evaluatePolicy({
      request: {
        agentId: agent.id,
        type: "BUY",
        asset: "BTC",
        amountUsd: 600,
        destinationId: "dest-dex-router",
      },
      agent,
      policy: wide,
      riskScore: 30,
      ctx: ctx([], destVerified),
    });
    expect(d.verdict).toBe("APPROVAL_REQUIRED");
  });

  it("enforces service allowlist for API calls", () => {
    const apiDest: DestinationRule = {
      id: "dest-market-api",
      name: "Market Data API",
      kind: "API",
      address: "api",
      reputation: "VERIFIED",
    };
    const allowed = evaluatePolicy({
      request: { agentId: agent.id, type: "API_CALL", data: "Market Data" },
      agent,
      policy,
      riskScore: 5,
      ctx: ctx([], apiDest, 0),
    });
    expect(allowed.verdict).toBe("ALLOW");
    const denied = evaluatePolicy({
      request: { agentId: agent.id, type: "API_CALL", data: "Weather" },
      agent,
      policy,
      riskScore: 5,
      ctx: ctx([], undefined, 0),
    });
    expect(denied.verdict).toBe("DENY");
    expect(denied.reason).toContain("Service allowlist");
  });

  it("enforces API rate limit via velocity", () => {
    const apiDest: DestinationRule = {
      id: "dest-market-api",
      name: "Market Data API",
      kind: "API",
      address: "api",
      reputation: "VERIFIED",
    };
    const d = evaluatePolicy({
      request: { agentId: agent.id, type: "API_CALL", data: "Market Data" },
      agent,
      policy,
      riskScore: 5,
      ctx: ctx([], apiDest, 5),
    });
    expect(d.verdict).toBe("DENY");
    expect(d.reason).toContain("rate limit");
  });

  it("rejects when agent is paused or expired", () => {
    const paused: Agent = { ...agent, status: "PAUSED" };
    expect(
      evaluatePolicy({
        request: {
          agentId: agent.id,
          type: "BUY",
          asset: "BTC",
          amountUsd: 50,
          destinationId: "dest-dex-router",
        },
        agent: paused,
        policy,
        riskScore: 10,
        ctx: ctx([], destVerified),
      }).verdict,
    ).toBe("DENY");
  });
});
