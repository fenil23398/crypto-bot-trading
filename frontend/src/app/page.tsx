"use client";

import { useBots, usePositions, useOrders } from "@/lib/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, TrendingUp, ArrowLeftRight, DollarSign, Zap } from "lucide-react";

export default function DashboardPage() {
  const { data: botsData, isLoading: botsLoading } = useBots();
  const bots = botsData?.bots;
  const adxFilter = botsData?.adxFilter;
  const { data: positions, isLoading: posLoading } = usePositions();
  const { data: orders, isLoading: ordersLoading } = useOrders({ limit: 10 });

  const activeBots = bots?.filter((b) => b.active).length ?? 0;
  const totalBots = bots?.length ?? 0;

  const openPositions =
    positions?.filter((p) => parseFloat(p.positionAmt) !== 0) ?? [];

  const totalPnl = openPositions.reduce(
    (sum, p) => sum + parseFloat(p.unRealizedProfit),
    0
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Real-time overview of your trading activity
        </p>
        {adxFilter?.enabled && (
          <p className="mt-1 text-xs text-cyan-500/80">
            ADX filter on — signals require ADX ≥ {adxFilter.threshold} (period {adxFilter.period})
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Bots"
          value={botsLoading ? null : `${activeBots} / ${totalBots}`}
          description="Running strategies"
          icon={<Bot className="h-4 w-4" />}
          accent="cyan"
        />
        <StatCard
          title="Open Positions"
          value={posLoading ? null : String(openPositions.length)}
          description="Across all symbols"
          icon={<TrendingUp className="h-4 w-4" />}
          accent="violet"
        />
        <StatCard
          title="Unrealized PnL"
          value={posLoading ? null : `${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)} USDT`}
          description="Current open positions"
          icon={<DollarSign className="h-4 w-4" />}
          accent={totalPnl >= 0 ? "green" : "red"}
          valueClassName={totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}
        />
        <StatCard
          title="Recent Orders"
          value={ordersLoading ? null : String(orders?.length ?? 0)}
          description="Last 10 orders placed"
          icon={<ArrowLeftRight className="h-4 w-4" />}
          accent="amber"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-white/[0.06] bg-[#111113] animate-slide-up">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              <CardTitle className="text-white">Bot Status</CardTitle>
            </div>
            <CardDescription className="text-zinc-500">Current state of all strategies</CardDescription>
          </CardHeader>
          <CardContent>
            {botsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full bg-white/[0.04]" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {bots?.map((bot) => (
                  <div
                    key={bot.name}
                    className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bot.active ? "bg-cyan-500/10" : "bg-zinc-800"}`}>
                        <Bot className={`h-4 w-4 ${bot.active ? "text-cyan-400" : "text-zinc-600"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{bot.displayName}</p>
                        <p className="text-xs text-zinc-500">{bot.name}</p>
                      </div>
                    </div>
                    <Badge
                      variant={bot.active ? "default" : "secondary"}
                      className={bot.active
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15"
                        : "bg-zinc-800 text-zinc-500 border-zinc-700"
                      }
                    >
                      {bot.active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/[0.06] bg-[#111113] animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <CardTitle className="text-white">Open Positions</CardTitle>
            </div>
            <CardDescription className="text-zinc-500">Active positions on ASTER Dex</CardDescription>
          </CardHeader>
          <CardContent>
            {posLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 w-full bg-white/[0.04]" />
                ))}
              </div>
            ) : openPositions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-zinc-600">
                <TrendingUp className="mb-2 h-8 w-8" />
                <p className="text-sm">No open positions</p>
              </div>
            ) : (
              <div className="space-y-2">
                {openPositions.map((pos) => {
                  const pnl = parseFloat(pos.unRealizedProfit);
                  const amt = parseFloat(pos.positionAmt);
                  return (
                    <div
                      key={pos.symbol}
                      className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors hover:bg-white/[0.04]"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{pos.symbol}</p>
                        <p className="text-xs text-zinc-500">
                          <span className={amt > 0 ? "text-emerald-400" : "text-red-400"}>
                            {amt > 0 ? "LONG" : "SHORT"}
                          </span>
                          {" "}&middot; {pos.leverage}x &middot; Entry {parseFloat(pos.entryPrice).toFixed(2)}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-bold tabular-nums ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const ACCENT_COLORS = {
  cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20" },
  green: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  red: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/20" },
  amber: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
} as const;

function StatCard({
  title,
  value,
  description,
  icon,
  accent = "cyan",
  valueClassName,
}: {
  title: string;
  value: string | null;
  description: string;
  icon: React.ReactNode;
  accent?: keyof typeof ACCENT_COLORS;
  valueClassName?: string;
}) {
  const c = ACCENT_COLORS[accent];
  return (
    <Card className="border-white/[0.06] bg-[#111113] transition-all duration-300 hover:border-white/[0.1] hover:bg-[#141416] animate-scale-in">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-zinc-500">{title}</CardTitle>
        <div className={`flex h-7 w-7 items-center justify-center rounded-md ${c.bg}`}>
          <span className={c.text}>{icon}</span>
        </div>
      </CardHeader>
      <CardContent>
        {value === null ? (
          <Skeleton className="h-8 w-28 bg-white/[0.04]" />
        ) : (
          <div className={`text-2xl font-bold tracking-tight ${valueClassName ?? "text-white"}`}>
            {value}
          </div>
        )}
        <p className="mt-1 text-xs text-zinc-600">{description}</p>
      </CardContent>
    </Card>
  );
}
