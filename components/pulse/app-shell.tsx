"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, Target, Activity, Volume2, Store, BarChart2 } from "lucide-react"
import businessData from "@/lib/data/business.json"
import { usePulse } from "./client-layout"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/retention", label: "Retention", icon: Target },
  { href: "/prices", label: "Prices", icon: BarChart2 },
  { href: "/business", label: "Business", icon: Store },
]

interface AppShellProps {
  children: React.ReactNode
  businessType: "coffee_shop" | "gym" | "boutique"
}

export function AppShell({ children, businessType }: AppShellProps) {
  const pathname = usePathname()
  const { customers, businessData, revenueRecovered, wonBackCount } = usePulse()
  const biz = businessData[businessType]
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleAudioSummary = async () => {
    if (isPlaying) {
      audioRef.current?.pause()
      audioRef.current = null
      setIsPlaying(false)
      return
    }

    setIsPlaying(true)
    try {
      const response = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customers,
          business: biz,
          revenueRecovered,
          wonBackCount,
        }),
      })

      const contentType = response.headers.get('content-type')
      if (contentType?.includes('audio')) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => {
          setIsPlaying(false)
          audioRef.current = null
          URL.revokeObjectURL(url)
        }
        audio.play()
      } else {
        const data = await response.json()
        console.log('Briefing script (no audio):', data.script)
        setIsPlaying(false)
      }
    } catch (e) {
      console.error('Audio summary failed:', e)
      setIsPlaying(false)
    }
  }

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
          <Activity className="w-4 h-4 text-[#475569]" />
          <span style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 14, color: "#475569" }}>
            {biz.name}
          </span>
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
        </div>

        {/* Right — Audio Summary */}
        <button
          onClick={handleAudioSummary}
          className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-white shadow-sm transition-all hover:opacity-90 cursor-pointer"
          style={{ background: isPlaying ? "#0e7490" : "#0891b2", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14 }}
        >
          {isPlaying ? (
            <Volume2 className="w-3.5 h-3.5 animate-pulse" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{isPlaying ? "Stop" : "Daily Briefing"}</span>
        </button>
      </header>

      {/* ---- Sidebar — auto-hide, slides in on hover ---- */}
      <div className="hidden md:block fixed top-16 left-0 bottom-0 z-40 group/sidebar">
        {/* Hover trigger zone — always visible, thin strip */}
        <div className="absolute top-0 left-0 bottom-0 w-3" />
        <aside
          className="h-full w-[280px] flex flex-col py-6 px-4 -translate-x-[264px] group-hover/sidebar:translate-x-0 transition-transform duration-300 ease-in-out"
          style={{
            background: "rgba(255,255,255,0.92)",
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
      </div>

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
      <main className="pt-16 pb-16 md:pb-0 min-h-screen">
        <div className="max-w-[1440px] mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
