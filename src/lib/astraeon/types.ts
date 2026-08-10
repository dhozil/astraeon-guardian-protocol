export type Asset = "BTC" | "ETH" | "USDC" | "USDT";

export const ASSETS: Asset[] = ["BTC", "ETH", "USDC", "USDT"];

export type ActionType =
  "API_CALL" | "BUY" | "SELL" | "SWAP" | "TRANSFER" | "WITHDRAW" | "CONTRACT_CALL";

export type AgentStatus = "ACTIVE" | "PAUSED" | "REVOKED";

export type RiskTier = "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const RISK_TIERS: RiskTier[] = ["SAFE", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

export type RiskTierRange = [number, number];

export const RISK_TIER_RANGES: Record<RiskTier, RiskTierRange> = {
  SAFE: [0, 20],
  LOW: [21, 40],
  MEDIUM: [41, 60],
  HIGH: [61, 80],
  CRITICAL: [81, 100],
};

export function tierForScore(score: number): RiskTier {
  if (score <= 20) return "SAFE";
  if (score <= 40) return "LOW";
  if (score <= 60) return "MEDIUM";
  if (score <= 80) return "HIGH";
  return "CRITICAL";
}

export interface DelegatedAuthority {
  wallet: string;
  maxDailyUsd: number;
  maxPerTxUsd: number;
  withdrawEnabled: boolean;
  expiresAt: string;
}

export interface Agent {
  id: string;
  name: string;
  owner: string;
  role: string;
  status: AgentStatus;
  trustLevel: string;
  createdAt: string;
  authority: DelegatedAuthority;
  policyId: string;
  baseline: {
    requestsPerHour: number;
    avgTxUsd: number;
    tradesPerHour: number;
  };
}

export interface DestinationRule {
  id: string;
  name: string;
  kind: "API" | "CONTRACT" | "WALLET";
  address: string;
  reputation: "VERIFIED" | "KNOWN" | "UNKNOWN";
}

export interface SpendingLimits {
  maxPerTransactionUsd: number;
  maxDailyUsd: number;
  maxWeeklyUsd: number;
  maxMonthlyUsd: number;
  maxTransactionsPerDay: number;
}

export interface VelocityLimit {
  maxTransactions: number;
  windowMinutes: number;
}

export interface Policy {
  id: string;
  name: string;
  agentId: string;
  allow: Asset[];
  deny: ActionType[];
  withdrawEnabled: boolean;
  spending: SpendingLimits;
  velocity: VelocityLimit;
  slippageLimitPercent: number;
  allowedDestinationIds: string[];
  riskLimit: number;
  approvalsAboveUsd: number;
  active: boolean;
}

export interface ActionRequest {
  agentId: string;
  type: ActionType;
  asset?: Asset | undefined;
  amountUsd?: number | undefined;
  destinationId?: string | undefined;
  contract?: string | undefined;
  method?: string | undefined;
  slippagePercent?: number | undefined;
  data?: string | undefined;
}

export type Verdict = "ALLOW" | "DENY" | "APPROVAL_REQUIRED";

export interface CheckResult {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  detail: string;
}

export interface Decision {
  verdict: Verdict;
  riskScore: number;
  riskTier: RiskTier;
  checks: CheckResult[];
  reason: string;
  approvalsRequired: number;
}

export type ExecutionStatus = "EXECUTED" | "SIMULATED" | "PENDING_APPROVAL" | "BLOCKED" | "FAILED";

export type EventDecision = "ALLOWED" | "DENIED" | "APPROVAL_REQUIRED";

export interface OnChainVerification {
  blockHeight: number;
  blockTimeSec: number | null;
  fee: number;
  err: unknown;
  logMessages: string[];
  computeUnits: number;
  verifiedAt: string;
}

export interface AuditEvent {
  id: string;
  agentId: string;
  agentName: string;
  timestamp: string;
  type: ActionType;
  asset?: Asset | undefined;
  amountUsd?: number | undefined;
  actionLabel: string;
  decision: EventDecision;
  verdict: Verdict;
  riskScore: number;
  riskTier: RiskTier;
  reason: string;
  policyId?: string | undefined;
  txHash?: string | undefined;
  status: ExecutionStatus;
  onChain?: OnChainVerification | undefined;
  /** System-generated event (e.g. auto-pause) — excluded from action metrics. */
  system?: boolean | undefined;
}

export interface AnomalyEvent {
  id: string;
  agentId: string;
  agentName: string;
  timestamp: string;
  kind: "VELOCITY_BURST" | "CRITICAL_RISK" | "POLICY_ESCAPE";
  detail: string;
}

export interface VaultCredential {
  id: string;
  service: string;
  destinationId: string;
  path: string;
  maskedKey: string;
  label: string;
}
