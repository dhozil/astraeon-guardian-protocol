import { describe, expect, it } from "vitest";
import { buildTransferMessage, buildTransaction, toBase64 } from "@/lib/astraeon/tx";
import { bs58Decode, bs58Encode, generateWallet, sanitizeWallet } from "@/lib/astraeon/wallet";
import { kelvinForAction } from "@/lib/astraeon/rialo";

describe("transfer wire format", () => {
  it("produces the expected message length for a transfer", () => {
    const msg = buildTransferMessage({
      feePayer: "9Ljk9XNV2dHo3iEzm26kaDhgcECzjN2FNeQ8vxsp54aE",
      to: "AQTdzvx3HCf1TMwU9CZfSKyj2jJkdmNQWM9tFMrUhmiv",
      kelvin: 500000000n,
      validFrom: 1786340883932,
      configHashPrefix: 8888927001659606077n,
    });
    // 3 header + 1 count + 96 keys + 8 vf + 8 ch + 1 occ + 1 icount + 1 pidx
    // + 2 accounts len + 2 idx + 1 data len + 12 data = 135
    expect(msg.length).toBe(135);
  });

  it("signs a 64-byte signature and serializes tx with compact prefix", () => {
    const msg = new Uint8Array([1, 0, 1, 3]);
    const sig = new Uint8Array(64).fill(7);
    const tx = buildTransaction(msg, sig);
    // [0x01] + 64 sig + 4 msg = 69
    expect(tx.length).toBe(69);
    expect(tx[0]).toBe(1);
  });

  it("base64 encodes bytes", () => {
    expect(toBase64(new Uint8Array([104, 105]))).toBe("aGk=");
  });
});

describe("kelvinForAction ties USD amount to on-chain value", () => {
  it("maps $75 to 75M kelvin", () => {
    expect(
      kelvinForAction(
        { agentId: "a", agentName: "x", actionLabel: "BUY", amountUsd: 75 },
        10_000_000,
      ),
    ).toBe(75_000_000n);
  });
  it("floors small amounts at the dust minimum", () => {
    expect(
      kelvinForAction(
        { agentId: "a", agentName: "x", actionLabel: "BUY", amountUsd: 1 },
        10_000_000,
      ),
    ).toBe(10_000_000n);
  });
  it("falls back when no amount is present", () => {
    expect(kelvinForAction({ agentId: "a", agentName: "x", actionLabel: "X" }, 10_000_000)).toBe(
      10_000_000n,
    );
  });
});

describe("wallet", () => {
  it("base58 round-trips", () => {
    const bytes = new Uint8Array(32).map((_, i) => (i * 7) % 256);
    expect(bs58Encode(bs58Decode(bs58Encode(bytes)))).toBe(bs58Encode(bytes));
  });

  it("generates a wallet with settlement and strips the key when sanitized", async () => {
    const w = await generateWallet();
    expect(w.address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{40,44}$/);
    expect(w.settlementAddress).toMatch(/^[1-9A-HJ-NP-Za-km-z]{40,44}$/);
    const s = sanitizeWallet(w);
    expect("privateKeyJwk" in s).toBe(false);
    expect(s.address).toBe(w.address);
  });
});
