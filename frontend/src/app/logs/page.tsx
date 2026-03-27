"use client";

import { useState } from "react";
import { useBotLogs, useBotSignals } from "@/lib/hooks";
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
import { cn } from "@/lib/utils";
import { Inbox, ScrollText, Signal } from "lucide-react";
import type { Strategy } from "@/lib/types";

const STRATEGIES: { value: Strategy; label: string }[] = [
  { value: "supertrend", label: "SuperTrend" },
  { value: "macd", label: "MACD" },
  { value: "rsi_ema", label: "RSI + EMA" },
  { value: "ma9", label: "MA9" },
  { value: "rsi_levels", label: "RSI 60/40" },
];

export default function LogsPage() {
  const [strategy, setStrategy] = useState<Strategy>("supertrend");

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Logs</h1>
        <p className="text-sm text-zinc-500">
          Transaction logs and signals for each strategy
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg border border-white/[0.06] bg-[#111113] p-1">
        {STRATEGIES.map((s) => {
          const active = strategy === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => setStrategy(s.value)}
              className={cn(
                "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-cyan-500/10 text-cyan-400 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]"
                  : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        <LogsTable strategy={strategy} />
        <SignalsTable strategy={strategy} />
      </div>
    </div>
  );
}

function LogsTable({ strategy }: { strategy: Strategy }) {
  const { data: logs, isLoading } = useBotLogs(strategy);

  return (
    <Card
      className={cn(
        "border border-white/[0.06] bg-[#111113] shadow-none ring-0 transition-colors",
        "hover:border-white/[0.1]"
      )}
    >
      <CardHeader className="border-b border-white/[0.06] pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
            <ScrollText className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-white">Bot Logs</CardTitle>
            <CardDescription className="text-zinc-500">
              Recent activity from the {strategy} bot
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full bg-white/[0.04]" />
            ))}
          </div>
        ) : !logs?.length ? (
          <EmptyState message="No logs yet" />
        ) : (
          <div className="overflow-auto rounded-lg border border-white/[0.06]">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-zinc-500">Time</TableHead>
                  <TableHead className="text-zinc-500">Symbol</TableHead>
                  <TableHead className="text-zinc-500">Action</TableHead>
                  <TableHead className="text-zinc-500">Price</TableHead>
                  <TableHead className="text-zinc-500">Status</TableHead>
                  <TableHead className="text-zinc-500">Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow
                    key={log._id}
                    className="border-white/[0.06] hover:bg-white/[0.02]"
                  >
                    <TableCell className="whitespace-nowrap text-xs text-zinc-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      {log.symbol}
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={log.action} />
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      {log.price?.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.status} />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-zinc-400">
                      {log.message}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SignalsTable({ strategy }: { strategy: Strategy }) {
  const { data: signals, isLoading } = useBotSignals(strategy);

  return (
    <Card
      className={cn(
        "border border-white/[0.06] bg-[#111113] shadow-none ring-0 transition-colors",
        "hover:border-white/[0.1]"
      )}
    >
      <CardHeader className="border-b border-white/[0.06] pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
            <Signal className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-white">Signals</CardTitle>
            <CardDescription className="text-zinc-500">
              Generated signals from the {strategy} strategy
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full bg-white/[0.04]" />
            ))}
          </div>
        ) : !signals?.length ? (
          <EmptyState message="No signals yet" />
        ) : (
          <div className="overflow-auto rounded-lg border border-white/[0.06]">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-zinc-500">Time</TableHead>
                  <TableHead className="text-zinc-500">Symbol</TableHead>
                  <TableHead className="text-zinc-500">Action</TableHead>
                  <TableHead className="text-zinc-500">Price</TableHead>
                  <TableHead className="text-zinc-500">Executed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.map((sig) => (
                  <TableRow
                    key={sig._id}
                    className="border-white/[0.06] hover:bg-white/[0.02]"
                  >
                    <TableCell className="whitespace-nowrap text-xs text-zinc-400">
                      {new Date(sig.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      {sig.symbol}
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={sig.action} />
                    </TableCell>
                    <TableCell className="text-zinc-300">
                      {sig.price?.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <ExecutedBadge executed={sig.executed} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 text-zinc-600">
      <Inbox className="h-10 w-10 stroke-[1.25]" aria-hidden />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const isBuy = action === "BUY";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        isBuy
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/20 bg-red-500/10 text-red-400"
      )}
    >
      {action}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  const styles =
    status === "order_placed"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
      : status === "order_failed"
        ? "border-red-500/20 bg-red-500/10 text-red-400"
        : status === "signal_generated"
          ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-400"
          : "border-white/[0.08] bg-white/[0.04] text-zinc-400";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
        styles
      )}
    >
      {label}
    </span>
  );
}

function ExecutedBadge({ executed }: { executed: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        executed
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border-zinc-700/50 bg-zinc-800/40 text-zinc-500"
      )}
    >
      {executed ? "Yes" : "No"}
    </span>
  );
}
