"use client";

import { useCallback, useEffect, useState } from "react";
import { useBots } from "@/lib/hooks";
import { api } from "@/lib/api";
import { mutate } from "swr";
import { ChevronDown, RefreshCw } from "lucide-react";
import {
  getExpectedBotStartPassword,
  readBotStartUnlockedFromStorage,
  writeBotStartUnlockedToStorage,
} from "@/lib/bot-start-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Bot, Zap, Signal, Clock } from "lucide-react";
import type { BotRuntimeParams, BotStatus } from "@/lib/types";
import { ASTER_DEX_SITE_URL } from "@/lib/aster-dex";

const ADMIN_CONTACT_EMAIL = "fenilshah23398@gmail.com";

export default function BotsPage() {
  const { data: botsData, isLoading, error, isValidating, mutate: revalidateBots } =
    useBots();
  const bots = botsData?.bots;
  const adxFilter = botsData?.adxFilter;
  const availableSymbols = botsData?.availableSymbols ?? ["BTCUSDT", "ETHUSDT"];

  const [sessionUnlocked, setSessionUnlocked] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState<{
    name: string;
    params: BotRuntimeParams;
  } | null>(null);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlockSubmitting, setUnlockSubmitting] = useState(false);

  useEffect(() => {
    setSessionUnlocked(readBotStartUnlockedFromStorage());
  }, []);

  const requestStartGuard = useCallback(
    (strategyName: string, params: BotRuntimeParams): boolean => {
      if (sessionUnlocked) return true;
      setPendingStart({ name: strategyName, params });
      setUnlockPassword("");
      setUnlockError(null);
      setUnlockOpen(true);
      return false;
    },
    [sessionUnlocked],
  );

  async function confirmUnlockAndStart() {
    setUnlockError(null);
    const expected = getExpectedBotStartPassword();
    if (unlockPassword !== expected) {
      setUnlockError("Incorrect password. Contact the administrator for access.");
      return;
    }
    if (!pendingStart) {
      setUnlockOpen(false);
      return;
    }
    setUnlockSubmitting(true);
    try {
      writeBotStartUnlockedToStorage();
      setSessionUnlocked(true);
      await api.startBot(pendingStart.name, pendingStart.params);
      setUnlockOpen(false);
      setPendingStart(null);
      setUnlockPassword("");
      await mutate("bots");
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : "Failed to start bot");
    } finally {
      setUnlockSubmitting(false);
    }
  }

  function cancelUnlock() {
    setUnlockOpen(false);
    setPendingStart(null);
    setUnlockPassword("");
    setUnlockError(null);
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="app-heading">Bots</h1>
          <p className="app-subheading mt-0.5">
            One card per strategy from the API (start/stop runs that strategy only).
          </p>
          <p className="mt-1 text-[11px] leading-snug text-zinc-600">
            Starting a bot places real trades on{" "}
            <a
              href={ASTER_DEX_SITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-cyan-500/90 underline-offset-2 hover:text-cyan-400 hover:underline"
            >
              Aster DEX
            </a>{" "}
            (on-chain perpetuals).
          </p>
          <p className="mt-1 text-[11px] leading-snug text-zinc-600">
            <span className="text-zinc-500">MA9 Cross</span> is a strategy card.{" "}
            <span className="text-zinc-500">ADX</span> is a trend filter applied to{" "}
            <em>all</em> strategies when enabled — it is not a separate bot.
          </p>
          {!isLoading && bots && (
            <p className="mt-1.5 truncate text-[11px] font-mono text-cyan-500/80" title={bots.map((b) => b.name).join(", ")}>
              {bots.length} strategies: {bots.map((b) => b.name).join(", ")}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLoading || isValidating}
          onClick={() => revalidateBots()}
          className="shrink-0 border-white/10 bg-white/[0.03] text-zinc-300 transition-colors duration-150 hover:border-cyan-500/25 hover:bg-cyan-500/[0.06] hover:text-cyan-100"
        >
          <RefreshCw
            className={`mr-2 h-3.5 w-3.5 ${isValidating ? "animate-spin" : ""}`}
          />
          Refresh list
        </Button>
      </div>

      <div className="app-alert border-amber-500/25 bg-amber-500/[0.08] px-3 py-2 text-sm text-amber-100/95">
        <p className="font-medium text-amber-50">Bot access is restricted</p>
        <p className="mt-0.5 text-[13px] leading-snug text-amber-100/85">
          To use live bot starts, contact the administrator at{" "}
          <a
            href={`mailto:${ADMIN_CONTACT_EMAIL}`}
            className="font-mono text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
          >
            {ADMIN_CONTACT_EMAIL}
          </a>
          . You will need the service password to enable Start for this session.
        </p>
      </div>

      {error && (
        <div className="app-alert border-red-500/25 bg-red-500/10 px-3 py-2 text-[13px] leading-snug text-red-200">
          Could not load strategies. Check that the backend is running and{" "}
          <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_API_URL</code> points
          to it, then click Refresh. ({String((error as Error).message)})
        </div>
      )}

      {adxFilter && (
        <div
          className={`app-alert border px-3 py-2 text-[13px] leading-snug ${
            adxFilter.enabled
              ? "border-cyan-500/25 bg-cyan-500/[0.07] text-cyan-200/90"
              : "border-zinc-700/50 bg-zinc-900/50 text-zinc-400"
          }`}
        >
          <span className="font-semibold text-white">ADX trend filter: </span>
          {adxFilter.enabled ? (
            <>
              <span className="text-zinc-300">
                Signals only fire when ADX ≥ {adxFilter.threshold} (period{" "}
                {adxFilter.period}). Choppy markets are skipped.
              </span>
            </>
          ) : (
            <span>Disabled — every strategy signal can trade (set ADX_FILTER_ENABLED=true in backend .env).</span>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 bg-white/[0.04] sm:h-44" />
          ))}
        </div>
      ) : bots?.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <BotCard
              key={bot.name}
              bot={bot}
              availableSymbols={availableSymbols}
              sessionUnlocked={sessionUnlocked}
              requestStartGuard={requestStartGuard}
            />
          ))}
        </div>
      ) : (
        !error && (
          <div className="app-card ring-0 px-3 py-6 text-center text-sm text-zinc-500">
            No strategies returned. Restart the backend so it loads the latest code
            (including <code className="text-zinc-400">ma9</code>), then Refresh.
          </div>
        )
      )}

      {unlockOpen && (
        <div
          className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bot-unlock-title"
        >
          <div className="app-card ring-0 relative w-full max-w-md p-4 shadow-xl animate-modal-in">
            <h2 id="bot-unlock-title" className="text-base font-semibold text-white">
              Unlock bot start
            </h2>
            <p className="mt-1.5 text-sm leading-snug text-zinc-400">
              This service requires authorization. Contact{" "}
              <a
                href={`mailto:${ADMIN_CONTACT_EMAIL}`}
                className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
              >
                {ADMIN_CONTACT_EMAIL}
              </a>{" "}
              for access, then enter the password below.
            </p>
            <label className="mt-3 block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Password
              </span>
              <input
                type="password"
                autoComplete="off"
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void confirmUnlockAndStart();
                }}
                className="w-full rounded-lg border border-white/10 bg-zinc-900/90 px-2.5 py-2 text-sm text-white outline-none transition-[border-color,box-shadow] duration-150 focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Enter password"
              />
            </label>
            {unlockError && (
              <p className="mt-2 text-sm text-red-400">{unlockError}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelUnlock}
                disabled={unlockSubmitting}
                className="border-white/10 bg-transparent text-zinc-300 hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void confirmUnlockAndStart()}
                disabled={unlockSubmitting || !unlockPassword}
                className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/30"
              >
                {unlockSubmitting ? "Starting…" : "Unlock & start"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BotCard({
  bot,
  availableSymbols,
  sessionUnlocked,
  requestStartGuard,
}: {
  bot: BotStatus;
  availableSymbols: string[];
  sessionUnlocked: boolean;
  requestStartGuard: (strategyName: string, params: BotRuntimeParams) => boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runtimeParams, setRuntimeParams] = useState<BotRuntimeParams>(bot.runtimeParams);

  useEffect(() => {
    setRuntimeParams(bot.runtimeParams);
  }, [bot.runtimeParams]);

  async function toggle() {
    setLoading(true);
    setError(null);
    try {
      if (bot.active) {
        await api.stopBot(bot.name);
      } else {
        if (!sessionUnlocked && !requestStartGuard(bot.name, runtimeParams)) {
          return;
        }
        await api.startBot(bot.name, runtimeParams);
      }
      await mutate("bots");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const startedShort = bot.startedAt
    ? new Date(bot.startedAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <Card
      size="sm"
      className={`app-card ring-0 flex flex-col ${bot.active ? "ring-1 ring-cyan-500/15" : ""}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${bot.active ? "bg-cyan-500/10" : "bg-zinc-800/50"}`}
            >
              <Bot className={`h-4 w-4 ${bot.active ? "text-cyan-400" : "text-zinc-600"}`} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold leading-tight text-white">
                {bot.displayName}
              </CardTitle>
              <p className="truncate font-mono text-[10px] text-zinc-500">{bot.name}</p>
            </div>
          </div>
          <Badge
            className={
              bot.active
                ? "shrink-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "shrink-0 bg-zinc-800 text-zinc-500 border-zinc-700"
            }
          >
            <span
              className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${bot.active ? "bg-emerald-400" : "bg-zinc-600"}`}
            />
            {bot.active ? "On" : "Off"}
          </Badge>
        </div>
        <CardDescription className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-500">
          {bot.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-2">
        <div className="grid grid-cols-2 gap-2">
          <InfoChip icon={<Zap className="h-3 w-3" />} label="Evals" value={String(bot.evaluations ?? 0)} />
          <InfoChip icon={<Signal className="h-3 w-3" />} label="Signals" value={String(bot.signalsGenerated ?? 0)} />
          {bot.startedAt && (
            <div className="col-span-2">
              <InfoChip icon={<Clock className="h-3 w-3" />} label="Started" value={startedShort} />
            </div>
          )}
        </div>

        {!bot.active && (
          <details className="runtime-details rounded-lg border border-white/[0.06] bg-white/[0.02]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 [&::-webkit-details-marker]:hidden">
              <span>Parameters</span>
              <ChevronDown className="runtime-chevron h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden />
            </summary>
            <div className="space-y-2 border-t border-white/[0.06] px-2 pb-2 pt-2">
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <label className="space-y-0.5 col-span-2">
                  <span className="text-zinc-500">Pair</span>
                  <select
                    value={runtimeParams.symbols?.[0] ?? availableSymbols[0]}
                    onChange={(e) =>
                      setRuntimeParams((p) => ({ ...p, symbols: [e.target.value] }))
                    }
                    className="w-full rounded border border-white/10 bg-zinc-900 px-1.5 py-1 text-zinc-200 outline-none focus:border-cyan-500"
                  >
                    {availableSymbols.map((sym) => (
                      <option key={sym} value={sym}>
                        {sym}
                      </option>
                    ))}
                  </select>
                </label>
                <ParamInput
                  label="Lev"
                  value={runtimeParams.leverage}
                  onChange={(v) => setRuntimeParams((p) => ({ ...p, leverage: v }))}
                />
                <ParamInput
                  label="USDT"
                  value={runtimeParams.tradeUsdt}
                  onChange={(v) => setRuntimeParams((p) => ({ ...p, tradeUsdt: v }))}
                />
                <ParamInput
                  label="SL %"
                  value={runtimeParams.slPercent}
                  onChange={(v) => setRuntimeParams((p) => ({ ...p, slPercent: v }))}
                />
                <ParamInput
                  label="TP %"
                  value={runtimeParams.tpPercent}
                  onChange={(v) => setRuntimeParams((p) => ({ ...p, tpPercent: v }))}
                />
                <ParamInput
                  label="ADX p"
                  value={runtimeParams.adxPeriod}
                  onChange={(v) => setRuntimeParams((p) => ({ ...p, adxPeriod: v }))}
                  disabled={!runtimeParams.adxFilterEnabled}
                />
                <ParamInput
                  label="ADX min"
                  value={runtimeParams.adxThreshold}
                  onChange={(v) => setRuntimeParams((p) => ({ ...p, adxThreshold: v }))}
                  disabled={!runtimeParams.adxFilterEnabled}
                />
              </div>
              <div className="flex items-center justify-between rounded border border-white/[0.06] px-2 py-1">
                <span className="text-[11px] text-zinc-400">ADX filter</span>
                <Switch
                  checked={runtimeParams.adxFilterEnabled}
                  onCheckedChange={(checked) =>
                    setRuntimeParams((p) => ({ ...p, adxFilterEnabled: checked }))
                  }
                  disabled={loading}
                />
              </div>
            </div>
          </details>
        )}

        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-2">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${bot.active ? "bg-emerald-400" : "bg-zinc-600"}`} />
            <span className="text-sm font-medium text-zinc-300">
              {bot.active ? "Running" : "Stopped"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={bot.active}
              onCheckedChange={toggle}
              disabled={loading}
            />
            <Button
              size="sm"
              variant={bot.active ? "destructive" : "default"}
              onClick={toggle}
              disabled={loading}
              className={bot.active
                ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20"
              }
            >
              {loading ? "..." : bot.active ? "Stop" : "Start"}
            </Button>
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-red-500/10 px-2 py-1 text-[11px] text-red-400">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}

function ParamInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-0.5">
      <span className="text-zinc-500">{label}</span>
      <input
        type="number"
        step="0.01"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border border-white/10 bg-zinc-900 px-1.5 py-1 text-[11px] tabular-nums text-zinc-200 outline-none focus:border-cyan-500 disabled:opacity-50"
      />
    </label>
  );
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1.5">
      <div className="flex items-center gap-1 text-zinc-500">
        {icon}
        <span className="text-[9px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-0.5 truncate text-xs font-semibold tabular-nums text-zinc-200">{value}</p>
    </div>
  );
}
