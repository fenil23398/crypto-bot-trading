"use client";

import { useEffect, useState } from "react";
import { Activity, Wifi } from "lucide-react";

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
    <header className="flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#0c0c0e]/80 px-4 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-3 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
          <Activity className="h-4 w-4 text-cyan-400" />
        </div>
        <span className="text-sm font-bold text-white">TradeBot</span>
      </div>

      <div className="hidden md:block" />

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5">
          <Wifi className="h-3 w-3 text-emerald-400" />
          <span className="text-[11px] font-medium text-emerald-400">Connected</span>
        </div>
        <div className="font-mono text-xs tabular-nums text-zinc-400">{time}</div>
      </div>
    </header>
  );
}
