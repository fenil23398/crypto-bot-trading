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

  getPositions: () =>
    request<{ positions: import("./types").Position[] }>("/orders/positions"),

  getHealth: () => request<{ status: string; uptime: number }>("/health"),

  runBacktest: (params: import("./types").BacktestParams) =>
    request<import("./types").BacktestResult>("/bots/backtest", {
      method: "POST",
      body: JSON.stringify(params),
    }),
};
