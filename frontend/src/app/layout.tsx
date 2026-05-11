import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { MobileNav } from "@/components/mobile-nav";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-ui-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TradeBot Terminal",
  description:
    "Trading bot dashboard — live execution on Aster DEX perpetual futures.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="relative flex min-h-full bg-[#060607]">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
          <div className="absolute -top-40 left-[10%] h-[28rem] w-[28rem] rounded-full bg-cyan-500/[0.09] blur-[100px] animate-orb-slow" />
          <div className="absolute bottom-[-6rem] right-[-4rem] h-[26rem] w-[26rem] rounded-full bg-violet-600/[0.07] blur-[110px] animate-orb-slow-reverse" />
          <div className="absolute top-1/2 left-[-5rem] h-56 w-56 -translate-y-1/2 rounded-full bg-emerald-500/[0.05] blur-[90px]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        </div>

        <Sidebar />
        <div className="relative z-[1] flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="relative flex-1 overflow-auto px-3 py-4 pb-[5.5rem] md:px-6 md:py-5 md:pb-5">
            <div className="mx-auto w-full max-w-[1600px]">{children}</div>
          </main>
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
