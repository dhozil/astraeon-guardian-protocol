import type { Asset } from "./types";
import { nextId } from "./audit";
import { importSigningKey } from "./wallet";
import { buildTransferMessage, buildTransaction, toBase64 } from "./tx";
import { buildEvaluateData, buildGuardInvokeMessage } from "./guard-program";

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer));
}

/** Guard program id override, e.g. set VITE_RIALO_GUARD_PROGRAM after deploy. */
export function rialoGuardProgram(): string {
  const env = import.meta.env as Record<string, unknown> | undefined;
  const url = env?.["VITE_RIALO_GUARD_PROGRAM"];
  return typeof url === "string" && url.trim() !== "" ? url.trim() : "";
}

export interface RialoExecutionRequest {
  agentId: string;
  agentName: string;
  actionLabel: string;
  actionType?: string | undefined;
  asset?: Asset | undefined;
  amountUsd?: number | undefined;
  method?: string | undefined;
  destination?: string | undefined;
  destinationId?: string | undefined;
}

export interface RialoSimulation {
  expectedOut: number;
  minimumOut: number;
  estimatedFeeUsd: number;
  gasUsed: string;
}

export interface RialoExecutionResult {
  txHash: string;
  block: number;
  gasUsed: string;
  status: "CONFIRMED" | "FAILED";
  simulated: boolean;
  result: string;
  network: string;
}

export interface RialoTransport {
  readonly network: string;
  readonly connected: boolean;
  simulate(req: RialoExecutionRequest): RialoSimulation;
  execute(req: RialoExecutionRequest): RialoExecutionResult;
}

/**
 * Documented Rialo RPC endpoints, mirroring the constants in the rialo-cdk
 * (URL_LOCALNET / URL_DEVNET / URL_TESTNET / URL_MAINNET). As of rialo-cdk
 * 0.12.2 every non-local network points at the public DevNet node.
 */
export const RIALO_RPC_URLS = {
  local: "http://127.0.0.1:4104",
  devnet: "http://devnet.rialo.io:4100",
  testnet: "http://devnet.rialo.io:4100",
  mainnet: "http://devnet.rialo.io:4100",
} as const;

export function rialoRpcUrl(): string {
  const env = import.meta.env as Record<string, unknown> | undefined;
  const url = env?.["VITE_RIALO_RPC_URL"];
  if (typeof url === "string" && url.trim() !== "") return url;
  // Same-origin proxy: Rialo DevNet is HTTP-only without CORS, so browsers
  // must route JSON-RPC through the app server (/api/rialo).
  return "/api/rialo";
}

function unwrapProxyEnvelope(text: string): { status: number; body: string } | undefined {
  try {
    const parsed = JSON.parse(text) as { data?: unknown };
    const data = parsed.data;
    if (data && typeof data === "object") {
      const rec = data as { status?: unknown; body?: unknown };
      if (typeof rec.status === "number" && typeof rec.body === "string") {
        return { status: rec.status, body: rec.body };
      }
    }
  } catch {
    // not JSON
  }
  return undefined;
}

export interface RialoConnectionInfo {
  reachable: boolean;
  rpcUrl: string;
  network: string;
  blockHeight?: number | undefined;
  balanceKelvin?: string | undefined;
  error?: string | undefined;
}

function parseKelvins(result: unknown): number | undefined {
  if (typeof result === "object" && result != null) {
    const rec = result as { value?: number | { lamports?: number } };
    if (typeof rec.value === "number") return rec.value;
    if (typeof rec.value === "object" && rec.value != null) return rec.value.lamports;
  }
  return undefined;
}

/**
 * Simulated transport. Deterministic, offline, produces an on-chain record
 * shape compatible with a real Rialo RPC response so the transport can be
 * swapped without touching the rest of the stack.
 */
export class SimulatedRialoTransport implements RialoTransport {
  readonly network = "Rialo DevNet";
  readonly connected = true;
  private readonly baseFee = 0.00021;
  private blockCounter = 482_000;

  simulate(req: RialoExecutionRequest): RialoSimulation {
    const expectedOut = Math.round((req.amountUsd ?? 0) * 1.0 * 100) / 100;
    const slippage = 0.01;
    const minimumOut = Math.round(expectedOut * (1 - slippage) * 100) / 100;
    const gasUsed = `${(0.0018 + (req.amountUsd ?? 0) * 0.00002).toFixed(6)} RIALO`;
    return { expectedOut, minimumOut, estimatedFeeUsd: this.baseFee, gasUsed };
  }

  execute(req: RialoExecutionRequest): RialoExecutionResult {
    this.blockCounter += 1;
    const hash = this.hash(req);
    return {
      txHash: `0x${hash}`,
      block: this.blockCounter,
      gasUsed: `${(0.0018 + (req.amountUsd ?? 0) * 0.00002).toFixed(6)} RIALO`,
      status: "CONFIRMED",
      simulated: true,
      result: `${req.actionLabel} executed on-chain`,
      network: this.network,
    };
  }

  private hash(req: RialoExecutionRequest): string {
    const seed = [req.agentId, req.actionLabel, req.amountUsd ?? 0, Date.now().toString()].join(
      "|",
    );
    let h = 0x811c9dc5;
    for (let i = 0; i < seed.length; i += 1) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    const hex = (h >>> 0).toString(16).padStart(8, "0");
    return `${hex}${"ae71"}_${nextId("tx").slice(-6)}`;
  }
}

/**
 * Real Rialo JSON-RPC transport. Talks to a Rialo node over HTTP JSON-RPC
 * using the documented method names from the rialo-cdk RpcClient trait
 * (getHealth, getBlockHeight, getBalance, sendTransaction, ...).
 *
 * Read-side calls (health / block height / balance) are made against the
 * configured RPC URL. Because signing a real transaction requires a funded
 * keypair + the CDK's bincode serialization, execute() still emits a
 * simulated on-chain record unless a signer is configured — but it carries
 * the real network and current block height when the node is reachable.
 */
export class RialoJsonRpcTransport implements RialoTransport {
  readonly network = "Rialo DevNet";
  readonly connected: boolean;
  private readonly inner: SimulatedRialoTransport;
  private currentBlockHeight: number | undefined;

  constructor(
    private readonly rpcUrl: string = rialoRpcUrl(),
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.inner = new SimulatedRialoTransport();
    this.connected = false;
  }

  simulate(req: RialoExecutionRequest): RialoSimulation {
    return this.inner.simulate(req);
  }

  execute(req: RialoExecutionRequest): RialoExecutionResult {
    const base = this.inner.execute(req);
    return {
      ...base,
      network: this.network,
      block: this.currentBlockHeight ?? base.block,
    };
  }

  private async callRaw(
    method: string,
    params: unknown[],
  ): Promise<{ text: string; result: unknown }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await this.fetchImpl(this.rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: controller.signal,
      });
      const text = await res.text();
      // When routed through the same-origin proxy (/api/rialo) the response is
      // a TanStack action envelope { data: { status, body } } wrapping the raw
      // upstream text; unwrap it before parsing.
      const envelope = unwrapProxyEnvelope(text);
      if (envelope) {
        if (envelope.status >= 400) {
          throw new Error(`Rialo RPC HTTP ${envelope.status}: ${envelope.body.slice(0, 200)}`);
        }
        const data = JSON.parse(envelope.body) as {
          result?: unknown;
          error?: { message?: string };
        };
        if (data.error) throw new Error(data.error.message ?? "Rialo RPC error");
        return { text: envelope.body, result: data.result };
      }
      if (!res.ok) {
        throw new Error(`Rialo RPC HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      const data = JSON.parse(text) as { result?: unknown; error?: { message?: string } };
      if (data.error) throw new Error(data.error.message ?? "Rialo RPC error");
      return { text, result: data.result };
    } finally {
      clearTimeout(timer);
    }
  }

  private async call(method: string, params: unknown[]): Promise<unknown> {
    const { result } = await this.callRaw(method, params);
    return result;
  }

  async probe(address?: string): Promise<RialoConnectionInfo> {
    try {
      const health = await this.call("getHealth", []);
      if (health !== "ok") throw new Error(`node health: ${String(health)}`);
      const height = await this.call("getBlockHeight", []);
      this.currentBlockHeight = typeof height === "number" ? height : Number(height);
      const info: RialoConnectionInfo = {
        reachable: true,
        rpcUrl: this.rpcUrl,
        network: this.network,
        blockHeight: this.currentBlockHeight,
      };
      if (address) {
        try {
          const balance = await this.call("getBalance", [{ address }]);
          const kelvins = parseKelvins(balance);
          if (kelvins != null) info.balanceKelvin = String(kelvins);
        } catch {
          // balance is optional on the probe
        }
      }
      return info;
    } catch (err) {
      return {
        reachable: false,
        rpcUrl: this.rpcUrl,
        network: this.network,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async getBalance(address: string): Promise<number> {
    const result = await this.call("getBalance", [{ address }]);
    return parseKelvins(result) ?? 0;
  }

  async getBlockHeight(): Promise<number> {
    const height = await this.call("getBlockHeight", []);
    return typeof height === "number" ? height : Number(height);
  }

  async requestAirdrop(address: string, kelvins: number): Promise<string> {
    const sig = await this.call("requestAirdrop", [{ version: 0, pubkey: address, kelvins }]);
    if (typeof sig !== "string") throw new Error("airdrop did not return a signature");
    return sig;
  }

  async confirmSignature(
    sig: string,
    timeoutMs = 15_000,
  ): Promise<{ executed: boolean; slot?: number | undefined }> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const result = await this.call("getSignatureStatuses", [{ signatures: [sig] }]);
      const list = (
        result as { value?: Array<{ executed?: boolean; slot?: number; err?: unknown } | null> }
      )?.value;
      const first = list?.[0];
      if (first?.executed) return { executed: true, slot: first.slot };
      await new Promise((r) => setTimeout(r, 1000));
    }
    return { executed: false };
  }

  async airdropAndConfirm(
    address: string,
    kelvins: number,
  ): Promise<{ signature: string; block: number; executed: boolean }> {
    const signature = await this.requestAirdrop(address, kelvins);
    const confirmed = await this.confirmSignature(signature);
    const height = this.currentBlockHeight ?? 0;
    return { signature, block: confirmed.slot ?? height, executed: confirmed.executed };
  }

  /**
   * Reads the current config hash prefix for replay protection. The node
   * returns it as a JSON number that exceeds 2^53, so the raw digits are
   * recovered from the response text and parsed as a BigInt.
   */
  async getConfigHashPrefix(): Promise<bigint> {
    const { text } = await this.callRaw("getRecentValidatorConfigHash", []);
    const match = text.match(/"configHashPrefix":(\d+)/);
    if (!match?.[1]) throw new Error("configHashPrefix missing in RPC response");
    return BigInt(match[1]);
  }

  /**
   * Returns the node's wall-clock time in milliseconds, taken from the latest
   * block's blockTime. Used as transaction valid_from so the node never
   * rejects the transaction as TimestampInFuture (client clocks can run ahead
   * of the node).
   */
  async getNodeTimeMs(): Promise<number> {
    const height = await this.call("getBlockHeight", []);
    const h = typeof height === "number" ? height : Number(height);
    const block = await this.call("getBlock", [{ blockHeight: h }]);
    const rec = block as { value?: { blockTime?: number } } | null;
    const blockTimeSec = rec?.value?.blockTime;
    if (blockTimeSec == null) throw new Error("getBlock returned no blockTime");
    return blockTimeSec * 1000;
  }

  /** Submits a base64-encoded signed transaction and returns its signature. */
  async sendTransaction(txBase64: string): Promise<string> {
    const sig = await this.call("sendTransaction", [
      txBase64,
      { encoding: "base64", skipPreflight: true, waitForExecution: false },
    ]);
    if (typeof sig !== "string") throw new Error("sendTransaction did not return a signature");
    return sig;
  }

  async sendAndConfirmTransaction(
    txBase64: string,
  ): Promise<{ signature: string; block: number; executed: boolean }> {
    const signature = await this.sendTransaction(txBase64);
    const confirmed = await this.confirmSignature(signature);
    const height = this.currentBlockHeight ?? 0;
    return { signature, block: confirmed.slot ?? height, executed: confirmed.executed };
  }

  async getTransactionCount(): Promise<number> {
    const result = await this.call("getTransactionCount", []);
    const rec = result as { value?: number } | null;
    return rec?.value ?? (typeof result === "number" ? result : 0);
  }

  /** Fetches and parses a confirmed on-chain transaction for audit verification. */
  async getTransaction(sig: string): Promise<RialoOnChainTx> {
    const result = await this.call("getTransaction", [{ signature: sig }]);
    const rec = result as {
      block_height?: number;
      block_time?: number | null;
      blockHeight?: number;
      blockTime?: number | null;
      validFrom?: number;
      valid_from?: number;
      meta?: { fee?: number; err?: unknown; logMessages?: string[]; computeUnitsConsumed?: number };
      transaction?: {
        message?: {
          instructions?: Array<{ programIdIndex: number; accounts: number[]; data: string }>;
        };
      };
    } | null;
    return {
      blockHeight: rec?.block_height ?? rec?.blockHeight ?? 0,
      blockTimeSec: rec?.block_time ?? rec?.blockTime ?? null,
      validFromMs: rec?.validFrom ?? rec?.valid_from ?? 0,
      fee: rec?.meta?.fee ?? 0,
      err: rec?.meta?.err ?? null,
      logMessages: rec?.meta?.logMessages ?? [],
      computeUnits: rec?.meta?.computeUnitsConsumed ?? 0,
      instructions: rec?.transaction?.message?.instructions ?? [],
    };
  }
}

export interface RialoOnChainTx {
  blockHeight: number;
  blockTimeSec: number | null;
  validFromMs: number;
  fee: number;
  err: unknown;
  logMessages: string[];
  computeUnits: number;
  instructions: Array<{ programIdIndex: number; accounts: number[]; data: string }>;
}

export function isRealOnChainHash(txHash: string | undefined): txHash is string {
  if (!txHash) return false;
  if (txHash.startsWith("0x") || txHash.startsWith("gway_")) return false;
  return txHash.length >= 80;
}

export interface RialoExecutorConfig {
  transport?: RialoTransport;
  feePerTxUsd?: number;
  rpcUrl?: string;
}

const AUTO_FUND_COOLDOWN_MS = 60_000;

/** Demo on-chain rate: 0.001 RLO per USD, floored at the DevNet dust minimum. */
const KELVIN_PER_USD = 1_000_000;
const MIN_EXECUTION_KELVIN = 10_000_000;
const FEE_BUFFER_KELVIN = 5_000;

export function kelvinForAction(req: RialoExecutionRequest, fallback: number): bigint {
  const amountUsd = req.amountUsd ?? 0;
  if (amountUsd > 0) {
    return BigInt(Math.max(MIN_EXECUTION_KELVIN, Math.round(amountUsd * KELVIN_PER_USD)));
  }
  return BigInt(fallback);
}

export class RialoExecutor {
  readonly transport: RialoTransport;
  readonly feePerTxUsd: number;
  readonly rpcUrl: string;
  connection: RialoConnectionInfo;
  lastRealTxAt = 0;
  lastAutoFundAt = 0;

  constructor(config: RialoExecutorConfig = {}) {
    this.rpcUrl = config.rpcUrl ?? rialoRpcUrl();
    this.transport = config.transport ?? new RialoJsonRpcTransport(this.rpcUrl);
    this.feePerTxUsd = config.feePerTxUsd ?? 0.0021;
    this.connection = {
      reachable: false,
      rpcUrl: this.rpcUrl,
      network: this.network,
    };
  }

  get network(): string {
    return this.transport.network;
  }

  get connected(): boolean {
    return this.connection.reachable;
  }

  simulate(req: RialoExecutionRequest): RialoSimulation {
    return this.transport.simulate(req);
  }

  execute(req: RialoExecutionRequest): RialoExecutionResult {
    return this.transport.execute(req);
  }

  async connect(address?: string): Promise<RialoConnectionInfo> {
    if (this.transport instanceof RialoJsonRpcTransport) {
      this.connection = await this.transport.probe(address);
    } else {
      this.connection = {
        reachable: this.transport.connected,
        rpcUrl: this.rpcUrl,
        network: this.network,
      };
    }
    return this.connection;
  }

  /**
   * Real on-chain execution against Rialo DevNet.
   *
   * When a signing keypair + recipient are provided this builds, signs and
   * submits a real System Program transfer (transferred from the authority
   * wallet to the settlement recipient) and confirms its signature, returning
   * a REAL transaction hash. When no signer is configured it falls back to a
   * faucet airdrop (also a real on-chain transaction). When the node is
   * offline or a rate-limit cooldown is active it returns a simulated record.
   */
  async executeOnChain(
    req: RialoExecutionRequest,
    opts: {
      address: string;
      recipient?: string | undefined;
      privateKeyJwk?: string | undefined;
      kelvins?: number | undefined;
      cooldownMs?: number | undefined;
      guardProgramId?: string | undefined;
    } = { address: "", cooldownMs: 2500 },
  ): Promise<RialoExecutionResult> {
    const sim = this.transport.execute(req);
    const transport = this.transport as RialoJsonRpcTransport | null;
    if (!(transport instanceof RialoJsonRpcTransport)) return sim;
    if (!this.connection.reachable)
      return {
        ...sim,
        network: this.network,
        result: `${req.actionLabel} simulated (Rialo RPC unreachable)`,
      };
    const now = Date.now();
    const cooldownMs = opts.cooldownMs ?? 2500;
    if (now - this.lastRealTxAt < cooldownMs) {
      return {
        ...sim,
        result: `${req.actionLabel} simulated (rate-limited, last on-chain tx ${Math.round((now - this.lastRealTxAt) / 1000)}s ago)`,
      };
    }
    if (!opts.address)
      return { ...sim, result: `${req.actionLabel} simulated (no on-chain wallet)` };
    try {
      // Real signed transfer
      if (opts.recipient && opts.privateKeyJwk) {
        // If a guard program is configured, execution calls the on-chain
        // guard's `evaluate` instruction instead of a plain transfer.
        const guardProgramId = opts.guardProgramId ?? rialoGuardProgram();
        if (guardProgramId) {
          return this.invokeGuardProgram(req, { ...opts, programId: guardProgramId });
        }
        const balance = await transport.getBalance(opts.address);
        // DevNet rejects dust transfers below ~0.01 RLO, so the execution
        // amount stays above the minimum. Auto-funding is throttled to once
        // per minute so an attacker triggering executions cannot drain the
        // faucet continuously.
        let kelvin = opts.kelvins != null ? BigInt(opts.kelvins) : kelvinForAction(req, 10_000_000);
        const available = Math.max(0, balance - FEE_BUFFER_KELVIN);
        if (available > 0 && kelvin > BigInt(available)) kelvin = BigInt(available);
        if (balance < 11_000_000) {
          if (Date.now() - this.lastAutoFundAt >= AUTO_FUND_COOLDOWN_MS) {
            await transport.airdropAndConfirm(opts.address, 1_000_000_000);
            this.lastAutoFundAt = Date.now();
          } else {
            return {
              ...sim,
              result: `${req.actionLabel} simulated (wallet unfunded; auto-fund cooling down)`,
            };
          }
        }
        const configHashPrefix = await transport.getConfigHashPrefix();
        const signingKey = await importSigningKey(opts.privateKeyJwk);

        // The node's TimestampInFuture check is nondeterministic against a
        // client clock that runs a few seconds ahead, so retry with a stepped
        // valid_from until the transaction lands.
        let tx: { signature: string; block: number; executed: boolean } | undefined;
        const offsets = [0, 1500, 3000, 5000, 7000];
        for (const offset of offsets) {
          const message = buildTransferMessage({
            feePayer: opts.address,
            to: opts.recipient,
            kelvin,
            validFrom: Date.now() - offset,
            configHashPrefix,
          });
          const signature = new Uint8Array(
            await crypto.subtle.sign("Ed25519", signingKey, message.buffer as ArrayBuffer),
          );
          const txBytes = buildTransaction(message, signature);
          try {
            tx = await transport.sendAndConfirmTransaction(toBase64(txBytes));
            break;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (!msg.includes("TimestampInFuture")) throw err;
            await new Promise((r) => setTimeout(r, 300));
          }
        }
        if (!tx) throw new Error("transfer could not be submitted (TimestampInFuture)");
        this.lastRealTxAt = Date.now();
        return {
          txHash: tx.signature,
          block: tx.block,
          gasUsed: sim.gasUsed,
          status: tx.executed ? "CONFIRMED" : "FAILED",
          simulated: false,
          result: `${req.actionLabel} executed on Rialo DevNet (transfer ${kelvin.toString()} kelvin → ${shortAddress(opts.recipient)})`,
          network: this.network,
        };
      }

      // Fallback: real faucet airdrop
      const kelvins = opts.kelvins ?? 1_000_000;
      const tx = await transport.airdropAndConfirm(opts.address, kelvins);
      this.lastRealTxAt = Date.now();
      return {
        txHash: tx.signature,
        block: tx.block,
        gasUsed: sim.gasUsed,
        status: tx.executed ? "CONFIRMED" : "FAILED",
        simulated: false,
        result: `${req.actionLabel} executed on Rialo DevNet (faucet)`,
        network: this.network,
      };
    } catch (err) {
      return {
        ...sim,
        result: `${req.actionLabel} simulated (on-chain error: ${err instanceof Error ? err.message : String(err)})`,
      };
    }
  }

  /**
   * Real on-chain execution through the deployed Astraeon guard program. Builds
   * the `evaluate(action, asset, amount, destination)` instruction from the
   * Venus manifest, signs and submits it, and confirms the signature. Requires
   * the program to be deployed; the exact wire encoding follows the generated
   * manifest (bincode) — verify against the deployed program on first run.
   */
  async invokeGuardProgram(
    req: RialoExecutionRequest,
    opts: {
      address: string;
      programId: string;
      privateKeyJwk?: string | undefined;
      kelvins?: number | undefined;
      cooldownMs?: number | undefined;
    },
  ): Promise<RialoExecutionResult> {
    const sim = this.transport.execute(req);
    const transport = this.transport as RialoJsonRpcTransport | null;
    if (!(transport instanceof RialoJsonRpcTransport)) return sim;
    if (!this.connection.reachable)
      return { ...sim, result: `${req.actionLabel} simulated (Rialo RPC unreachable)` };
    const now = Date.now();
    const cooldownMs = opts.cooldownMs ?? 2500;
    if (now - this.lastRealTxAt < cooldownMs) {
      return {
        ...sim,
        result: `${req.actionLabel} simulated (rate-limited, last on-chain tx ${Math.round((now - this.lastRealTxAt) / 1000)}s ago)`,
      };
    }
    if (!opts.address || !opts.privateKeyJwk)
      return { ...sim, result: `${req.actionLabel} simulated (no on-chain wallet)` };
    try {
      const balance = await transport.getBalance(opts.address);
      if (balance < 11_000_000) {
        if (Date.now() - this.lastAutoFundAt >= AUTO_FUND_COOLDOWN_MS) {
          await transport.airdropAndConfirm(opts.address, 1_000_000_000);
          this.lastAutoFundAt = Date.now();
        } else {
          return {
            ...sim,
            result: `${req.actionLabel} simulated (wallet unfunded; auto-fund cooling down)`,
          };
        }
      }

      const configHashPrefix = await transport.getConfigHashPrefix();
      const signingKey = await importSigningKey(opts.privateKeyJwk);
      const kelvin = opts.kelvins != null ? BigInt(opts.kelvins) : kelvinForAction(req, 10_000_000);
      const slug = crypto.getRandomValues(new Uint8Array(32));
      const data = buildEvaluateData({
        slug,
        action: (req.actionType ?? req.actionLabel).toLowerCase(),
        asset: req.asset ?? "",
        amountKelvin: kelvin,
        destination: req.destinationId ?? "",
      });

      let tx: { signature: string; block: number; executed: boolean } | undefined;
      const offsets = [0, 1500, 3000, 5000, 7000];
      for (const offset of offsets) {
        const message = await buildGuardInvokeMessage({
          feePayer: opts.address,
          programId: opts.programId,
          slug,
          data,
          validFrom: Date.now() - offset,
          configHashPrefix,
          sha256,
        });
        const signature = new Uint8Array(
          await crypto.subtle.sign("Ed25519", signingKey, message.buffer as ArrayBuffer),
        );
        const txBytes = buildTransaction(message, signature);
        try {
          tx = await transport.sendAndConfirmTransaction(toBase64(txBytes));
          break;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (!msg.includes("TimestampInFuture")) throw err;
          await new Promise((r) => setTimeout(r, 300));
        }
      }
      if (!tx) throw new Error("guard invoke could not be submitted (TimestampInFuture)");
      this.lastRealTxAt = Date.now();
      return {
        txHash: tx.signature,
        block: tx.block,
        gasUsed: sim.gasUsed,
        status: tx.executed ? "CONFIRMED" : "FAILED",
        simulated: false,
        result: `${req.actionLabel} evaluated on-chain by guard program ${shortAddress(opts.programId)}`,
        network: this.network,
      };
    } catch (err) {
      return {
        ...sim,
        result: `${req.actionLabel} simulated (guard invoke error: ${err instanceof Error ? err.message : String(err)})`,
      };
    }
  }
}

function shortAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 5)}…${address.slice(-4)}`;
}
