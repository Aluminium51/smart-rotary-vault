"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, FileClock, LockKeyhole, Settings2 } from "lucide-react";
import { MockSessionProvider } from "@/hooks/mock-session";

const links = [
  { href: "/dashboard", label: "Control center", shortLabel: "Control", icon: Activity },
  { href: "/logs", label: "Event history", shortLabel: "Events", icon: FileClock },
  { href: "/settings", label: "Device info", shortLabel: "Device", icon: Settings2 },
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  return (
    <MockSessionProvider><div className="min-h-dvh">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-foreground focus:p-3 focus:text-background">Skip to content</a>
      <header className="border-b hairline">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link href="/dashboard" className="flex items-center gap-3 text-sm font-medium tracking-[.1em] uppercase">
            <span className="flex size-9 items-center justify-center border border-white/40"><LockKeyhole size={18} aria-hidden="true" /></span>
            <span>SRV<span className="text-muted"> / </span>CONTROL</span>
          </Link>
          <div className="flex items-center gap-3 text-[.68rem] tracking-[.12em] uppercase text-muted">
            <span className="size-1.5 bg-warning" aria-hidden="true" />Simulation mode <span className="hidden sm:inline">/ No hardware connection</span>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] md:grid-cols-[216px_minmax(0,1fr)]">
        <nav aria-label="Primary navigation" className="border-b hairline md:min-h-[calc(100dvh-73px)] md:border-r md:border-b-0">
          <div className="grid grid-cols-3 md:flex md:flex-col md:py-7">
            {links.map(({ href, label, shortLabel, icon: Icon }, index) => (
              <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
                aria-label={label}
                className={`flex min-w-0 items-center justify-center gap-2 border-b-2 px-2 py-4 text-[.65rem] uppercase tracking-[.08em] transition-colors hover:bg-elevated md:justify-start md:gap-3 md:border-b-0 md:border-l-2 md:px-5 md:text-xs ${pathname === href ? "border-white bg-surface text-white" : "border-transparent text-muted"}`}>
                <span className="hidden text-[.65rem] text-muted md:inline">0{index + 1}</span><Icon size={16} aria-hidden="true" /><span className="md:hidden">{shortLabel}</span><span className="hidden md:inline">{label}</span>
              </Link>
            ))}
          </div>
          <div className="hidden border-t hairline px-6 py-5 text-[.68rem] leading-5 text-muted md:block">VAULT / 01<br />LOCAL DEMONSTRATION<br />NO LIVE COMMANDS</div>
        </nav>
        <main id="main-content" className="min-w-0 px-4 py-7 md:px-8 md:py-9 lg:px-10">{children}</main>
      </div>
    </div></MockSessionProvider>
  );
}
