import { describe, expect, it } from "vitest";
import { guard, type GuardContext } from "@/lib/astraeon/guard";
import { CredentialGateway, defaultCredentials } from "@/lib/astraeon/vault";
import { RialoExecutor } from "@/lib/astraeon/rialo";
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

const destinations: DestinationRule[] = [
  {
    id: "dest-market-api",
    name: "Market Data API",
    kind: "API",
    address: "api.market",
    reputation: "VERIFIED",
  },
  {
    id: "dest-dex-router",
    name: "DEX Router",
    kind: "CONTRACT",
    address: "0xABC",
    reputation: "VERIFIED",
  },
];

const vault = new CredentialGateway(defaultCredentials());
const executor = new RialoExecutor();

function ctx(events: AuditEvent[] = []): GuardContext {
  return { agents: [agent], policies: [policy], destinations, events, vault, executor };
}

describe("transaction guard", () => {
  it("allows and executes an in-policy buy on-chain", () => {
    const events: AuditEvent[] = [];
    const r = guard(
      {
        agentId: agent.id,
        type: "BUY",
        asset: "BTC",
        amountUsd: 75,
        destinationId: "dest-dex-router",
      },
      ctx(events),
    );
    expect(r.decision.verdict).toBe("ALLOW");
    expect(r.event.status).toBe("EXECUTED");
    expect(r.event.txHash).toBeDefined();
    expect(r.event.txHash).not.toContain("gway_");
  });

  it("blocks a withdraw with critical risk", () => {
    const r = guard({ agentId: agent.id, type: "WITHDRAW", asset: "USDC", amountUsd: 1000 }, ctx());
    expect(r.decision.verdict).toBe("DENY");
    expect(r.event.status).toBe("BLOCKED");
    expect(r.decision.riskScore).toBeGreaterThanOrEqual(85);
  });

  it("denies unknown agents at identity check", () => {
    const r = guard({ agentId: "agent-ghost", type: "BUY", asset: "BTC", amountUsd: 10 }, ctx());
    expect(r.decision.verdict).toBe("DENY");
    expect(r.decision.reason).toContain("unknown agent");
  });

  it("detects velocity burst and signals pause", () => {
    const now = Date.now();
    const events: AuditEvent[] = Array.from({ length: 15 }, (_, i) => ({
      id: `burst-${i}`,
      agentId: agent.id,
      agentName: agent.name,
      timestamp: new Date(now - (15 - i) * 1000).toISOString(),
      type: "BUY",
      asset: "BTC",
      amountUsd: 75,
      actionLabel: "BUY",
      decision: "ALLOWED",
      verdict: "ALLOW",
      riskScore: 15,
      riskTier: "SAFE",
      reason: "ok",
      status: "EXECUTED",
    }));
    const r = guard(
      {
        agentId: agent.id,
        type: "BUY",
        asset: "BTC",
        amountUsd: 75,
        destinationId: "dest-dex-router",
      },
      ctx(events),
    );
    expect(r.anomalies.some((a) => a.kind === "VELOCITY_BURST")).toBe(true);
    expect(r.shouldPause).toBe(true);
  });

  it("proxies allowed API calls through the credential gateway", () => {
    const r = guard(
      { agentId: agent.id, type: "API_CALL", data: "Market Data", method: "/v1/market" },
      ctx(),
    );
    expect(r.decision.verdict).toBe("ALLOW");
    expect(r.event.status).toBe("EXECUTED");
    expect(r.event.txHash).toContain("gway_");
    const gw = r.gatewayData as { maskedCredential: string } | undefined;
    expect(gw?.maskedCredential).toContain("******");
  });

  it("denies API calls to services outside the agent's allowlist", () => {
    const r = guard(
      { agentId: agent.id, type: "API_CALL", data: "Weather", method: "/v1/forecast" },
      ctx(),
    );
    expect(r.decision.verdict).toBe("DENY");
    expect(r.decision.reason).toContain("Service allowlist");
  });
});
