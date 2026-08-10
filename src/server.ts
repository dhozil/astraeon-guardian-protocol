import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

/**
 * Same-origin JSON-RPC proxy. Rialo DevNet is HTTP-only and sends no CORS
 * headers, so browsers cannot call it directly (mixed content + CORS). This
 * forwards /api/rialo POSTs server-side and returns the raw node response.
 * Set RIALO_RPC_URL (server env) to override the upstream.
 */
const DEFAULT_RIALO_RPC_URL = "http://devnet.rialo.io:4100";

function rialoRpcUrlFromEnv(): string {
  const url =
    typeof process !== "undefined" && process.env?.["RIALO_RPC_URL"]
      ? process.env["RIALO_RPC_URL"]
      : DEFAULT_RIALO_RPC_URL;
  return url;
}

async function handleRialoProxy(request: Request): Promise<Response> {
  try {
    const body = await request.text();
    const res = await fetch(rialoRpcUrlFromEnv(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    return new Response(await res.text(), {
      status: res.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        error: { message: `proxy upstream: ${err instanceof Error ? err.message : String(err)}` },
      }),
      {
        status: 502,
        headers: { "content-type": "application/json; charset=utf-8" },
      },
    );
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/rialo" && request.method === "POST") {
        return await handleRialoProxy(request);
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
