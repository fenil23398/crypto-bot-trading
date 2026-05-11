"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  TrendingUp,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ASTER_DEX_SITE_URL } from "@/lib/aster-dex";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bots", label: "Bots", icon: Bot },
  { href: "/backtest", label: "Backtest", icon: FlaskConical },
  { href: "/positions", label: "Positions", icon: TrendingUp },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-white/10 bg-zinc-950/95 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.45)] backdrop-blur-xl md:hidden">
      <p className="border-b border-white/[0.06] px-2 py-1 text-center text-[10px] leading-tight text-zinc-500">
        Live execution on{" "}
        <a
          href={ASTER_DEX_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-cyan-500/90 underline-offset-2 hover:text-cyan-400 hover:underline"
        >
          Aster DEX
        </a>
      </p>
      <nav className="flex pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex min-h-[3rem] flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] font-medium transition-colors duration-150",
                active ? "text-cyan-400" : "text-zinc-500 hover:text-zinc-400",
              )}
            >
              {active && (
                <div className="absolute top-0 left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-cyan-400" />
              )}
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150",
                  active ? "bg-cyan-500/12 text-cyan-400" : "text-zinc-500",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
