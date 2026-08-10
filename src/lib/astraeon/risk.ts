import type { ActionRequest, Agent, DestinationRule, RiskTier } from "./types";
import { tierForScore } from "./types";

const BASE_BY_TYPE: Record<string, number> = {
  API_CALL: 5,
  BUY: 14,
  SELL: 16,
  SWAP: 20,
  TRANSFER: 34,
  WITHDRAW: 60,
  CONTRACT_CALL: 26,
};

const DESTINATION_REDUCTION: Record<DestinationRule["reputation"], number> = {
  VERIFIED: -10,
  KNOWN: -4,
  UNKNOWN: 14,
};

function clamp(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export interface RiskInput {
  request: ActionRequest;
  agent: Agent;
  destination?: DestinationRule | undefined;
  windowTxCount: number;
  baselineTxPerWindow: number;
}

export interface RiskResult {
  score: number;
  tier: RiskTier;
  factors: string[];
}

export function evaluateRisk(input: RiskInput): RiskResult {
  const { request, agent, destination, windowTxCount, baselineTxPerWindow } = input;

  let score = BASE_BY_TYPE[request.type] ?? 12;
  const factors: string[] = [];

  if (request.amountUsd != null) {
    if (request.amountUsd > 0) {
      score += Math.min(24, request.amountUsd / 60);
      factors.push(`amount $${request.amountUsd}`);
    }
  }

  if (request.amountUsd != null && request.amountUsd > agent.authority.maxDailyUsd * 0.9) {
    score += 12;
    factors.push("amount near daily ceiling");
  }

  if (destination) {
    score += DESTINATION_REDUCTION[destination.reputation];
    factors.push(`destination ${destination.reputation.toLowerCase()}`);
  } else if (request.type !== "API_CALL") {
    score += 10;
    factors.push("unvetted destination");
  }

  if (request.type === "SWAP" && request.slippagePercent != null) {
    if (request.slippagePercent > 1) {
      score += Math.min(18, request.slippagePercent * 3);
      factors.push(`high slippage ${request.slippagePercent}%`);
    }
  }

  const burstRatio = baselineTxPerWindow > 0 ? windowTxCount / baselineTxPerWindow : 0;
  if (burstRatio > 2) {
    score += Math.min(20, (burstRatio - 2) * 6);
    factors.push("unusual request frequency");
  }

  if (request.type === "WITHDRAW") {
    if (!agent.authority.withdrawEnabled) {
      score += 30;
      factors.push("withdraw not delegated");
    }
  }

  score = clamp(score);
  return { score, tier: tierForScore(score), factors };
}
