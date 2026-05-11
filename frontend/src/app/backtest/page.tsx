"use client";

import { useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import type { BacktestResult, ExitReason } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
  AlertTriangle,
  ShieldOff,
  CircleDollarSign,
  FlaskConical,
  Activity,
  Filter,
  Info,
} from "lucide-react";

const STRATEGIES = [
  { value: "supertrend", label: "SuperTrend" },
  { value: "macd", label: "MACD Crossover" },
  { value: "rsi_ema", label: "RSI + EMA" },
  { value: "ma9", label: "MA9 Cross" },
  { value: "rsi_levels", label: "RSI 60/40" },
];

const EXIT_LABELS: Record<ExitReason, string> = {
  stop_loss: "Stop Loss",
  take_profit: "Take Profit",
  signal_flip: "Signal Flip",
  still_open: "Still Open",
};

const EXIT_BADGE_CLASS: Record<ExitReason, string> = {
  stop_loss:
    "inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400",
  take_profit:
    "inline-flex items-center rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400",
  signal_flip:
    "inline-flex items-center rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-400",
  still_open:
    "inline-flex items-center rounded-md border border-zinc-500/20 bg-zinc-500/10 px-2 py-0.5 text-xs font-medium text-zinc-400",
};

const ACCENT_COLORS = {
  zinc: { bg: "bg-zinc-500/10", text: "text-zinc-400" },
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400" },
  green: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
  red: { bg: "bg-red-500/10", text: "text-red-400" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-400" },
} as const;

const inputClass =
  "flex h-9 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-sm text-zinc-200 shadow-sm transition-[border-color,box-shadow,background-color] duration-200 focus:border-cyan-500/50 focus:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-cyan-500/20";

const labelClass =
  "text-xs font-medium uppercase tracking-wider text-zinc-500";

export default function BacktestPage() {
  const [strategy, setStrategy] = useState("supertrend");
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [startBalance, setStartBalance] = useState(100);
  const [leverage, setLeverage] = useState(4);
  const [feePercent, setFeePercent] = useState(0.05);
  const [slPercent, setSlPercent] = useState(20);
  const [tpPercent, setTpPercent] = useState(20);
  const [adxFilterEnabled, setAdxFilterEnabled] = useState(true);
  const [adxPeriod, setAdxPeriod] = useState(14);
  const [adxThreshold, setAdxThreshold] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);

  async function handleRunBacktest() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.runBacktest({
        strategy,
        symbol,
        startBalance,
        leverage,
        feePercent,
        slPercent,
        tpPercent,
        adxFilterEnabled,
        adxPeriod,
        adxThreshold,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Backtest failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="app-heading">Backtest</h1>
        <p className="app-subheading mt-0.5">
          Simulate strategies on stored candles with SL/TP. Use the ADX block below to
          match live bot filtering.
        </p>
      </div>

      <Card className="app-card ring-0">
        <CardHeader>
          <CardTitle className="text-white">Configuration</CardTitle>
          <CardDescription className="text-zinc-500">
            Pick a strategy, set parameters, and run the backtest
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className={labelClass}>Strategy</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className={inputClass}
              >
                {STRATEGIES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Symbol</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className={inputClass}
              >
                <option value="BTCUSDT">BTCUSDT</option>
                <option value="ETHUSDT">ETHUSDT</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Start Balance ($)</label>
              <input
                type="number"
                value={startBalance}
                onChange={(e) => setStartBalance(Number(e.target.value))}
                min={1}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Leverage</label>
              <input
                type="number"
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                min={1}
                max={20}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Stop Loss % (of margin)</label>
              <input
                type="number"
                value={slPercent}
                onChange={(e) => setSlPercent(Number(e.target.value))}
                min={1}
                max={100}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Take Profit % (of margin)</label>
              <input
                type="number"
                value={tpPercent}
                onChange={(e) => setTpPercent(Number(e.target.value))}
                min={1}
                max={500}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <label className={labelClass}>Fee %</label>
              <input
                type="number"
                value={feePercent}
                onChange={(e) => setFeePercent(Number(e.target.value))}
                min={0}
                step={0.01}
                className={inputClass}
              />
            </div>
          </div>

          {/* Full-width panel (not a grid child) so ADX never disappears in production layouts */}
          <div
            className="mt-5 w-full rounded-xl border border-cyan-500/30 bg-cyan-500/[0.06] p-4"
            data-testid="backtest-adx-filter"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 shrink-0 text-cyan-400" />
              <span className="text-sm font-semibold text-white">ADX trend filter</span>
              <span className="text-xs text-zinc-500">
                (only signals when ADX ≥ threshold)
              </span>
            </div>
            <div className="flex flex-wrap items-end gap-6">
              <div className="flex items-center gap-3">
                <Switch
                  checked={adxFilterEnabled}
                  onCheckedChange={setAdxFilterEnabled}
                  id="adx-enabled"
                />
                <label htmlFor="adx-enabled" className="text-sm text-zinc-200">
                  Enable ADX filter
                </label>
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>ADX period</label>
                <input
                  type="number"
                  value={adxPeriod}
                  onChange={(e) => setAdxPeriod(Number(e.target.value))}
                  min={2}
                  max={50}
                  disabled={!adxFilterEnabled}
                  className={inputClass + " w-28 disabled:opacity-40"}
                />
              </div>
              <div className="space-y-1.5">
                <label className={labelClass}>ADX min (threshold)</label>
                <input
                  type="number"
                  value={adxThreshold}
                  onChange={(e) => setAdxThreshold(Number(e.target.value))}
                  min={0}
                  max={100}
                  step={0.5}
                  disabled={!adxFilterEnabled}
                  className={inputClass + " w-32 disabled:opacity-40"}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleRunBacktest}
            disabled={loading}
            className="mt-3 bg-cyan-500 font-semibold text-black transition-colors duration-150 hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? "Running..." : "Run Backtest"}
          </Button>
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
        </CardContent>
      </Card>

      {loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-24 bg-white/[0.04]" />
          ))}
        </div>
      )}

      {result && !loading && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <BacktestStatCard
              title="Strategy"
              value={result.summary.strategyDisplayName}
              description={result.summary.symbol}
              icon={<BarChart3 className="h-4 w-4" />}
              accent="zinc"
            />
            <BacktestStatCard
              title="Start Balance"
              value={`$${result.summary.startBalance.toFixed(2)}`}
              icon={<DollarSign className="h-4 w-4" />}
              accent="zinc"
            />
            <BacktestStatCard
              title="End Balance"
              value={`$${result.summary.endBalance.toFixed(2)}`}
              icon={<DollarSign className="h-4 w-4" />}
              accent={
                result.summary.endBalance >= result.summary.startBalance
                  ? "green"
                  : "red"
              }
              valueClassName={
                result.summary.endBalance >= result.summary.startBalance
                  ? "text-emerald-400"
                  : "text-red-400"
              }
            />
            <BacktestStatCard
              title="Total Return"
              value={`${result.summary.totalReturn >= 0 ? "+" : ""}${result.summary.totalReturn.toFixed(2)}%`}
              icon={
                result.summary.totalReturn >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )
              }
              accent={result.summary.totalReturn >= 0 ? "green" : "red"}
              valueClassName={
                result.summary.totalReturn >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }
            />
            <BacktestStatCard
              title="Win Rate"
              value={`${result.summary.winRate.toFixed(1)}%`}
              description={`${result.summary.winCount}W / ${result.summary.lossCount}L`}
              icon={<Target className="h-4 w-4" />}
              accent="cyan"
            />
            <BacktestStatCard
              title="Max Drawdown"
              value={`${result.summary.maxDrawdown.toFixed(2)}%`}
              description="Worst peak-to-trough decline"
              icon={<AlertTriangle className="h-4 w-4" />}
              accent="red"
              valueClassName="text-red-400"
            />
            <BacktestStatCard
              title="Stop Loss Hits"
              value={String(result.summary.slHits)}
              description={`SL at ${result.summary.slPercent}% of margin`}
              icon={<ShieldOff className="h-4 w-4" />}
              accent="red"
            />
            <BacktestStatCard
              title="Take Profit Hits"
              value={String(result.summary.tpHits)}
              description={`TP at ${result.summary.tpPercent}% of margin`}
              icon={<CircleDollarSign className="h-4 w-4" />}
              accent="green"
            />
            <BacktestStatCard
              title="Total Trades"
              value={String(result.summary.totalTrades)}
              icon={<Activity className="h-4 w-4" />}
              accent="violet"
            />
            <BacktestStatCard
              title="ADX filter"
              value={
                result.summary.adxFilter.enabled
                  ? `${result.summary.adxFilter.signalsUsed} / ${result.summary.adxFilter.signalsRaw}`
                  : "Off"
              }
              description={
                result.summary.adxFilter.enabled
                  ? `${result.summary.adxFilter.signalsFilteredOut} blocked · period ${result.summary.adxFilter.period} · min ${result.summary.adxFilter.threshold}`
                  : "All raw strategy signals used"
              }
              icon={<Filter className="h-4 w-4" />}
              accent="cyan"
            />
          </div>

          <StrategyConfigCard config={result.summary.strategyConfig} />

          {result.summary.superTrendDiagnostics && (
            <Card className="app-card ring-0 border-amber-500/25 transition-colors duration-150 hover:border-amber-500/35">
              <CardHeader className="flex flex-row items-start gap-3 pb-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10">
                  <Info className="h-4 w-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-white">
                    SuperTrend — recent bars &amp; ADX
                  </CardTitle>
                  <CardDescription className="text-zinc-500">
                    Why a chart flip may not appear as a trade (usually ADX &lt; your
                    minimum).
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.summary.superTrendDiagnostics.note && (
                  <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-100/90">
                    {result.summary.superTrendDiagnostics.note}
                  </p>
                )}
                <div className="max-h-[220px] overflow-auto rounded-lg border border-white/[0.06]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.06] hover:bg-transparent">
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                          Open (UTC)
                        </TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                          Close
                        </TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                          SuperTrend
                        </TableHead>
                        <TableHead className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                          ADX
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.summary.superTrendDiagnostics.tailBars.map((row, idx) => (
                        <TableRow
                          key={idx}
                          className="border-white/[0.06] hover:bg-white/[0.02]"
                        >
                          <TableCell className="whitespace-nowrap text-xs text-zinc-300">
                            {new Date(row.openTime).toISOString().slice(0, 16).replace("T", " ")}
                          </TableCell>
                          <TableCell className="text-xs text-zinc-200">
                            ${row.close.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.stDirection ? (
                              <span
                                className={
                                  row.stDirection === "BULL"
                                    ? "text-emerald-400"
                                    : "text-red-400"
                                }
                              >
                                {row.stDirection}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-zinc-300">
                            {row.adx != null ? row.adx.toFixed(2) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {result.summary.superTrendDiagnostics.lastBlockedSignal && (
                  <p className="text-xs text-zinc-500">
                    Last raw signal not traded:{" "}
                    <span className="text-zinc-300">
                      {result.summary.superTrendDiagnostics.lastBlockedSignal.action}
                    </span>{" "}
                    at index{" "}
                    {result.summary.superTrendDiagnostics.lastBlockedSignal.signalIndex}{" "}
                    · ADX at evaluation:{" "}
                    {result.summary.superTrendDiagnostics.lastBlockedSignal.adxAtEvaluation?.toFixed(
                      2
                    ) ?? "—"}{" "}
                    (min{" "}
                    {result.summary.superTrendDiagnostics.lastBlockedSignal.adxThreshold})
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="app-card ring-0">
            <CardHeader>
              <CardTitle className="text-white">Trade Log</CardTitle>
              <CardDescription className="text-zinc-500">
                {result.summary.strategyDisplayName} &middot;{" "}
                {result.summary.symbol} &middot;{" "}
                {result.summary.leverage}x leverage &middot; SL{" "}
                {result.summary.slPercent}% / TP {result.summary.tpPercent}%
                {result.summary.adxFilter.enabled
                  ? ` · ADX ≥ ${result.summary.adxFilter.threshold} (p${result.summary.adxFilter.period})`
                  : " · ADX filter off"}
                &middot; {result.summary.totalTrades} trades &middot;{" "}
                {new Date(result.summary.period.from).toLocaleDateString()}{" "}
                &ndash;{" "}
                {new Date(result.summary.period.to).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/[0.06] hover:bg-transparent">
                      <TableHead className="w-8 text-xs font-medium uppercase tracking-wider text-zinc-500">
                        #
                      </TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Entry Time
                      </TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Exit Time
                      </TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Side
                      </TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Entry
                      </TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        SL
                      </TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        TP
                      </TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Exit
                      </TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Exit Reason
                      </TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Margin
                      </TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Fee
                      </TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        PnL
                      </TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                        Balance
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.trades.map((trade, idx) => {
                      const exitLabel =
                        EXIT_LABELS[trade.exitReason] ?? trade.exitReason;
                      const exitClass =
                        EXIT_BADGE_CLASS[trade.exitReason] ??
                        EXIT_BADGE_CLASS.still_open;
                      return (
                        <TableRow
                          key={idx}
                          className="border-white/[0.06] transition-colors hover:bg-white/[0.02]"
                        >
                          <TableCell className="text-zinc-500">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-zinc-200">
                            {new Date(trade.entryTime).toLocaleString()}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-zinc-200">
                            {trade.stillOpen ? (
                              <span
                                className={
                                  EXIT_BADGE_CLASS.still_open
                                }
                              >
                                Still Open
                              </span>
                            ) : (
                              new Date(trade.exitTime).toLocaleString()
                            )}
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                trade.side === "LONG"
                                  ? "inline-flex items-center rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400"
                                  : "inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400"
                              }
                            >
                              {trade.side}
                            </span>
                          </TableCell>
                          <TableCell className="text-zinc-200">
                            ${trade.entryPrice.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-xs text-red-400/70">
                            {trade.slPrice != null
                              ? `$${trade.slPrice.toFixed(2)}`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-emerald-400/70">
                            {trade.tpPrice != null
                              ? `$${trade.tpPrice.toFixed(2)}`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-zinc-200">
                            ${trade.exitPrice.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <span className={exitClass}>{exitLabel}</span>
                          </TableCell>
                          <TableCell className="text-zinc-200">
                            ${trade.margin.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-zinc-500">
                            ${trade.fee.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`font-medium ${trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium text-white">
                            ${trade.balanceAfter.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StrategyConfigCard({ config }: { config: Record<string, number> }) {
  const entries = Object.entries(config);
  if (!entries.length) return null;

  return (
    <Card className="app-card ring-0">
      <CardHeader className="flex flex-row items-center gap-3 pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02]">
          <FlaskConical className="h-4 w-4 text-cyan-400" />
        </div>
        <div>
          <CardTitle className="text-sm font-medium text-white">
            Strategy Parameters
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {entries.map(([key, value]) => (
            <div
              key={key}
              className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-sm"
            >
              <span className="text-zinc-500">{formatKey(key)}</span>
              <span className="font-medium text-zinc-200">{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatKey(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function BacktestStatCard({
  title,
  value,
  description,
  icon,
  accent,
  valueClassName,
}: {
  title: string;
  value: string;
  description?: string;
  icon: ReactNode;
  accent: keyof typeof ACCENT_COLORS;
  valueClassName?: string;
}) {
  const c = ACCENT_COLORS[accent];
  return (
    <Card className="app-card ring-0">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {title}
        </CardTitle>
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-md ${c.bg}`}
        >
          <span className={c.text}>{icon}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={`text-2xl font-bold tracking-tight ${valueClassName ?? "text-white"}`}
        >
          {value}
        </div>
        {description ? (
          <p className="mt-1 text-xs text-zinc-500">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
