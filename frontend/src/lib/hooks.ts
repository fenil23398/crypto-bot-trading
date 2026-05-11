"use client";

import useSWR from "swr";
import { api } from "./api";

export function useBots() {
  return useSWR("bots", () => api.getBots(), {
    refreshInterval: 10_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
  });
}

export function useBotStatus(strategy: string) {
  return useSWR(`bot-${strategy}`, () => api.getBotStatus(strategy), {
    refreshInterval: 10_000,
  });
}

export function useBotLogs(strategy: string | null, limit = 100) {
  return useSWR(
    strategy ? `logs-${strategy}-${limit}` : null,
    () => api.getBotLogs(strategy!, limit).then((r) => r.logs),
    { refreshInterval: 15_000 }
  );
}

export function useBotSignals(strategy: string | null, limit = 100) {
  return useSWR(
    strategy ? `signals-${strategy}-${limit}` : null,
    () => api.getBotSignals(strategy!, limit).then((r) => r.signals),
    { refreshInterval: 15_000 }
  );
}

export function usePositions() {
  return useSWR("positions", () => api.getPositions().then((r) => r.positions), {
    refreshInterval: 5_000,
  });
}
