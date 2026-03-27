"use client";

import { useState } from "react";
import { ArrowLeftRight, Inbox } from "lucide-react";
import { useOrders } from "@/lib/hooks";
import { cn } from "@/lib/utils";
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
import { Skeleton } from "@/components/ui/skeleton";

const STRATEGY_OPTIONS = [
  { value: "", label: "All Strategies" },
  { value: "supertrend", label: "SuperTrend" },
  { value: "macd", label: "MACD" },
  { value: "rsi_ema", label: "RSI + EMA" },
  { value: "ma9", label: "MA9" },
  { value: "rsi_levels", label: "RSI 60/40" },
  { value: "system", label: "System" },
];

const SYMBOL_OPTIONS = [
  { value: "", label: "All Symbols" },
  { value: "BTCUSDT", label: "BTCUSDT" },
  { value: "ETHUSDT", label: "ETHUSDT" },
];

export default function OrdersPage() {
  const [strategy, setStrategy] = useState("");
  const [symbol, setSymbol] = useState("");
  const params = {
    ...(strategy && { strategy }),
    ...(symbol && { symbol }),
    limit: 100,
  };
  const { data: orders, isLoading } = useOrders(params);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Orders
        </h1>
        <p className="text-zinc-500">
          All orders placed through the trading bot
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STRATEGY_OPTIONS.map((opt) => (
          <FilterPill
            key={`s-${opt.value}`}
            label={opt.label}
            active={strategy === opt.value}
            onClick={() => setStrategy(opt.value)}
          />
        ))}
        <div className="mx-1 hidden h-5 w-px bg-white/[0.06] sm:block" aria-hidden />
        {SYMBOL_OPTIONS.map((opt) => (
          <FilterPill
            key={`y-${opt.value}`}
            label={opt.label}
            active={symbol === opt.value}
            onClick={() => setSymbol(opt.value)}
          />
        ))}
      </div>

      <Card className="border border-white/[0.06] bg-[#111113] text-zinc-300 ring-0 transition-colors hover:border-white/[0.1]">
        <CardHeader className="border-b border-white/[0.06] pb-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-cyan-400">
              <ArrowLeftRight className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-white">Order History</CardTitle>
              <CardDescription className="text-zinc-500">
                Showing {orders?.length ?? 0} orders
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton
                  key={i}
                  className="h-8 w-full bg-white/[0.04]"
                />
              ))}
            </div>
          ) : !orders?.length ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03] text-zinc-500">
                <Inbox className="h-7 w-7" aria-hidden />
              </div>
              <p className="text-sm text-zinc-500">No orders found</p>
            </div>
          ) : (
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.06] hover:bg-transparent">
                    <TableHead className="text-zinc-500">Time</TableHead>
                    <TableHead className="text-zinc-500">Strategy</TableHead>
                    <TableHead className="text-zinc-500">Symbol</TableHead>
                    <TableHead className="text-zinc-500">Side</TableHead>
                    <TableHead className="text-zinc-500">Type</TableHead>
                    <TableHead className="text-zinc-500">Qty</TableHead>
                    <TableHead className="text-zinc-500">Price</TableHead>
                    <TableHead className="text-zinc-500">Leverage</TableHead>
                    <TableHead className="text-zinc-500">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow
                      key={order._id}
                      className="border-white/[0.06] hover:bg-white/[0.02] data-[state=selected]:bg-white/[0.02]"
                    >
                      <TableCell className="whitespace-nowrap text-xs text-zinc-400">
                        {new Date(order.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="capitalize text-zinc-300">
                        {order.strategy}
                      </TableCell>
                      <TableCell className="font-medium text-white">
                        {order.symbol}
                      </TableCell>
                      <TableCell>
                        <SideBadge side={order.side} />
                      </TableCell>
                      <TableCell className="text-xs text-zinc-400">
                        {order.type}
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {order.quantity}
                      </TableCell>
                      <TableCell className="text-zinc-300">
                        {order.stopPrice
                          ? order.stopPrice.toFixed(2)
                          : order.price
                            ? order.price.toFixed(2)
                            : "Market"}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {order.leverage}x
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-400"
          : "border-white/[0.06] bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]"
      )}
    >
      {label}
    </button>
  );
}

function SideBadge({ side }: { side: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tracking-wide",
        side === "BUY" &&
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
        side === "SELL" && "border-red-500/20 bg-red-500/10 text-red-400",
        side !== "BUY" &&
          side !== "SELL" &&
          "border-white/[0.06] bg-white/[0.03] text-zinc-400"
      )}
    >
      {side}
    </span>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
        key === "filled" &&
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
        key === "failed" && "border-red-500/20 bg-red-500/10 text-red-400",
        key === "placed" && "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
        key !== "filled" &&
          key !== "failed" &&
          key !== "placed" &&
          "border-white/[0.06] bg-white/[0.03] text-zinc-400"
      )}
    >
      {status}
    </span>
  );
}
