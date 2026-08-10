import type { AnomalyEvent, AuditEvent } from "./types";

export interface Reputation {
  agentId: string;
  score: number;
  tier: string;
  tasks: number;
  executed: number;
  denied: number;
  successRate: number;
  avgRisk: number;
  anomalies: number;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function reputationTier(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  return "C";
}

/**
 * Computes an agent's reputation from its audit trail and anomaly events,
 * following the thesis §23 model (success rate, policy violations, average
 * risk, historical behavior).
 */
export function computeReputation(
  agentId: string,
  events: AuditEvent[],
  anomalies: AnomalyEvent[],
): Reputation {
  const agentEvents = events.filter((e) => e.agentId === agentId && !e.system);
  const tasks = agentEvents.length;
  const executed = agentEvents.filter((e) => e.status === "EXECUTED").length;
  const denied = agentEvents.filter((e) => e.decision === "DENIED").length;
  const successRate = tasks > 0 ? executed / tasks : 1;
  const avgRisk = tasks > 0 ? agentEvents.reduce((sum, e) => sum + e.riskScore, 0) / tasks : 0;
  const anomalyCount = anomalies.filter((a) => a.agentId === agentId).length;

  let score = 50;
  score += (successRate - 0.5) * 60; // −30 … +30
  score -= denied * 6; // each policy violation −6
  score -= anomalyCount * 12; // each anomaly −12
  if (avgRisk > 30) score -= (avgRisk - 30) * 0.25;
  score += Math.min(10, tasks * 0.5); // history
  score += Math.min(8, executed / 100); // scale

  const final = clamp(score);
  return {
    agentId,
    score: final,
    tier: reputationTier(final),
    tasks,
    executed,
    denied,
    successRate,
    avgRisk,
    anomalies: anomalyCount,
  };
}
