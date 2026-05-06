const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getBots: () =>
    request<{
      bots: import("./types").BotStatus[];
      /** Present on newer API; optional for older backends */
      adxFilter?: import("./types").AdxFilterPublic;
      availableSymbols?: string[];
      tradingPlatforms?: import("./types").TradingPlatform[];
      platformDefaults?: Record<
        import("./types").TradingPlatform,
        import("./types").PlatformTradeDefaults
      >;
    }>("/bots"),

  getBotStatus: (strategy: string) =>
    request<import("./types").BotStatus>(`/bots/${strategy}`),

  startBot: (
    strategy: string,
    params?: Partial<import("./types").BotRuntimeParams>
  ) =>
    request<{ message: string }>(`/bots/${strategy}/start`, {
      method: "POST",
      body: JSON.stringify(params ?? {}),
    }),

  stopBot: (strategy: string) =>
    request<{ message: string }>(`/bots/${strategy}/stop`, { method: "POST" }),

  getBotLogs: (strategy: string, limit = 50) =>
    request<{ logs: import("./types").BotLog[] }>(
      `/bots/${strategy}/logs?limit=${limit}`
    ),

  getBotSignals: (strategy: string, limit = 50) =>
    request<{ signals: import("./types").Signal[] }>(
      `/bots/${strategy}/signals?limit=${limit}`
    ),

  getOrders: (params?: { strategy?: string; symbol?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.strategy) q.set("strategy", params.strategy);
    if (params?.symbol) q.set("symbol", params.symbol);
    if (params?.limit) q.set("limit", String(params.limit));
    return request<{ orders: import("./types").Order[] }>(`/orders?${q}`);
  },

  getPositions: (platform: import("./types").TradingPlatform = "aster") =>
    request<{ platform: string; positions: import("./types").Position[] }>(
      `/orders/positions?platform=${encodeURIComponent(platform)}`
    ),

  getHealth: () => request<{ status: string; uptime: number }>("/health"),

  runBacktest: (params: import("./types").BacktestParams) =>
    request<import("./types").BacktestResult>("/bots/backtest", {
      method: "POST",
      body: JSON.stringify(params),
    }),
};
