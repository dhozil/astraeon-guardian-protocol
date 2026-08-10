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
