"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  ScrollText,
  ArrowLeftRight,
  TrendingUp,
  FlaskConical,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bots", label: "Bots", icon: Bot },
  { href: "/backtest", label: "Backtest", icon: FlaskConical },
  { href: "/logs", label: "Logs", icon: ScrollText },
  { href: "/orders", label: "Orders", icon: ArrowLeftRight },
  { href: "/positions", label: "Positions", icon: TrendingUp },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-60 flex-col border-r border-white/[0.06] bg-[#0c0c0e]">
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
          <Activity className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <span className="text-sm font-bold tracking-tight text-white">TradeBot</span>
          <p className="text-[10px] font-medium uppercase tracking-widest text-cyan-400/70">Terminal</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Navigation
        </p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                active
                  ? "bg-cyan-500/10 text-cyan-400"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
              )}
            >
              {active && (
                <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-cyan-400" />
              )}
              <Icon className={cn("h-4 w-4 transition-colors", active ? "text-cyan-400" : "text-zinc-500 group-hover:text-zinc-400")} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-4">
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/[0.08] px-3 py-2">
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
