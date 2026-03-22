"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, Target, Coffee, Activity } from "lucide-react"
import businessData from "@/lib/data/business.json"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/retention", label: "Retention", icon: Target },
]

interface AppShellProps {
  children: React.ReactNode
  businessType: "coffee_shop" | "gym" | "boutique"
}

export function AppShell({ children, businessType }: AppShellProps) {
  const pathname = usePathname()
  const biz = businessData[businessType as keyof typeof businessData]

  return (
    <div className="min-h-screen">
      {/* ---- Top Bar (§7.5) — glass-strong, 64px, fixed ---- */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-5"
        style={{
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.4)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        }}
      >
        {/* Logo — Outfit 700, cyan icon */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(8,145,178,0.12)" }}>
            <Activity className="w-4 h-4 text-[#0891b2]" />
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "#0f172a", letterSpacing: "-0.01em" }}>
            Pulse
          </span>
        </Link>

        {/* Center — business name + green status dot */}
        <div className="hidden md:flex items-center gap-2.5">
          <Coffee className="w-4 h-4 text-[#475569]" />
          <span style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 14, color: "#475569" }}>
            {biz.name}
          </span>
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
        </div>

        {/* Right — Business badge */}
        <div className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-white shadow-sm" style={{ background: "#0891b2", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14 }}>
          <Coffee className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Coffee</span>
        </div>
      </header>

      {/* ---- Sidebar (§7.4) — 280px, glass-strong ---- */}
      <aside
        className="hidden md:flex fixed top-16 left-0 bottom-0 w-[280px] flex-col py-6 px-4 z-40"
        style={{
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRight: "1px solid rgba(255,255,255,0.4)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        }}
      >
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all",
                  isActive
                    ? "bg-[rgba(8,145,178,0.1)]"
                    : "text-[#475569] hover:text-[#0f172a] hover:bg-white/40"
                )}
                style={{
                  fontFamily: "var(--font-body)",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "#0891b2" : undefined,
                  borderLeft: isActive ? "3px solid #0891b2" : "3px solid transparent",
                }}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* ---- Mobile Bottom Nav ---- */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-14 flex items-center justify-around"
        style={{
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(255,255,255,0.4)",
          boxShadow: "0 -4px 16px rgba(0,0,0,0.04)",
        }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 py-1 px-3"
              style={{
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: 11,
                color: isActive ? "#0891b2" : "#94a3b8",
              }}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* ---- Main Content ---- */}
      <main className="pt-16 md:pl-[280px] pb-16 md:pb-0 min-h-screen">
        <div className="max-w-[1440px] mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
