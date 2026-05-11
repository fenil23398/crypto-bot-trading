"use client";

import { useEffect, useState } from "react";
import { Activity, Wifi } from "lucide-react";
import { ASTER_DEX_SITE_URL } from "@/lib/aster-dex";

export function Header() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="relative z-[2] flex h-14 items-center justify-between border-b border-white/[0.07] bg-zinc-950/75 px-4 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl md:px-6">
      <div className="flex items-center gap-3 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
          <Activity className="h-4 w-4 text-cyan-400" />
        </div>
        <span className="text-sm font-bold text-white">TradeBot</span>
      </div>

      <p className="hidden min-w-0 max-w-lg flex-1 px-4 text-center text-[11px] leading-snug text-zinc-500 md:block">
        Live bot orders execute on{" "}
        <a
          href={ASTER_DEX_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-cyan-500/90 underline-offset-2 hover:text-cyan-400 hover:underline"
        >
          Aster DEX
        </a>{" "}
        (on-chain perpetual futures).
      </p>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-1.5 shadow-[0_0_20px_-4px_rgba(16,185,129,0.25)]">
          <Wifi className="h-3 w-3 text-emerald-400" />
          <span className="text-[11px] font-medium text-emerald-300">Connected</span>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 font-mono text-xs tabular-nums text-zinc-400">
          {time}
        </div>
      </div>
    </header>
  );
}
