"use client";

import { usePositions } from "@/lib/hooks";
import {
  Card,
  CardAction,
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ASTER_DEX_SITE_URL } from "@/lib/aster-dex";

export default function PositionsPage() {
  const { data: positions, isLoading } = usePositions();

  const open =
    positions?.filter((p) => parseFloat(p.positionAmt) !== 0) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="app-heading">Positions</h1>
        <p className="app-subheading mt-0.5">
          Open positions synced from{" "}
          <a
            href={ASTER_DEX_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-cyan-500/90 underline-offset-2 hover:text-cyan-400 hover:underline"
          >
            Aster DEX
          </a>
          ; refreshes every 5s.
        </p>
      </div>

      <Card className="app-card ring-0">
        <CardHeader className="border-b border-white/[0.06] pb-3">
          <CardAction>
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live
            </div>
          </CardAction>
          <CardTitle className="flex items-center gap-3 text-base font-medium text-white">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
            Open Positions
          </CardTitle>
          <CardDescription className="text-zinc-500">
            {open.length} position{open.length !== 1 ? "s" : ""} open
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full bg-white/[0.04]" />
              ))}
            </div>
          ) : !open.length ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-600">
              <Inbox className="h-12 w-12 stroke-[1]" aria-hidden />
              <p className="text-sm">No open positions</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-zinc-500">Symbol</TableHead>
                    <TableHead className="text-zinc-500">Side</TableHead>
                    <TableHead className="text-zinc-500">Size</TableHead>
                    <TableHead className="text-zinc-500">Entry Price</TableHead>
                    <TableHead className="text-zinc-500">Mark Price</TableHead>
                    <TableHead className="text-zinc-500">Liq. Price</TableHead>
                    <TableHead className="text-zinc-500">Leverage</TableHead>
                    <TableHead className="text-zinc-500">Margin</TableHead>
                    <TableHead className="text-zinc-500">
                      Unrealized PnL
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {open.map((pos) => {
                    const amt = parseFloat(pos.positionAmt);
                    const pnl = parseFloat(pos.unRealizedProfit);
                    const entry = parseFloat(pos.entryPrice);
                    const mark = parseFloat(pos.markPrice);
                    const liq = parseFloat(pos.liquidationPrice);
                    const margin = parseFloat(pos.isolatedMargin);

                    return (
                      <TableRow
                        key={`${pos.symbol}-${pos.positionSide}`}
                        className="border-white/[0.06] transition-colors duration-200 hover:bg-white/[0.04]"
                      >
                        <TableCell className="font-medium text-white">
                          {pos.symbol}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "border font-medium",
                              amt > 0
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                : "border-red-500/20 bg-red-500/10 text-red-400"
                            )}
                          >
                            {amt > 0 ? "LONG" : "SHORT"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-zinc-300 tabular-nums">
                          {Math.abs(amt).toFixed(4)}
                        </TableCell>
                        <TableCell className="tabular-nums text-zinc-300">
                          {entry.toFixed(2)}
                        </TableCell>
                        <TableCell className="tabular-nums text-zinc-300">
                          {mark.toFixed(2)}
                        </TableCell>
                        <TableCell className="tabular-nums text-zinc-300">
                          {liq > 0 ? liq.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-zinc-300">
                          {pos.leverage}x
                        </TableCell>
                        <TableCell className="tabular-nums text-zinc-300">
                          {margin > 0 ? `${margin.toFixed(2)} USDT` : "-"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "font-bold tabular-nums",
                              pnl >= 0 ? "text-emerald-400" : "text-red-400"
                            )}
                          >
                            {pnl >= 0 ? "+" : ""}
                            {pnl.toFixed(4)} USDT
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
