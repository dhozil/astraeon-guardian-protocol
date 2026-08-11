import { bs58Decode, bs58Encode } from "./wallet";
import { buildInvokeMessage, type InvokeAccount } from "./tx";

/**
 * Well-known Rialo program addresses from the generated Venus manifest
 * (wit/astraeon-guard-manifest.json).
 */
export const GUARD_WELL_KNOWN = {
  systemProgram: "11111111111111111111111111111111",
  subscriberInterface: "Subscriber111111111111111111111111111111111",
  rexRegistry: "Qrac1eRegistry11111111111111111111111111111",
  rexProcessor: "Qrac1eProcessor1111111111111111111111111111",
} as const;

/**
 * The Astraeon guard program deployed on Rialo DevNet
 * (`rialo-build` → PolkaVM blob → `client program deploy`).
 */
export const GUARD_PROGRAM_ID_DEVNET = "EiKYpXrsCBU2ZqbCpLuLBPGfjFzBwt1ynsqNLdHAnA97";

/**
 * Deterministic workflow slug (SHA-256 of "astraeon-guard-policy") so the
 * frontend targets the same workflow instance the policy was initialized on.
 */
export const GUARD_DEFAULT_SLUG_HEX =
  "5894a746cf7c289fc5035596c7541a259c8515aa5ba9c94aca20f2d0e0faf624";

export function slugFromHex(hex: string): Uint8Array {
  if (hex.length !== 64) throw new Error("workflow slug must be 64 hex chars");
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export const GUARD_DEFAULT_SLUG = slugFromHex(GUARD_DEFAULT_SLUG_HEX);

/** Instruction discriminants from the manifest (bincode enum variant). */
export const GUARD_INSTRUCTION = {
  evaluate: 0,
  initialize: 1,
} as const;

// --- ed25519 point validity (for PDA on-curve rejection) -------------------

const P = (1n << 255n) - 19n;
const D = mod(-121665n * modInverse(121666n, P), P);

function mod(a: bigint, m: bigint): bigint {
  return ((a % m) + m) % m;
}

function modPow(base: bigint, exp: bigint, m: bigint): bigint {
  let result = 1n;
  let b = mod(base, m);
  let e = exp;
  while (e > 0n) {
    if (e & 1n) result = mod(result * b, m);
    b = mod(b * b, m);
    e >>= 1n;
  }
  return result;
}

function modInverse(a: bigint, m: bigint): bigint {
  let t = 0n;
  let newT = 1n;
  let r = m;
  let newR = mod(a, m);
  while (newR !== 0n) {
    const q = r / newR;
    [t, newT] = [newT, t - q * newT];
    [r, newR] = [newR, r - q * newR];
  }
  if (r > 1n) throw new Error("not invertible");
  return mod(t, m);
}

/** True if the 32 bytes decode to a valid ed25519 point (mirrors ed25519-dalek). */
export function isOnCurve(bytes: Uint8Array): boolean {
  let y = 0n;
  for (let i = 31; i >= 0; i -= 1) y = (y << 8n) | BigInt(bytes[i] ?? 0);
  y &= (1n << 255n) - 1n;
  if (y >= P) return false;
  const yy = mod(y * y, P);
  const u = mod(yy - 1n, P);
  const v = mod(D * yy + 1n, P);
  const x2 = mod(u * modInverse(v, P), P);
  if (x2 === 0n) return true;
  return modPow(x2, (P - 1n) / 2n, P) === 1n;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

export type Sha256 = (bytes: Uint8Array) => Promise<Uint8Array>;

/**
 * Solana-style find_program_address: derive a PDA from seeds + program id,
 * skipping bumps whose hash is a valid ed25519 point.
 */
export async function findProgramAddress(
  seeds: Uint8Array[],
  programId: Uint8Array,
  sha256: Sha256,
): Promise<{ address: Uint8Array; bump: number }> {
  const marker = new TextEncoder().encode("ProgramDerivedAddress");
  for (let bump = 255; bump >= 0; bump -= 1) {
    const input = concat([marker, ...seeds, programId, new Uint8Array([bump])]);
    const hash = await sha256(input);
    if (!isOnCurve(hash)) return { address: hash, bump };
  }
  throw new Error("unable to find a program address for the given seeds");
}

// --- instruction data (bincode per manifest serialization) ------------------

function bincodeString(value: string): number[] {
  const bytes = Array.from(new TextEncoder().encode(value));
  const len: number[] = [];
  for (let i = 0; i < 8; i += 1) len.push(Number((BigInt(bytes.length) >> BigInt(i * 8)) & 0xffn));
  return [...len, ...bytes];
}

function bincodeU64LE(value: bigint): number[] {
  const out: number[] = [];
  for (let i = 0; i < 8; i += 1) out.push(Number((value >> BigInt(i * 8)) & 0xffn));
  return out;
}

function bincodeU32LE(value: number): number[] {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff];
}

/**
 * Instruction data for `evaluate(action, asset, amount, destination)`, from the
 * manifest serialization spec: u32 enum variant + bytes32 slug + bincode fields.
 */
export function buildEvaluateData(params: {
  slug: Uint8Array;
  action: string;
  asset: string;
  amountKelvin: bigint;
  destination: string;
}): Uint8Array {
  const data = [
    ...bincodeU32LE(GUARD_INSTRUCTION.evaluate),
    ...Array.from(params.slug),
    ...bincodeString(params.action),
    ...bincodeString(params.asset),
    ...bincodeU64LE(params.amountKelvin),
    ...bincodeString(params.destination),
  ];
  return Uint8Array.from(data);
}

/**
 * Instruction data for `initialize(max_amount, allow_withdraw, allowed_assets)`.
 */
export function buildInitializeData(params: {
  slug: Uint8Array;
  maxAmount: bigint;
  allowWithdraw: boolean;
  allowedAssets: string;
}): Uint8Array {
  const data = [
    ...bincodeU32LE(GUARD_INSTRUCTION.initialize),
    ...Array.from(params.slug),
    ...bincodeU64LE(params.maxAmount),
    params.allowWithdraw ? 1 : 0,
    ...bincodeString(params.allowedAssets),
  ];
  return Uint8Array.from(data);
}

export interface GuardInvokeParams {
  feePayer: string;
  programId: string;
  slug: Uint8Array;
  data: Uint8Array;
  validFrom: number;
  configHashPrefix: bigint;
  sha256: Sha256;
}

/** Builds the full signed-transaction message invoking the guard program. */
export async function buildGuardInvokeMessage(params: GuardInvokeParams): Promise<Uint8Array> {
  const programIdRaw = bs58Decode(params.programId);
  const payerRaw = bs58Decode(params.feePayer);

  const { address: workflowPda } = await findProgramAddress(
    [new TextEncoder().encode("rialo_workflow"), payerRaw, params.slug],
    programIdRaw,
    params.sha256,
  );

  const accounts: InvokeAccount[] = [
    { pubkey: bs58Encode(workflowPda), isSigner: false, isWritable: true },
    { pubkey: GUARD_WELL_KNOWN.systemProgram, isSigner: false, isWritable: false },
    { pubkey: GUARD_WELL_KNOWN.subscriberInterface, isSigner: false, isWritable: false },
  ];

  return buildInvokeMessage({
    feePayer: params.feePayer,
    programId: params.programId,
    accounts,
    data: params.data,
    validFrom: params.validFrom,
    configHashPrefix: params.configHashPrefix,
  });
}
