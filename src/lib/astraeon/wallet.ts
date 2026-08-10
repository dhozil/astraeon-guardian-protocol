const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/** Cosmetic placeholder operator address (valid base58 format) used in seed data. */
export const PLACEHOLDER_OPERATOR_ADDRESS = "9f4H1qVqW3mPXxYzKp2QnR7sT8uB5CvD3gJ6MhNcZt";

export function bs58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  const digits: number[] = [0];
  for (let i = 0; i < bytes.length; i += 1) {
    let carry = bytes[i] ?? 0;
    for (let j = 0; j < digits.length; j += 1) {
      carry += (digits[j] ?? 0) << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros += 1;
  let out = "";
  for (let i = 0; i < zeros; i += 1) out += "1";
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    const d = digits[i];
    if (d == null) continue;
    out += ALPHABET[d] ?? "";
  }
  return out;
}

export function bs58Decode(str: string): Uint8Array {
  if (str.length === 0) return new Uint8Array(0);
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i += 1) {
    const idx = ALPHABET.indexOf(str[i] ?? "");
    if (idx < 0) throw new Error(`invalid base58 char: ${str[i]}`);
    let carry = idx;
    for (let j = 0; j < bytes.length; j += 1) {
      carry += (bytes[j] ?? 0) * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < str.length && str[i] === "1"; i += 1) {
    bytes.push(0);
  }
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) out[i] = bytes[bytes.length - 1 - i] ?? 0;
  return out;
}

export interface RialoWallet {
  address: string;
  publicKeyB64: string;
  privateKeyJwk: string;
  settlementAddress?: string | undefined;
  createdAt: string;
}

function b64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i] ?? 0);
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Generates a Rialo wallet (Ed25519 keypair) using WebCrypto. The address is
 * the base58-encoded raw public key, matching rialo-cdk pubkey strings. A
 * second keypair is produced as the settlement recipient for on-chain
 * execution transfers.
 */
export async function generateWallet(): Promise<RialoWallet> {
  const kp = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const rawPub = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);

  const kp2 = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const rawPub2 = new Uint8Array(await crypto.subtle.exportKey("raw", kp2.publicKey));

  return {
    address: bs58Encode(rawPub),
    publicKeyB64: b64(rawPub),
    privateKeyJwk: JSON.stringify(jwk),
    settlementAddress: bs58Encode(rawPub2),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Imports the stored JWK back into a WebCrypto signing key.
 */
export async function importSigningKey(privateKeyJwk: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    JSON.parse(privateKeyJwk) as JsonWebKey,
    { name: "Ed25519" },
    false,
    ["sign"],
  );
}

export function pubkeyB64ToAddress(publicKeyB64: string): string {
  return bs58Encode(b64ToBytes(publicKeyB64));
}

/**
 * Returns a wallet record without the private signing key. Persist this shape
 * unless the user explicitly opts in to keeping the key in the browser.
 */
export function sanitizeWallet(wallet: RialoWallet): Omit<RialoWallet, "privateKeyJwk"> {
  return {
    address: wallet.address,
    publicKeyB64: wallet.publicKeyB64,
    settlementAddress: wallet.settlementAddress,
    createdAt: wallet.createdAt,
  };
}

export function truncateAddress(address: string, head = 5, tail = 4): string {
  if (address.length <= head + tail) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function kelvinToRlo(kelvins: number): number {
  return kelvins / 1_000_000_000;
}
