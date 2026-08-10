import { describe, expect, it, vi } from "vitest";
import { RialoJsonRpcTransport, isRealOnChainHash } from "@/lib/astraeon/rialo";

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(data),
  } as Response;
}

function transportFor(handler: (method: string, params: unknown[]) => Promise<unknown>) {
  const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as { method: string; params: unknown[] };
    const result = await handler(body.method, body.params);
    return jsonResponse({ jsonrpc: "2.0", id: 1, result });
  });
  return new RialoJsonRpcTransport("http://test", fetchImpl as unknown as typeof fetch);
}

describe("Rialo JSON-RPC transport", () => {
  it("probes health, block height and balance", async () => {
    const t = transportFor(async (method) => {
      if (method === "getHealth") return "ok";
      if (method === "getBlockHeight") return 482133;
      if (method === "getBalance") return { value: 1_000_000_000 };
      throw new Error(`unexpected ${method}`);
    });
    const info = await t.probe("abc");
    expect(info.reachable).toBe(true);
    expect(info.blockHeight).toBe(482133);
    expect(info.balanceKelvin).toBe("1000000000");
  });

  it("degrades gracefully when the node is unreachable", async () => {
    const t = transportFor(async () => {
      throw new Error("network down");
    });
    const info = await t.probe();
    expect(info.reachable).toBe(false);
    expect(info.error).toContain("network down");
  });

  it("reads the config hash prefix as an exact BigInt", async () => {
    // The node returns the config hash as a JSON number that exceeds 2^53; the
    // transport must recover the exact digits from the raw response text.
    const exact = '{"jsonrpc":"2.0","id":1,"result":{"configHashPrefix":8888927001659606077}}';
    const fetchImpl = vi.fn(
      async () => ({ ok: true, status: 200, text: async () => exact }) as Response,
    );
    const t = new RialoJsonRpcTransport("http://test", fetchImpl as unknown as typeof fetch);
    const big = await t.getConfigHashPrefix();
    expect(big).toBe(8888927001659606077n);
  });

  it("parses a fetched transaction for audit verification", async () => {
    const t = transportFor(async (method) => {
      if (method === "getTransaction") {
        return {
          block_height: 8601045,
          block_time: 1786344091,
          validFrom: 1786340883932,
          meta: {
            fee: 5000,
            err: null,
            logMessages: ["Program 1111 invoke [1]", "Program 1111 success"],
            computeUnitsConsumed: 150,
          },
          transaction: {
            message: {
              instructions: [{ programIdIndex: 2, accounts: [0, 1], data: "3Bxs3zzLZLuLQEYX" }],
            },
          },
        };
      }
      throw new Error(`unexpected ${method}`);
    });
    const tx = await t.getTransaction("sig");
    expect(tx.blockHeight).toBe(8601045);
    expect(tx.fee).toBe(5000);
    expect(tx.logMessages[1]).toBe("Program 1111 success");
    expect(tx.instructions[0]?.accounts).toEqual([0, 1]);
  });

  it("classifies real on-chain hashes", () => {
    const real =
      "5JYDs1N3mA6b7g2S6FhSgsNxV53s38qkXmJku9ZK5b25W8TaG6ugbQQof3Tgy1W9mfTnCwyBcZUhHszQ5pTsG1CF";
    expect(isRealOnChainHash(real)).toBe(true);
    expect(isRealOnChainHash("0x9f31…a42c")).toBe(false);
    expect(isRealOnChainHash("gway_px_a91c")).toBe(false);
    expect(isRealOnChainHash(undefined)).toBe(false);
  });
});
