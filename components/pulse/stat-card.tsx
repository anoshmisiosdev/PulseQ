"use client"

import { useEffect, useState, useRef } from "react"
import { cn } from "@/lib/utils"
import { DollarSign, AlertTriangle, Clock, TrendingUp } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  type: "revenue" | "critical" | "days" | "recovered"
  animate?: boolean
}

const config = {
  revenue: {
    icon: DollarSign,
    accentColor: "#ef4444",
    iconBg: "rgba(239,68,68,0.1)",
  },
  critical: {
    icon: AlertTriangle,
    accentColor: "#f59e0b",
    iconBg: "rgba(245,158,11,0.1)",
  },
  days: {
    icon: Clock,
    accentColor: "#0891b2",
    iconBg: "rgba(8,145,178,0.1)",
  },
  recovered: {
    icon: TrendingUp,
    accentColor: "#6366f1",
    iconBg: "rgba(99,102,241,0.1)",
  },
}

function useCountUp(target: number, duration = 1200) {
  const [current, setCurrent] = useState(0)
  const frameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (target === 0) { setCurrent(0); return }
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setCurrent(Math.round(eased * target))
      if (progress < 1) frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [target, duration])

  return current
}

export function StatCard({ title, value, subtitle, type, animate }: StatCardProps) {
  const { icon: Icon, accentColor, iconBg } = config[type]
  const isRecovered = type === "recovered"

  // Parse numeric value for count-up
  const numericValue = typeof value === "number" ? value : parseInt(String(value).replace(/[$,]/g, ""), 10)
  const isNumeric = !isNaN(numericValue)
  const prefix = typeof value === "string" && value.startsWith("$") ? "$" : ""
  const counted = useCountUp(isNumeric ? numericValue : 0)

  // Bounce on change for recovered stat
  const [bouncing, setBouncing] = useState(false)
  const prevValue = useRef(value)
  useEffect(() => {
    if (animate && value !== prevValue.current && value !== "$0") {
      setBouncing(true)
      const t = setTimeout(() => setBouncing(false), 600)
      prevValue.current = value
      return () => clearTimeout(t)
    }
  }, [value, animate])

  // Accent bar gradient for Revenue Recovered
  const accentStyle = isRecovered
    ? { background: `linear-gradient(90deg, #6366f1, #10b981)` }
    : { background: accentColor }

  return (
    <div
      className={cn("glass-card relative overflow-hidden", bouncing && "won-back-glow")}
      style={{ padding: 20 }}
    >
      {/* 3px colored top accent line (§7.2) */}
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[16px]" style={accentStyle} />

      <div className="flex items-start gap-3">
        {/* Icon in glass circle */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg }}
        >
          <Icon className="w-5 h-5" style={{ color: accentColor }} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Label (§4 — DM Sans 500, 13px) */}
          <p style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 13, lineHeight: 1.4, letterSpacing: "0.02em", color: "#475569" }}>
            {title}
          </p>

          {/* Number (§4 — stat-number class) */}
          <p className={cn("stat-number mt-1", bouncing && "counter-bounce")}>
            {isNumeric ? `${prefix}${counted.toLocaleString()}` : value}
          </p>

          {/* Subtitle */}
          {subtitle && (
            <p style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 12, lineHeight: 1.4, color: "#94a3b8", marginTop: 4, letterSpacing: "0.01em" }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
