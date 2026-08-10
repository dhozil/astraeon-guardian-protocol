import type { VaultCredential } from "./types";

export interface GatewayResult {
  credentialId: string;
  service: string;
  path: string;
  statusCode: number;
  payload: unknown;
  maskedCredential: string;
}

export interface GatewayAccess {
  agentId: string;
  service: string;
  path: string;
}

export class CredentialGateway {
  private readonly credentials: VaultCredential[];

  constructor(credentials: VaultCredential[]) {
    this.credentials = credentials;
  }

  list(): VaultCredential[] {
    return this.credentials.map((c) => ({ ...c }));
  }

  has(service: string): boolean {
    return this.credentials.some((c) => c.service === service);
  }

  findByService(service: string): VaultCredential | undefined {
    const s = service.trim().toLowerCase();
    return this.credentials.find((c) => c.service.toLowerCase() === s);
  }

  // Agent never receives the key. The gateway proxies the request.
  proxy(access: GatewayAccess): GatewayResult {
    const cred = this.credentials.find((c) => c.service === access.service);
    if (!cred) {
      return {
        credentialId: "none",
        service: access.service,
        path: access.path,
        statusCode: 404,
        payload: { error: `no credential vaulted for ${access.service}` },
        maskedCredential: "—",
      };
    }
    return {
      credentialId: cred.id,
      service: cred.service,
      path: access.path,
      statusCode: 200,
      payload: {
        service: cred.service,
        destination: cred.destinationId,
        data: `proxied ${access.path}`,
        source: "Astraeon Credential Gateway",
      },
      maskedCredential: cred.maskedKey,
    };
  }
}

export function defaultCredentials(): VaultCredential[] {
  return [
    {
      id: "cred-1",
      service: "Market Data",
      destinationId: "dest-market-api",
      path: "/v1/market",
      maskedKey: "mkt_******7H2k",
      label: "MARKET DATA",
    },
    {
      id: "cred-2",
      service: "CoinGecko",
      destinationId: "dest-coingecko",
      path: "/v1/prices",
      maskedKey: "cg_******3QmX",
      label: "COINGECKO",
    },
    {
      id: "cred-3",
      service: "Weather",
      destinationId: "dest-weather",
      path: "/v1/forecast",
      maskedKey: "wx_******3PdA",
      label: "WEATHER",
    },
    {
      id: "cred-4",
      service: "Exchange",
      destinationId: "dest-dex-router",
      path: "/v1/trade",
      maskedKey: "exc_******9Kx",
      label: "DEX ROUTER",
    },
  ];
}
