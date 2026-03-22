"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { CustomerCard } from "./customer-card"
import { StatCard } from "./stat-card"
import { DetailPanel } from "./detail-panel"
import { cn } from "@/lib/utils"
import type { Customer } from "@/lib/rfm"
import { calculateAtRiskRevenue, getCriticalCount, getAverageDaysSince } from "@/lib/rfm"
import { Play, Square, Coffee, Dumbbell, Store, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import businessData from "@/lib/data/business.json"
import catalogData from "@/lib/data/catalog.json"

interface DashboardProps {
  customers: Customer[]
  businessType: "coffee_shop" | "gym" | "boutique"
  onBusinessTypeChange: (type: "coffee_shop" | "gym" | "boutique") => void
}

type FilterType = "all" | "critical" | "at-risk" | "watch" | "loyal"

const filterLabels: Record<FilterType, { label: string; description: string }> = {
  all: { label: "Everyone", description: "All your customers" },
  critical: { label: "Needs Attention", description: "May not come back without action" },
  "at-risk": { label: "Slipping Away", description: "Visit frequency is dropping" },
  watch: { label: "Keep an Eye On", description: "Slight dip in visits" },
  loyal: { label: "Regulars", description: "Your happy, loyal customers" },
}

const businessLabels = {
  coffee_shop: { label: "Coffee Shop", icon: Coffee },
  gym: { label: "Gym", icon: Dumbbell },
  boutique: { label: "Boutique", icon: Store },
} as const

export function Dashboard({ customers, businessType, onBusinessTypeChange }: DashboardProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [filter, setFilter] = useState<FilterType>("all")
  const [revenueRecovered, setRevenueRecovered] = useState(0)
  const [wonBackCount, setWonBackCount] = useState(0)
  const [isPlayingBriefing, setIsPlayingBriefing] = useState(false)
  const briefingAudioRef = useRef<HTMLAudioElement | null>(null)

  const filteredCustomers = useMemo(() => {
    if (filter === "all") return customers
    return customers.filter((c) => {
      if (c.confidenceLevel === "low") return false
      if (filter === "critical") return c.churnScore >= 80
      if (filter === "at-risk") return c.churnScore >= 50 && c.churnScore < 80
      if (filter === "watch") return c.churnScore >= 30 && c.churnScore < 50
      if (filter === "loyal") return c.churnScore < 30
      return true
    })
  }, [customers, filter])

  const stats = useMemo(
    () => ({
      atRiskRevenue: calculateAtRiskRevenue(customers),
      criticalCount: getCriticalCount(customers),
      avgDaysSince: getAverageDaysSince(customers),
    }),
    [customers]
  )

  // Find the #1 customer to reach out to today
  const topPriority = useMemo(() => {
    const sorted = [...customers]
      .filter((c) => c.confidenceLevel !== "low" && c.churnScore >= 50)
      .sort((a, b) => b.churnScore - a.churnScore)
    return sorted[0] || null
  }, [customers])

  const handleWonBack = useCallback((customer: Customer) => {
    const recovery = customer.avgTransactionValue * 12
    setRevenueRecovered((prev) => prev + recovery)
    setWonBackCount((prev) => prev + 1)
  }, [])

  const handleCustomerClick = useCallback((customer: Customer) => {
    setSelectedCustomer(customer)
  }, [])

  const handlePlayBriefing = async () => {
    if (isPlayingBriefing) {
      briefingAudioRef.current?.pause()
      briefingAudioRef.current = null
      setIsPlayingBriefing(false)
      return
    }

    setIsPlayingBriefing(true)
    try {
      const response = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customers,
          business: businessData[businessType as keyof typeof businessData],
          revenueRecovered,
          wonBackCount
        })
      })

      const contentType = response.headers.get('content-type')

      if (contentType?.includes('audio')) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        briefingAudioRef.current = audio
        audio.onended = () => {
          setIsPlayingBriefing(false)
          briefingAudioRef.current = null
        }
        audio.play()
      } else {
        const data = await response.json()
        console.log('Briefing script (no audio):', data.script)
        setIsPlayingBriefing(false)
      }
    } catch (e) {
      console.error('Briefing failed:', e)
      setIsPlayingBriefing(false)
    }
  }

  const filterCounts = useMemo(
    () => ({
      all: customers.length,
      critical: customers.filter((c) => c.churnScore >= 80 && c.confidenceLevel !== "low").length,
      "at-risk": customers.filter((c) => c.churnScore >= 50 && c.churnScore < 80 && c.confidenceLevel !== "low").length,
      watch: customers.filter((c) => c.churnScore >= 30 && c.churnScore < 50 && c.confidenceLevel !== "low").length,
      loyal: customers.filter((c) => c.churnScore < 30 && c.confidenceLevel !== "low").length,
    }),
    [customers]
  )

  const BusinessIcon = businessLabels[businessType].icon

  return (
    <div className="min-h-screen bg-background">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header — friendly, warm */}
        <header className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BusinessIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Pulse</h1>
                <p className="text-sm text-muted-foreground">Your customer dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Persona Switcher — bigger, clearer */}
              <div className="glass-subtle rounded-xl p-1 flex">
                {(["coffee_shop", "gym", "boutique"] as const).map((type) => {
                  const Icon = businessLabels[type].icon
                  return (
                    <button
                      key={type}
                      onClick={() => onBusinessTypeChange(type)}
                      className={cn(
                        "px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2",
                        businessType === type
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{businessLabels[type].label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Daily Briefing */}
              <Button onClick={handlePlayBriefing} className="gap-2 rounded-xl" size="lg">
                {isPlayingBriefing ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isPlayingBriefing ? "Stop" : "Today's Briefing"}
              </Button>
            </div>
          </div>

          {/* Welcome Banner — the #1 thing to do today */}
          {topPriority && (
            <button
              onClick={() => handleCustomerClick(topPriority)}
              className="w-full glass rounded-xl p-4 sm:p-5 text-left hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[oklch(0.60_0.20_25)]/15 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-[oklch(0.55_0.18_25)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Your #1 action today</p>
                  <p className="text-base sm:text-lg font-semibold text-foreground">
                    Reach out to {topPriority.name}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {topPriority.name.split(" ")[0]} hasn&apos;t visited in {topPriority.daysSinceVisit} days and used to
                    love {topPriority.topItems[0] || "coming in"}.{" "}
                    <span className="text-primary font-medium group-hover:underline">
                      Tap here to send them a message →
                    </span>
                  </p>
                </div>
              </div>
            </button>
          )}
        </header>

        {/* Stats Row — plain English */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <StatCard
            title="Revenue at Risk"
            value={`$${stats.atRiskRevenue.toLocaleString()}`}
            subtitle="Could lose in the next year"
            type="revenue"
          />
          <StatCard
            title="Need Attention"
            value={stats.criticalCount}
            subtitle={stats.criticalCount === 1 ? "customer may not return" : "customers may not return"}
            type="critical"
          />
          <StatCard
            title="Avg. Days Away"
            value={stats.avgDaysSince}
            subtitle="Since last visit"
            type="days"
          />
          <StatCard
            title="Won Back"
            value={wonBackCount > 0 ? `$${revenueRecovered.toLocaleString()}` : "$0"}
            subtitle={wonBackCount > 0 ? `${wonBackCount} customer${wonBackCount !== 1 ? "s" : ""} returned` : "Start reaching out!"}
            type="recovered"
            animate
          />
        </div>

        {/* Filter Bar — friendly labels */}
        <div className="glass-subtle rounded-xl p-2 mb-6 flex items-center gap-2 overflow-x-auto">
          {(Object.keys(filterLabels) as FilterType[]).map((key) => {
            const count = filterCounts[key]
            const dot =
              key === "critical"
                ? "bg-[oklch(0.60_0.20_25)]"
                : key === "at-risk"
                  ? "bg-[oklch(0.75_0.15_65)]"
                  : key === "watch"
                    ? "bg-[oklch(0.70_0.12_85)]"
                    : key === "loyal"
                      ? "bg-[oklch(0.65_0.15_155)]"
                      : "bg-muted-foreground"

            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap flex items-center gap-2",
                  filter === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {key !== "all" && <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dot)} />}
                {filterLabels[key].label}
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
                    filter === key ? "bg-primary-foreground/20" : "bg-muted-foreground/20"
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Customer Heatmap Grid — 5 columns as per PDF spec */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredCustomers.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onClick={handleCustomerClick}
              isSelected={selectedCustomer?.id === customer.id}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredCustomers.length === 0 && (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-lg font-medium text-foreground mb-2">No customers here</p>
            <p className="text-muted-foreground">
              Great news — nobody matches this filter right now.
            </p>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      <DetailPanel
        customer={selectedCustomer}
        businessType={businessType}
        onClose={() => setSelectedCustomer(null)}
        onWonBack={handleWonBack}
      />
    </div>
  )
}
