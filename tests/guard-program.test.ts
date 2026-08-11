import { describe, expect, it } from "vitest";
import {
  buildEvaluateData,
  buildInitializeData,
  findProgramAddress,
  isOnCurve,
  GUARD_WELL_KNOWN,
} from "@/lib/astraeon/guard-program";
import { bs58Decode } from "@/lib/astraeon/wallet";
import { buildInvokeMessage } from "@/lib/astraeon/tx";

const sha256 = async (b: Uint8Array) => new Uint8Array(await crypto.subtle.digest("SHA-256", b));

describe("guard program invoke builders", () => {
  it("well-known addresses decode to 32 bytes", () => {
    for (const addr of Object.values(GUARD_WELL_KNOWN)) {
      expect(bs58Decode(addr).length).toBe(32);
    }
  });

  it("all-zero compressed point is on the ed25519 curve", () => {
    expect(isOnCurve(new Uint8Array(32))).toBe(true);
  });

  it("findProgramAddress is deterministic and returns an off-curve address", async () => {
    const programId = bs58Decode(GUARD_WELL_KNOWN.systemProgram);
    const payer = bs58Decode("D1SRLHKty8xExjdgA5TrERi8uL8xAxrSTSNCaLS2Gc4C");
    const slug = new Uint8Array(32).fill(7);
    const seeds = [new TextEncoder().encode("rialo_workflow"), payer, slug];

    const a = await findProgramAddress(seeds, programId, sha256);
    const b = await findProgramAddress(seeds, programId, sha256);
    expect(a.address.length).toBe(32);
    expect(Buffer.from(a.address).equals(Buffer.from(b.address))).toBe(true);
    expect(isOnCurve(a.address)).toBe(false);
    expect(a.bump).toBeGreaterThanOrEqual(0);
    expect(a.bump).toBeLessThanOrEqual(255);
  });

  it("findProgramAddress changes with the slug", async () => {
    const programId = bs58Decode(GUARD_WELL_KNOWN.systemProgram);
    const payer = bs58Decode("D1SRLHKty8xExjdgA5TrERi8uL8xAxrSTSNCaLS2Gc4C");
    const seeds1 = [new TextEncoder().encode("rialo_workflow"), payer, new Uint8Array(32).fill(1)];
    const seeds2 = [new TextEncoder().encode("rialo_workflow"), payer, new Uint8Array(32).fill(2)];
    const a = await findProgramAddress(seeds1, programId, sha256);
    const b = await findProgramAddress(seeds2, programId, sha256);
    expect(Buffer.from(a.address).equals(Buffer.from(b.address))).toBe(false);
  });

  it("evaluate data: u32 variant 0 + slug + bincode strings + u64", () => {
    const data = buildEvaluateData({
      slug: new Uint8Array(32).fill(9),
      action: "buy",
      asset: "btc",
      amountKelvin: 10n,
      destination: "",
    });
    // 4 variant + 32 slug + (8 len + 3) action + (8 len + 3) asset + 8 amount + (8 len + 0) dest
    expect(data.length).toBe(74);
    expect(Array.from(data.slice(0, 4))).toEqual([0, 0, 0, 0]);
    expect(Array.from(data.slice(4, 36))).toEqual(new Array(32).fill(9));
  });

  it("initialize data: u32 variant 1 + u64 + bool + string", () => {
    const data = buildInitializeData({
      slug: new Uint8Array(32),
      maxAmount: 500_000_000n,
      allowWithdraw: false,
      allowedAssets: "BTC,ETH",
    });
    expect(data[0]).toBe(1);
    expect(data[36]).toBe(0); // allow_withdraw false
  });

  it("invoke message has the expected structure and length", () => {
    const data = buildEvaluateData({
      slug: new Uint8Array(32).fill(9),
      action: "buy",
      asset: "btc",
      amountKelvin: 10n,
      destination: "",
    });
    const msg = buildInvokeMessage({
      feePayer: "D1SRLHKty8xExjdgA5TrERi8uL8xAxrSTSNCaLS2Gc4C",
      programId: GUARD_WELL_KNOWN.systemProgram,
      accounts: [
        {
          pubkey: "D1SRLHKty8xExjdgA5TrERi8uL8xAxrSTSNCaLS2Gc4C",
          isSigner: false,
          isWritable: true,
        },
        { pubkey: GUARD_WELL_KNOWN.systemProgram, isSigner: false, isWritable: false },
        { pubkey: GUARD_WELL_KNOWN.subscriberInterface, isSigner: false, isWritable: false },
      ],
      data,
      validFrom: 1786340883932,
      configHashPrefix: 8888927001659606077n,
    });
    // header 3 + key count 1 + 5 keys*32 + vf 8 + config 8 + occ 1 + icount 1
    // + pidx 1 + idx compact (1+4) + data compact (1+74)
    expect(msg.length).toBe(263);
    expect(Array.from(msg.slice(0, 3))).toEqual([1, 0, 3]);
  });
});
