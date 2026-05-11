"use client";

import { useCallback, useEffect, useState } from "react";
import { useBots } from "@/lib/hooks";
import { api } from "@/lib/api";
import { mutate } from "swr";
import { RefreshCw } from "lucide-react";
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Bots</h1>
          <p className="text-sm text-zinc-500">
            One card per strategy from the API (start/stop runs that strategy only).
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            <span className="text-zinc-500">MA9 Cross</span> is a strategy card.{" "}
            <span className="text-zinc-500">ADX</span> is a trend filter applied to{" "}
            <em>all</em> strategies when enabled — it is not a separate bot.
          </p>
          {!isLoading && bots && (
            <p className="mt-2 text-xs font-mono text-cyan-500/80">
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
          className="shrink-0 border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
        >
          <RefreshCw
            className={`mr-2 h-3.5 w-3.5 ${isValidating ? "animate-spin" : ""}`}
          />
          Refresh list
        </Button>
      </div>

      <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
        <p className="font-medium text-amber-50">Bot access is restricted</p>
        <p className="mt-1 text-amber-100/85">
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
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Could not load strategies. Check that the backend is running and{" "}
          <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_API_URL</code> points
          to it, then click Refresh. ({String((error as Error).message)})
        </div>
      )}

      {adxFilter && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            adxFilter.enabled
              ? "border-cyan-500/20 bg-cyan-500/5 text-cyan-200/90"
              : "border-zinc-700/50 bg-zinc-900/40 text-zinc-400"
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 bg-white/[0.04]" />
          ))}
        </div>
      ) : bots?.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot, i) => (
            <BotCard
              key={bot.name}
              bot={bot}
              index={i}
              availableSymbols={availableSymbols}
              sessionUnlocked={sessionUnlocked}
              requestStartGuard={requestStartGuard}
            />
          ))}
        </div>
      ) : (
        !error && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
            No strategies returned. Restart the backend so it loads the latest code
            (including <code className="text-zinc-400">ma9</code>), then Refresh.
          </div>
        )
      )}

      {unlockOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bot-unlock-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141416] p-6 shadow-xl">
            <h2 id="bot-unlock-title" className="text-lg font-semibold text-white">
              Unlock bot start
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              This service requires authorization. Contact{" "}
              <a
                href={`mailto:${ADMIN_CONTACT_EMAIL}`}
                className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300"
              >
                {ADMIN_CONTACT_EMAIL}
              </a>{" "}
              for access, then enter the password below.
            </p>
            <label className="mt-4 block space-y-2">
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
                className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
                placeholder="Enter password"
              />
            </label>
            {unlockError && (
              <p className="mt-2 text-sm text-red-400">{unlockError}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
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
  index,
  availableSymbols,
  sessionUnlocked,
  requestStartGuard,
}: {
  bot: BotStatus;
  index: number;
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

  return (
    <Card
      className={`flex flex-col border-white/[0.06] bg-[#111113] transition-all duration-300 hover:border-white/[0.1] hover:bg-[#141416] animate-slide-up ${bot.active ? "glow-cyan" : ""}`}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bot.active ? "bg-cyan-500/10" : "bg-zinc-800/50"}`}>
              <Bot className={`h-5 w-5 ${bot.active ? "text-cyan-400" : "text-zinc-600"}`} />
            </div>
            <div>
              <CardTitle className="text-base text-white">{bot.displayName}</CardTitle>
              <p className="text-xs text-zinc-500 font-mono">{bot.name}</p>
            </div>
          </div>
          <Badge
            className={bot.active
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-zinc-800 text-zinc-500 border-zinc-700"
            }
          >
            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${bot.active ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
            {bot.active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <CardDescription className="mt-2 text-zinc-500 text-xs leading-relaxed">
          {bot.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <div className="grid grid-cols-2 gap-3">
          <InfoChip icon={<Zap className="h-3 w-3" />} label="Evaluations" value={String(bot.evaluations ?? 0)} />
          <InfoChip icon={<Signal className="h-3 w-3" />} label="Signals" value={String(bot.signalsGenerated ?? 0)} />
          {bot.startedAt && (
            <div className="col-span-2">
              <InfoChip icon={<Clock className="h-3 w-3" />} label="Started" value={new Date(bot.startedAt).toLocaleString()} />
            </div>
          )}
        </div>

        {!bot.active && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-3">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Runtime Params</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="space-y-1 col-span-2">
                <span className="text-zinc-500">Trading Pair</span>
                <select
                  value={runtimeParams.symbols?.[0] ?? availableSymbols[0]}
                  onChange={(e) =>
                    setRuntimeParams((p) => ({ ...p, symbols: [e.target.value] }))
                  }
                  className="w-full rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-zinc-200 outline-none focus:border-cyan-500"
                >
                  {availableSymbols.map((sym) => (
                    <option key={sym} value={sym}>
                      {sym}
                    </option>
                  ))}
                </select>
              </label>
              <ParamInput
                label="Leverage"
                value={runtimeParams.leverage}
                onChange={(v) => setRuntimeParams((p) => ({ ...p, leverage: v }))}
              />
              <ParamInput
                label="Trade USDT"
                value={runtimeParams.tradeUsdt}
                onChange={(v) => setRuntimeParams((p) => ({ ...p, tradeUsdt: v }))}
              />
              <ParamInput
                label="Stop Loss %"
                value={runtimeParams.slPercent}
                onChange={(v) => setRuntimeParams((p) => ({ ...p, slPercent: v }))}
              />
              <ParamInput
                label="Target %"
                value={runtimeParams.tpPercent}
                onChange={(v) => setRuntimeParams((p) => ({ ...p, tpPercent: v }))}
              />
              <ParamInput
                label="ADX Period"
                value={runtimeParams.adxPeriod}
                onChange={(v) => setRuntimeParams((p) => ({ ...p, adxPeriod: v }))}
                disabled={!runtimeParams.adxFilterEnabled}
              />
              <ParamInput
                label="ADX Min"
                value={runtimeParams.adxThreshold}
                onChange={(v) => setRuntimeParams((p) => ({ ...p, adxThreshold: v }))}
                disabled={!runtimeParams.adxFilterEnabled}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/[0.06] px-3 py-2">
              <span className="text-xs text-zinc-400">ADX Filter</span>
              <Switch
                checked={runtimeParams.adxFilterEnabled}
                onCheckedChange={(checked) =>
                  setRuntimeParams((p) => ({ ...p, adxFilterEnabled: checked }))
                }
                disabled={loading}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
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
          <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
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
    <label className="space-y-1">
      <span className="text-zinc-500">{label}</span>
      <input
        type="number"
        step="0.01"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-white/10 bg-zinc-900 px-2 py-1.5 text-zinc-200 outline-none focus:border-cyan-500 disabled:opacity-50"
      />
    </label>
  );
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <div className="flex items-center gap-1.5 text-zinc-500">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-0.5 text-sm font-semibold text-zinc-200 truncate">{value}</p>
    </div>
  );
}
