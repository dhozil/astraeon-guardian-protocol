import { bs58Decode } from "./wallet";

export const SYSTEM_PROGRAM = "11111111111111111111111111111111";

function compactU16(buf: number[], len: number): void {
  if (len < 128) {
    buf.push(len);
  } else {
    buf.push((len & 0x7f) | 0x80);
    buf.push((len >> 7) & 0x7f);
  }
}

function pushUint64LE(buf: number[], value: bigint): void {
  for (let i = 0; i < 8; i += 1) buf.push(Number((value >> BigInt(i * 8)) & 0xffn));
}

/** bincode u32 little-endian. */
function pushUint32LE(buf: number[], value: number): void {
  buf.push(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff);
}

/** bincode string: u64 LE byte length + UTF-8 bytes. */
function pushString(buf: number[], value: string): void {
  const bytes = Array.from(new TextEncoder().encode(value));
  pushUint64LE(buf, BigInt(bytes.length));
  buf.push(...bytes);
}

export { pushUint32LE, pushString };

export interface InvokeAccount {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
}

export interface InvokeMessageParams {
  feePayer: string;
  programId: string;
  accounts: InvokeAccount[];
  data: Uint8Array;
  validFrom: number;
  configHashPrefix: bigint;
}

/**
 * Builds a Rialo transaction message that invokes a program instruction,
 * following the same wire format as rialo-cdk's TransactionBuilder: fee payer
 * first, then instruction accounts, then the program id; 3-byte header,
 * compact-u16 arrays, valid_from i64 LE, config hash prefix u64 LE, occ flag.
 */
export function buildInvokeMessage(params: InvokeMessageParams): Uint8Array {
  const buf: number[] = [];

  const accountKeys = [params.feePayer, ...params.accounts.map((a) => a.pubkey), params.programId];

  // header: required signatures, readonly signed, readonly unsigned (incl. program id)
  const numRequired = params.accounts.filter((a) => a.isSigner).length + 1;
  const numReadonlySigned = params.accounts.filter((a) => a.isSigner && !a.isWritable).length;
  const numReadonlyUnsigned =
    params.accounts.filter((a) => !a.isSigner && !a.isWritable).length + 1; // + program id
  buf.push(numRequired, numReadonlySigned, numReadonlyUnsigned);

  // account_keys compact-array
  compactU16(buf, accountKeys.length);
  for (const k of accountKeys) {
    const raw = bs58Decode(k);
    if (raw.length !== 32) throw new Error(`invalid pubkey length for ${k}`);
    buf.push(...raw);
  }

  // valid_from i64 LE (milliseconds since epoch)
  pushUint64LE(buf, BigInt(params.validFrom));

  // config_hash_prefix u64 LE
  pushUint64LE(buf, params.configHashPrefix);

  // occ scheduler flag
  buf.push(0);

  // instructions compact-array: 1 instruction
  compactU16(buf, 1);

  // program index = feePayer(0) + accounts length
  buf.push(params.accounts.length + 1);

  // account indices compact-array: [0 (fee payer), 1..n]
  compactU16(buf, params.accounts.length + 1);
  for (let i = 0; i <= params.accounts.length; i += 1) buf.push(i);

  // instruction data compact-array
  compactU16(buf, params.data.length);
  buf.push(...params.data);

  return Uint8Array.from(buf);
}

export interface TransferMessageParams {
  feePayer: string;
  to: string;
  kelvin: bigint;
  validFrom: number;
  configHashPrefix: bigint;
  programId?: string;
}

/**
 * Builds a Rialo transaction message for a System Program transfer, matching
 * the wire format emitted by rialo-cdk's TransactionBuilder (compact-u16
 * arrays, 3-byte header, valid_from i64 LE, config hash prefix u64 LE, occ).
 */
export function buildTransferMessage(params: TransferMessageParams): Uint8Array {
  const programId = params.programId ?? SYSTEM_PROGRAM;
  const buf: number[] = [];

  // header: 1 required signature (fee payer), 0 readonly signed, 1 readonly unsigned
  buf.push(1, 0, 1);

  // account_keys compact-array: [fee_payer, to, program_id]
  const keys = [params.feePayer, params.to, programId];
  compactU16(buf, keys.length);
  for (const k of keys) {
    const raw = bs58Decode(k);
    if (raw.length !== 32) throw new Error(`invalid pubkey length for ${k}`);
    buf.push(...raw);
  }

  // valid_from i64 LE (milliseconds since epoch)
  pushUint64LE(buf, BigInt(params.validFrom));

  // config_hash_prefix u64 LE
  pushUint64LE(buf, params.configHashPrefix);

  // occ scheduler flag
  buf.push(0);

  // instructions compact-array: 1 instruction
  compactU16(buf, 1);

  // program index = 2 (account_keys index of program_id)
  buf.push(2);

  // account indices compact-array: [0 (from), 1 (to)]
  compactU16(buf, 2);
  buf.push(0, 1);

  // instruction data compact-array: [2,0,0,0] + kelvin LE
  const data: number[] = [2, 0, 0, 0];
  pushUint64LE(data, params.kelvin);
  compactU16(buf, data.length);
  buf.push(...data);

  return Uint8Array.from(buf);
}

/**
 * Serializes a signed transaction: compact-array of 64-byte signatures followed
 * by the raw message bytes (matches rialo-cdk serialize_transaction).
 */
export function buildTransaction(message: Uint8Array, signature: Uint8Array): Uint8Array {
  if (signature.length !== 64) throw new Error("signature must be 64 bytes");
  const buf: number[] = [];
  compactU16(buf, 1);
  buf.push(...signature);
  buf.push(...message);
  return Uint8Array.from(buf);
}

export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i] ?? 0);
  return btoa(bin);
}
