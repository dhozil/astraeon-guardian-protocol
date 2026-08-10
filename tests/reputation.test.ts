import { describe, expect, it } from "vitest";
import { computeReputation, reputationTier } from "@/lib/astraeon/reputation";
import type { AnomalyEvent, AuditEvent } from "@/lib/astraeon/types";

function ev(over: Partial<AuditEvent>): AuditEvent {
  return {
    id: "x",
    agentId: "a1",
    agentName: "Agent",
    timestamp: new Date().toISOString(),
    type: "BUY",
    asset: "BTC",
    amountUsd: 50,
    actionLabel: "BUY",
    decision: "ALLOWED",
    verdict: "ALLOW",
    riskScore: 15,
    riskTier: "SAFE",
    reason: "ok",
    status: "EXECUTED",
    ...over,
  };
}

describe("agent reputation", () => {
  it("a clean history earns a high tier", () => {
    const events = Array.from({ length: 12 }, () => ev({}));
    const r = computeReputation("a1", events, []);
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(["A", "A+"].includes(r.tier)).toBe(true);
  });

  it("violations and anomalies lower the score", () => {
    const clean = Array.from({ length: 10 }, () => ev({}));
    const bad: AuditEvent[] = [
      ...clean,
      ev({
        decision: "DENIED",
        verdict: "DENY",
        riskScore: 95,
        riskTier: "CRITICAL",
        status: "BLOCKED",
      }),
    ];
    const anomalies: AnomalyEvent[] = [
      {
        id: "a",
        agentId: "a1",
        agentName: "Agent",
        timestamp: new Date().toISOString(),
        kind: "CRITICAL_RISK",
        detail: "x",
      },
    ];
    const good = computeReputation("a1", clean, []);
    const badR = computeReputation("a1", bad, anomalies);
    expect(badR.score).toBeLessThan(good.score);
  });

  it("tier thresholds are monotonic", () => {
    expect(reputationTier(95)).toBe("A+");
    expect(reputationTier(85)).toBe("A");
    expect(reputationTier(75)).toBe("B+");
    expect(reputationTier(55)).toBe("C");
  });
});
