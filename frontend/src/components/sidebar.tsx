"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  TrendingUp,
  FlaskConical,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ASTER_DEX_API_MANAGEMENT_URL, ASTER_DEX_SITE_URL } from "@/lib/aster-dex";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bots", label: "Bots", icon: Bot },
  { href: "/backtest", label: "Backtest", icon: FlaskConical },
  { href: "/positions", label: "Positions", icon: TrendingUp },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative z-[2] hidden w-60 flex-col border-r border-white/[0.06] bg-gradient-to-b from-[#0e0e12] via-[#0a0a0d] to-[#060607] shadow-[8px_0_40px_-16px_rgba(0,0,0,0.65)] backdrop-blur-xl md:flex">
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/5 ring-1 ring-cyan-500/20">
          <Activity className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <span className="text-sm font-bold tracking-tight text-white">TradeBot</span>
          <p className="text-[10px] font-medium uppercase tracking-widest text-cyan-400/70">Terminal</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2.5 py-3">
        <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Navigation
        </p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150",
                active
                  ? "bg-cyan-500/[0.12] text-cyan-300 shadow-[inset_0_0_0_1px_rgba(6,182,212,0.12)]"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-cyan-400" />
              )}
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-cyan-400" : "text-zinc-500 group-hover:text-zinc-400",
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <p className="mb-2 px-0.5 text-[10px] leading-relaxed text-zinc-500">
          Live bots send orders to{" "}
          <a
            href={ASTER_DEX_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-cyan-500/90 underline-offset-2 hover:text-cyan-400 hover:underline"
          >
            Aster DEX
          </a>{" "}
          (on-chain perpetuals). API keys:{" "}
          <a
            href={ASTER_DEX_API_MANAGEMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 underline-offset-2 hover:text-zinc-300 hover:underline"
          >
            asterdex.com/api
          </a>
          .
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-2.5 py-1.5">
          <div className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <span className="text-xs font-medium text-emerald-400">System Online</span>
        </div>
      </div>
    </aside>
  );
}
