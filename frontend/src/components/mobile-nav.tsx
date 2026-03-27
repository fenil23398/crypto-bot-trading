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
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bots", label: "Bots", icon: Bot },
  { href: "/backtest", label: "Backtest", icon: FlaskConical },
  { href: "/orders", label: "Orders", icon: ArrowLeftRight },
  { href: "/positions", label: "Positions", icon: TrendingUp },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-white/[0.06] bg-[#0c0c0e]/95 backdrop-blur-lg">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-all duration-200",
              active ? "text-cyan-400" : "text-zinc-500"
            )}
          >
            {active && (
              <div className="absolute top-0 left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-cyan-400" />
            )}
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
