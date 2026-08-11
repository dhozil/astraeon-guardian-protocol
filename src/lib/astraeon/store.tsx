import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  ActionRequest,
  Agent,
  AnomalyEvent,
  AuditEvent,
  DestinationRule,
  Policy,
} from "./types";
import { guard, type GuardResult } from "./guard";
import { CredentialGateway, defaultCredentials } from "./vault";
import {
  RialoExecutor,
  RialoJsonRpcTransport,
  isRealOnChainHash,
  type RialoConnectionInfo,
  type RialoExecutionResult,
} from "./rialo";
import { isoNow, nextId } from "./audit";
import {
  generateWallet,
  bs58Encode,
  sanitizeWallet,
  PLACEHOLDER_OPERATOR_ADDRESS,
  type RialoWallet,
} from "./wallet";
import type { OnChainVerification } from "./types";

export const vault = new CredentialGateway(defaultCredentials());
export const executor = new RialoExecutor();

export interface AstraeonState {
  agents: Agent[];
  policies: Policy[];
  destinations: DestinationRule[];
  events: AuditEvent[];
  anomalies: AnomalyEvent[];
  pendingApprovals: string[];
}

export interface Metrics {
  totalAgents: number;
  activeAgents: number;
  pausedAgents: number;
  actionsEvaluated: number;
  executedTxns: number;
  blockedActions: number;
  policyViolations: number;
  capitalProtected: number;
  todaySpend: number;
  pendingApprovals: number;
  anomalies: number;
}

export interface ChainInfo {
  blockHeight: number;
  transactionCount: number;
  configHashPrefix: string;
  nodeTimeMs: number;
}

function freshExpiry(days = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function append<T>(list: T[], item: T, cap = 500): T[] {
  return [...list, item].slice(-cap);
}

function seedState(): AstraeonState {
  const now = Date.now();
  const ts = (offsetMin: number) => new Date(now - offsetMin * 60_000).toISOString();

  const tradingPolicy: Policy = {
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
    allowedDestinationIds: ["dest-dex-router", "dest-uniswap", "dest-market-api"],
    riskLimit: 60,
    approvalsAboveUsd: 500,
    active: true,
  };

  const researchPolicy: Policy = {
    id: "pol-research-01",
    name: "Read-Only Research Policy",
    agentId: "agent-research-01",
    allow: ["BTC", "ETH", "USDC"],
    deny: ["WITHDRAW", "TRANSFER", "CONTRACT_CALL"],
    withdrawEnabled: false,
    spending: {
      maxPerTransactionUsd: 50,
      maxDailyUsd: 100,
      maxWeeklyUsd: 400,
      maxMonthlyUsd: 1600,
      maxTransactionsPerDay: 20,
    },
    velocity: { maxTransactions: 10, windowMinutes: 10 },
    slippageLimitPercent: 1,
    allowedDestinationIds: ["dest-market-api", "dest-coingecko"],
    riskLimit: 50,
    approvalsAboveUsd: 100,
    active: true,
  };

  const defiPolicy: Policy = {
    id: "pol-defi-01",
    name: "DeFi Risk Manager Policy",
    agentId: "agent-defi-01",
    allow: ["BTC", "ETH", "USDC", "USDT"],
    deny: ["WITHDRAW"],
    withdrawEnabled: false,
    spending: {
      maxPerTransactionUsd: 200,
      maxDailyUsd: 500,
      maxWeeklyUsd: 2000,
      maxMonthlyUsd: 8000,
      maxTransactionsPerDay: 15,
    },
    velocity: { maxTransactions: 8, windowMinutes: 10 },
    slippageLimitPercent: 2,
    allowedDestinationIds: ["dest-dex-router", "dest-uniswap"],
    riskLimit: 70,
    approvalsAboveUsd: 150,
    active: true,
  };

  const treasuryPolicy: Policy = {
    id: "pol-treasury-01",
    name: "Treasury Guard Policy",
    agentId: "agent-treasury-01",
    allow: ["USDC", "USDT"],
    deny: ["WITHDRAW"],
    withdrawEnabled: false,
    spending: {
      maxPerTransactionUsd: 500,
      maxDailyUsd: 1000,
      maxWeeklyUsd: 4000,
      maxMonthlyUsd: 15000,
      maxTransactionsPerDay: 5,
    },
    velocity: { maxTransactions: 3, windowMinutes: 10 },
    slippageLimitPercent: 1,
    allowedDestinationIds: ["dest-treasury-wallet", "dest-dex-router"],
    riskLimit: 60,
    approvalsAboveUsd: 400,
    active: true,
  };

  const agents: Agent[] = [
    {
      id: "agent-trader-01",
      name: "TradingBot-01",
      owner: PLACEHOLDER_OPERATOR_ADDRESS,
      role: "Trading Agent",
      status: "ACTIVE",
      trustLevel: "B+",
      createdAt: ts(60 * 24 * 5),
      authority: {
        wallet: PLACEHOLDER_OPERATOR_ADDRESS,
        maxDailyUsd: 500,
        maxPerTxUsd: 100,
        withdrawEnabled: false,
        expiresAt: freshExpiry(30),
      },
      policyId: "pol-trader-01",
      baseline: { requestsPerHour: 10, tradesPerHour: 3, avgTxUsd: 80 },
    },
    {
      id: "agent-research-01",
      name: "ResearchAgent",
      owner: PLACEHOLDER_OPERATOR_ADDRESS,
      role: "Research Agent",
      status: "ACTIVE",
      trustLevel: "A-",
      createdAt: ts(60 * 24 * 3),
      authority: {
        wallet: PLACEHOLDER_OPERATOR_ADDRESS,
        maxDailyUsd: 100,
        maxPerTxUsd: 50,
        withdrawEnabled: false,
        expiresAt: freshExpiry(30),
      },
      policyId: "pol-research-01",
      baseline: { requestsPerHour: 20, tradesPerHour: 0, avgTxUsd: 15 },
    },
    {
      id: "agent-defi-01",
      name: "DeFiGuardian",
      owner: PLACEHOLDER_OPERATOR_ADDRESS,
      role: "DeFi Risk Manager",
      status: "ACTIVE",
      trustLevel: "A",
      createdAt: ts(60 * 24 * 2),
      authority: {
        wallet: PLACEHOLDER_OPERATOR_ADDRESS,
        maxDailyUsd: 500,
        maxPerTxUsd: 200,
        withdrawEnabled: false,
        expiresAt: freshExpiry(30),
      },
      policyId: "pol-defi-01",
      baseline: { requestsPerHour: 12, tradesPerHour: 2, avgTxUsd: 90 },
    },
    {
      id: "agent-treasury-01",
      name: "TreasuryAgent",
      owner: PLACEHOLDER_OPERATOR_ADDRESS,
      role: "Treasury Manager",
      status: "ACTIVE",
      trustLevel: "A+",
      createdAt: ts(60 * 24),
      authority: {
        wallet: PLACEHOLDER_OPERATOR_ADDRESS,
        maxDailyUsd: 1000,
        maxPerTxUsd: 500,
        withdrawEnabled: false,
        expiresAt: freshExpiry(30),
      },
      policyId: "pol-treasury-01",
      baseline: { requestsPerHour: 4, tradesPerHour: 1, avgTxUsd: 220 },
    },
  ];

  const destinations: DestinationRule[] = [
    {
      id: "dest-market-api",
      name: "Market Data API",
      kind: "API",
      address: "api.market.example",
      reputation: "VERIFIED",
    },
    {
      id: "dest-coingecko",
      name: "CoinGecko API",
      kind: "API",
      address: "api.coingecko.com",
      reputation: "VERIFIED",
    },
    {
      id: "dest-weather",
      name: "Weather API",
      kind: "API",
      address: "api.weather.example",
      reputation: "VERIFIED",
    },
    {
      id: "dest-dex-router",
      name: "DEX Router",
      kind: "CONTRACT",
      address: "9vXm…Q1z2",
      reputation: "VERIFIED",
    },
    {
      id: "dest-uniswap",
      name: "Uniswap",
      kind: "CONTRACT",
      address: "2kQw…P8u9",
      reputation: "VERIFIED",
    },
    {
      id: "dest-unknown-dex",
      name: "Unknown DEX",
      kind: "CONTRACT",
      address: "3nRy…Z7x1",
      reputation: "UNKNOWN",
    },
    {
      id: "dest-treasury-wallet",
      name: "Treasury Vault",
      kind: "WALLET",
      address: "7mJz…W4T2",
      reputation: "VERIFIED",
    },
  ];

  const events: AuditEvent[] = [
    {
      id: "ev-seed-1",
      agentId: "agent-trader-01",
      agentName: "TradingBot-01",
      timestamp: ts(12),
      type: "SWAP",
      asset: "ETH",
      amountUsd: 120,
      actionLabel: "SWAP 120 USDC → ETH",
      decision: "ALLOWED",
      verdict: "ALLOW",
      riskScore: 18,
      riskTier: "SAFE",
      reason: "all policy checks passed",
      policyId: "pol-trader-01",
      txHash: "8XvZ…q2m7",
      status: "EXECUTED",
    },
    {
      id: "ev-seed-2",
      agentId: "agent-research-01",
      agentName: "ResearchAgent",
      timestamp: ts(5),
      type: "API_CALL",
      actionLabel: "API CALL CoinGecko /prices",
      decision: "ALLOWED",
      verdict: "ALLOW",
      riskScore: 8,
      riskTier: "SAFE",
      reason: "allowed; proxied via credential gateway",
      policyId: "pol-research-01",
      txHash: "gway_px_a91c",
      status: "EXECUTED",
    },
    {
      id: "ev-seed-3",
      agentId: "agent-trader-01",
      agentName: "TradingBot-01",
      timestamp: ts(7),
      type: "API_CALL",
      actionLabel: "API CALL Market Data /v1/market",
      decision: "ALLOWED",
      verdict: "ALLOW",
      riskScore: 9,
      riskTier: "SAFE",
      reason: "allowed; proxied via credential gateway",
      policyId: "pol-trader-01",
      txHash: "gway_px_b77f",
      status: "EXECUTED",
    },
    {
      id: "ev-seed-4",
      agentId: "agent-treasury-01",
      agentName: "TreasuryAgent",
      timestamp: ts(3),
      type: "WITHDRAW",
      asset: "USDC",
      amountUsd: 500,
      actionLabel: "WITHDRAW USDC $500",
      decision: "DENIED",
      verdict: "DENY",
      riskScore: 98,
      riskTier: "CRITICAL",
      reason: "Withdraw enabled: policy or delegation disabled",
      policyId: "pol-treasury-01",
      status: "BLOCKED",
    },
  ];

  return {
    agents,
    policies: [tradingPolicy, researchPolicy, defiPolicy, treasuryPolicy],
    destinations,
    events,
    anomalies: [],
    pendingApprovals: [],
  };
}

function computeMetrics(state: AstraeonState): Metrics {
  const agentEvents = state.events.filter((e) => !e.system);
  const executed = agentEvents.filter((e) => e.status === "EXECUTED");
  const day = 24 * 60 * 60 * 1000;
  const todaySpend = executed
    .filter((e) => new Date(e.timestamp).getTime() > Date.now() - day)
    .reduce((sum, e) => sum + (e.amountUsd ?? 0), 0);
  return {
    totalAgents: state.agents.length,
    activeAgents: state.agents.filter((a) => a.status === "ACTIVE").length,
    pausedAgents: state.agents.filter((a) => a.status === "PAUSED").length,
    actionsEvaluated: agentEvents.length,
    executedTxns: executed.length,
    blockedActions: agentEvents.filter((e) => e.status === "BLOCKED").length,
    policyViolations: agentEvents.filter((e) => e.decision === "DENIED").length,
    capitalProtected: executed.reduce((sum, e) => sum + (e.amountUsd ?? 0), 0),
    todaySpend,
    pendingApprovals: state.pendingApprovals.length,
    anomalies: state.anomalies.length,
  };
}

function applyResult(state: AstraeonState, result: GuardResult): AstraeonState {
  let next: AstraeonState = {
    ...state,
    events: append(state.events, result.event),
    anomalies: [...state.anomalies, ...result.anomalies].slice(-50),
    pendingApprovals:
      result.event.status === "PENDING_APPROVAL" &&
      !state.pendingApprovals.includes(result.event.id)
        ? [...state.pendingApprovals, result.event.id]
        : state.pendingApprovals,
  };
  if (result.shouldPause) {
    const anom = result.anomalies[0];
    next = pauseAgent(
      next,
      result.event.agentId,
      anom ? `auto-paused: ${anom.detail}` : "auto-paused: anomaly detected",
    );
  }
  return next;
}

function pauseAgent(state: AstraeonState, agentId: string, reason: string): AstraeonState {
  return {
    ...state,
    agents: state.agents.map((a) => (a.id === agentId ? { ...a, status: "PAUSED" } : a)),
    events: append(state.events, {
      id: nextId("ev"),
      agentId,
      agentName: state.agents.find((a) => a.id === agentId)?.name ?? "unknown",
      timestamp: isoNow(),
      type: "CONTRACT_CALL",
      actionLabel: "AGENT AUTO-PAUSED",
      decision: "DENIED",
      verdict: "DENY",
      riskScore: 100,
      riskTier: "CRITICAL",
      reason,
      status: "BLOCKED",
      system: true,
    }),
  };
}

export interface StoreApi {
  state: AstraeonState;
  metrics: Metrics;
  connection: RialoConnectionInfo;
  chainInfo: ChainInfo | null;
  treasury: RialoWallet | null;
  rememberKey: boolean;
  setRememberKey(value: boolean): void;
  ensureTreasury(): Promise<RialoWallet | null>;
  refreshConnection(): Promise<RialoConnectionInfo>;
  refreshChainInfo(): Promise<ChainInfo | null>;
  fundTreasury(): Promise<RialoExecutionResult | null>;
  submitAction(request: ActionRequest, opts?: { onChain?: boolean }): Promise<GuardResult>;
  approveAction(eventId: string): Promise<void>;
  rejectAction(eventId: string): void;
  verifyOnChain(eventId: string): Promise<OnChainVerification | null>;
  pauseAgent(agentId: string, reason: string): void;
  resumeAgent(agentId: string): void;
  revokeAgent(agentId: string): void;
  createAgent(agent: Agent, policy: Policy): void;
  updatePolicy(policy: Policy): void;
  reset(): void;
}

const StoreContext = createContext<StoreApi | null>(null);

const STORAGE_KEY = "astraeon-state-v1";
const WALLET_KEY = "astraeon-wallet-v1";
const WALLET_PREFS_KEY = "astraeon-wallet-prefs-v1";

function isValidState(s: unknown): s is AstraeonState {
  if (!s || typeof s !== "object") return false;
  const st = s as Partial<AstraeonState>;
  return (
    Array.isArray(st.agents) &&
    Array.isArray(st.policies) &&
    Array.isArray(st.destinations) &&
    Array.isArray(st.events) &&
    Array.isArray(st.anomalies) &&
    Array.isArray(st.pendingApprovals) &&
    st.agents.every(
      (a) =>
        a &&
        typeof a === "object" &&
        typeof a.id === "string" &&
        typeof a.name === "string" &&
        typeof a.role === "string" &&
        typeof a.policyId === "string" &&
        typeof a.authority === "object" &&
        a.authority != null &&
        typeof a.authority.expiresAt === "string" &&
        (a.status === "ACTIVE" || a.status === "PAUSED" || a.status === "REVOKED"),
    ) &&
    st.policies.every(
      (p) =>
        p &&
        typeof p === "object" &&
        typeof p.id === "string" &&
        typeof p.agentId === "string" &&
        typeof p.spending === "object" &&
        p.spending != null &&
        typeof p.velocity === "object" &&
        p.velocity != null,
    )
  );
}

function isValidWallet(s: unknown): s is RialoWallet {
  if (!s || typeof s !== "object") return false;
  const w = s as Partial<RialoWallet>;
  return (
    typeof w.address === "string" &&
    /^[1-9A-HJ-NP-Za-km-z]{40,44}$/.test(w.address) &&
    typeof w.publicKeyB64 === "string" &&
    typeof w.createdAt === "string" &&
    (w.privateKeyJwk === undefined || typeof w.privateKeyJwk === "string")
  );
}

async function withSettlement(wallet: RialoWallet): Promise<RialoWallet> {
  if (wallet.settlementAddress) return wallet;
  const kp = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const rawPub = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  return { ...wallet, settlementAddress: bs58Encode(rawPub) };
}

export function AstraeonProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AstraeonState>(() => seedState());
  const [connection, setConnection] = useState<RialoConnectionInfo>(executor.connection);
  const [chainInfo, setChainInfo] = useState<ChainInfo | null>(null);
  const [treasury, setTreasury] = useState<RialoWallet | null>(null);
  const [rememberKey, setRememberKeyState] = useState(false);
  const onChainBusyRef = useRef(false);
  const treasuryPromiseRef = useRef<Promise<RialoWallet> | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (isValidState(parsed)) setState(parsed);
      }
    } catch {
      // storage may be unavailable or corrupted; ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const probe = (address?: string) =>
      executor.connect(address).then((info) => {
        if (!cancelled) setConnection(info);
      });

    const init = async () => {
      let remember = false;
      try {
        const prefsRaw = window.localStorage.getItem(WALLET_PREFS_KEY);
        if (prefsRaw) {
          const prefs = JSON.parse(prefsRaw) as { rememberKey?: boolean };
          remember = prefs.rememberKey === true;
        }
      } catch {
        // ignore prefs
      }
      setRememberKeyState(remember);

      // Viewing does not require a wallet. Only a previously remembered key is
      // restored so signing keeps working across reloads; otherwise the wallet
      // is created lazily on the first action that needs it.
      try {
        const raw = window.localStorage.getItem(WALLET_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as unknown;
          if (isValidWallet(parsed) && parsed.privateKeyJwk && parsed.privateKeyJwk.length > 0) {
            let wallet = parsed;
            if (!parsed.settlementAddress) {
              wallet = await withSettlement(parsed);
              try {
                window.localStorage.setItem(
                  WALLET_KEY,
                  JSON.stringify(remember ? wallet : sanitizeWallet(wallet)),
                );
              } catch {
                // ignore
              }
            }
            if (cancelled) return;
            setTreasury(wallet);
            void probe(wallet.address);
          }
        }
      } catch {
        // ignore
      }
      void probe();
    };
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const transport = executor.transport;
    if (transport instanceof RialoJsonRpcTransport) {
      void Promise.all([
        transport.getBlockHeight(),
        transport.getTransactionCount(),
        transport.getConfigHashPrefix(),
        transport.getNodeTimeMs(),
      ])
        .then(([blockHeight, transactionCount, configHashPrefix, nodeTimeMs]) => {
          if (cancelled) return;
          setChainInfo({
            blockHeight,
            transactionCount,
            configHashPrefix: configHashPrefix.toString(),
            nodeTimeMs,
          });
        })
        .catch(() => {
          // chain info is best-effort
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage may be unavailable; ignore
    }
  }, [state]);

  const api = useMemo<StoreApi>(() => {
    const run = (fn: (s: AstraeonState) => AstraeonState) => setState((s) => fn(s));

    const refreshBalance = async () => {
      if (!treasury) return;
      const info = await executor.connect(treasury.address);
      setConnection(info);
    };

    const refreshChainInfo = async (): Promise<ChainInfo | null> => {
      const transport = executor.transport as RialoJsonRpcTransport | null;
      if (!(transport instanceof RialoJsonRpcTransport)) return null;
      try {
        const [blockHeight, transactionCount, configHashPrefix, nodeTimeMs] = await Promise.all([
          transport.getBlockHeight(),
          transport.getTransactionCount(),
          transport.getConfigHashPrefix(),
          transport.getNodeTimeMs(),
        ]);
        const info: ChainInfo = {
          blockHeight,
          transactionCount,
          configHashPrefix: configHashPrefix.toString(),
          nodeTimeMs,
        };
        setChainInfo(info);
        return info;
      } catch {
        return null;
      }
    };

    const patchEvent = (eventId: string, patch: Partial<AuditEvent>) =>
      run((s) => ({
        ...s,
        events: s.events.map((e) => (e.id === eventId ? { ...e, ...patch } : e)),
      }));

    // Creates the operator wallet on demand. Viewing never requires it; the
    // first action that needs a signer triggers creation.
    const ensureTreasury = async (): Promise<RialoWallet | null> => {
      if (treasury) return treasury;
      if (treasuryPromiseRef.current) return treasuryPromiseRef.current;
      const promise = generateWallet().then((wallet) => {
        setTreasury(wallet);
        try {
          const payload = rememberKey ? wallet : sanitizeWallet(wallet);
          window.localStorage.setItem(WALLET_KEY, JSON.stringify(payload));
        } catch {
          // storage may be unavailable; ignore
        }
        void executor.connect(wallet.address).then((info) => setConnection(info));
        return wallet;
      });
      treasuryPromiseRef.current = promise;
      try {
        return await promise;
      } finally {
        treasuryPromiseRef.current = null;
      }
    };

    return {
      state,
      metrics: computeMetrics(state),
      connection,
      chainInfo,
      treasury,
      rememberKey,
      ensureTreasury,
      setRememberKey: (value) => {
        setRememberKeyState(value);
        try {
          window.localStorage.setItem(WALLET_PREFS_KEY, JSON.stringify({ rememberKey: value }));
        } catch {
          // ignore
        }
        if (treasury) {
          try {
            const payload = value ? treasury : sanitizeWallet(treasury);
            window.localStorage.setItem(WALLET_KEY, JSON.stringify(payload));
          } catch {
            // ignore
          }
        }
      },
      refreshConnection: async () => {
        const info = await executor.connect(treasury?.address);
        setConnection(info);
        return info;
      },
      refreshChainInfo,
      fundTreasury: async () => {
        const wallet = await ensureTreasury();
        if (!wallet) return null;
        const result = await executor.executeOnChain(
          { agentId: "operator", agentName: "Operator Wallet", actionLabel: "OPERATOR FUNDING" },
          { address: wallet.address, kelvins: 1_000_000_000, cooldownMs: 0 },
        );
        if (!result.simulated) {
          run((s) => ({
            ...s,
            events: append(s.events, {
              id: nextId("ev"),
              agentId: "operator",
              agentName: "Operator Wallet",
              timestamp: isoNow(),
              type: "TRANSFER",
              actionLabel: "OPERATOR FUNDING (airdrop)",
              decision: "ALLOWED",
              verdict: "ALLOW",
              riskScore: 0,
              riskTier: "SAFE",
              reason: result.result,
              txHash: result.txHash,
              status: "EXECUTED",
            }),
          }));
          void refreshBalance();
        }
        return result;
      },
      submitAction: async (request, opts) => {
        const result = guard(request, {
          agents: state.agents,
          policies: state.policies,
          destinations: state.destinations,
          events: state.events,
          vault,
          executor,
        });
        run((s) => applyResult(s, result));

        if (
          opts?.onChain !== false &&
          result.execution &&
          result.event.status === "EXECUTED" &&
          (result.event.amountUsd ?? 0) > 0
        ) {
          const wallet = await ensureTreasury();
          if (!wallet || onChainBusyRef.current) return result;
          onChainBusyRef.current = true;
          try {
            const real = await executor.executeOnChain(
              {
                agentId: result.event.agentId,
                agentName: result.event.agentName,
                actionLabel: result.event.actionLabel,
                actionType: result.event.type,
                asset: result.event.asset,
                amountUsd: result.event.amountUsd,
              },
              {
                address: wallet.address,
                recipient: wallet.settlementAddress,
                privateKeyJwk: wallet.privateKeyJwk,
              },
            );
            if (!real.simulated) {
              patchEvent(result.event.id, { txHash: real.txHash, reason: real.result });
              void refreshBalance();
              return {
                ...result,
                event: { ...result.event, txHash: real.txHash, reason: real.result },
                execution: real,
              };
            }
          } finally {
            onChainBusyRef.current = false;
          }
        }
        return result;
      },
      approveAction: async (eventId) => {
        const ev = state.events.find((e) => e.id === eventId);
        const agent = ev ? state.agents.find((a) => a.id === ev.agentId) : undefined;
        if (!ev || !agent) return;
        let execution = executor.execute({
          agentId: agent.id,
          agentName: agent.name,
          actionLabel: ev.actionLabel,
          asset: ev.asset,
          amountUsd: ev.amountUsd,
        });
        if (!onChainBusyRef.current && (ev.amountUsd ?? 0) > 0) {
          const wallet = await ensureTreasury();
          if (wallet) {
            onChainBusyRef.current = true;
            try {
              const real = await executor.executeOnChain(
                {
                  agentId: agent.id,
                  agentName: agent.name,
                  actionLabel: ev.actionLabel,
                  actionType: ev.type,
                  asset: ev.asset,
                  amountUsd: ev.amountUsd,
                },
                {
                  address: wallet.address,
                  recipient: wallet.settlementAddress,
                  privateKeyJwk: wallet.privateKeyJwk,
                },
              );
              if (!real.simulated) execution = real;
            } finally {
              onChainBusyRef.current = false;
            }
          }
        }
        patchEvent(eventId, {
          status: "EXECUTED",
          decision: "ALLOWED",
          verdict: "ALLOW",
          txHash: execution.txHash,
          reason: execution.result,
        });
        run((s) => ({ ...s, pendingApprovals: s.pendingApprovals.filter((id) => id !== eventId) }));
      },
      rejectAction: (eventId) =>
        run((s) => ({
          ...s,
          events: s.events.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  status: "BLOCKED",
                  decision: "DENIED",
                  verdict: "DENY",
                  reason: "rejected by human approver",
                }
              : e,
          ),
          pendingApprovals: s.pendingApprovals.filter((id) => id !== eventId),
        })),
      verifyOnChain: async (eventId) => {
        const ev = state.events.find((e) => e.id === eventId);
        if (!ev || !isRealOnChainHash(ev.txHash)) return null;
        const transport = executor.transport as RialoJsonRpcTransport | null;
        if (!(transport instanceof RialoJsonRpcTransport)) return null;
        try {
          const tx = await transport.getTransaction(ev.txHash);
          const verification: OnChainVerification = {
            blockHeight: tx.blockHeight,
            blockTimeSec: tx.blockTimeSec,
            fee: tx.fee,
            err: tx.err,
            logMessages: tx.logMessages,
            computeUnits: tx.computeUnits,
            verifiedAt: isoNow(),
          };
          patchEvent(eventId, { onChain: verification });
          return verification;
        } catch {
          return null;
        }
      },
      pauseAgent: (agentId, reason) => run((s) => pauseAgent(s, agentId, reason)),
      resumeAgent: (agentId) =>
        run((s) => ({
          ...s,
          agents: s.agents.map((a) => (a.id === agentId ? { ...a, status: "ACTIVE" } : a)),
        })),
      revokeAgent: (agentId) =>
        run((s) => ({
          ...s,
          agents: s.agents.map((a) =>
            a.id === agentId
              ? {
                  ...a,
                  status: "REVOKED",
                  authority: {
                    ...a.authority,
                    withdrawEnabled: false,
                    expiresAt: new Date(0).toISOString(),
                  },
                }
              : a,
          ),
        })),
      createAgent: (agent, policy) =>
        run((s) => ({ ...s, agents: [...s.agents, agent], policies: [...s.policies, policy] })),
      updatePolicy: (policy) =>
        run((s) => ({ ...s, policies: s.policies.map((p) => (p.id === policy.id ? policy : p)) })),
      reset: () => run(() => seedState()),
    };
  }, [state, connection, treasury, chainInfo, rememberKey]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useAstraeon(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useAstraeon must be used within <AstraeonProvider>");
  return ctx;
}
