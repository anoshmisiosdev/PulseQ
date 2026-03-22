"use client"

import { useMemo } from "react"
import { usePulse } from "@/components/pulse/client-layout"
import { StatCard } from "@/components/pulse/stat-card"
import { calculateAtRiskRevenue, getCriticalCount, getAverageDaysSince } from "@/lib/rfm"
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area,
  Legend,
} from "recharts"
import { Sparkles, TrendingUp, Users, ArrowRight } from "lucide-react"
import Link from "next/link"

const RISK_COLORS = {
  "Needs Attention": "#ef4444",
  "Slipping Away": "#f59e0b",
  "Keep an Eye On": "#eab308",
  "Regulars": "#10b981",
  "New (Low Data)": "#94a3b8",
}

export default function DashboardPage() {
  const { customers, revenueRecovered, wonBackCount, wonBackIds } = usePulse()

  const stats = useMemo(
    () => ({
      atRiskRevenue: calculateAtRiskRevenue(customers),
      criticalCount: getCriticalCount(customers),
      avgDaysSince: getAverageDaysSince(customers),
    }),
    [customers]
  )

  // Risk distribution for pie chart
  const riskDistribution = useMemo(() => {
    const counts = { "Needs Attention": 0, "Slipping Away": 0, "Keep an Eye On": 0, "Regulars": 0, "New (Low Data)": 0 }
    customers.forEach((c) => {
      if (c.confidenceLevel === "low") counts["New (Low Data)"]++
      else if (c.churnScore >= 80) counts["Needs Attention"]++
      else if (c.churnScore >= 50) counts["Slipping Away"]++
      else if (c.churnScore >= 30) counts["Keep an Eye On"]++
      else counts["Regulars"]++
    })
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
  }, [customers])

  // Spending trend — aggregate by month
  const spendingTrend = useMemo(() => {
    const monthMap: Record<string, number> = {}
    customers.forEach((c) => {
      c.transactions.forEach((t) => {
        const month = t.date.slice(0, 7) // YYYY-MM
        monthMap[month] = (monthMap[month] || 0) + t.amount
      })
    })
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        revenue: Math.round(total),
      }))
  }, [customers])

  // Days since visit distribution for bar chart
  const daysBuckets = useMemo(() => {
    const buckets = [
      { range: "< 2 weeks", min: 0, max: 14, count: 0 },
      { range: "2-4 weeks", min: 14, max: 28, count: 0 },
      { range: "1-2 months", min: 28, max: 60, count: 0 },
      { range: "2-3 months", min: 60, max: 90, count: 0 },
      { range: "3+ months", min: 90, max: 9999, count: 0 },
    ]
    customers.forEach((c) => {
      const bucket = buckets.find((b) => c.daysSinceVisit >= b.min && c.daysSinceVisit < b.max)
      if (bucket) bucket.count++
    })
    return buckets.map(({ range, count }) => ({ range, count }))
  }, [customers])

  // Churn pattern distribution
  const patternData = useMemo(() => {
    const labels: Record<string, string> = {
      gradual_fade: "Fading Away",
      sudden_drop: "Stopped Suddenly",
      group_churn: "Group Left",
      stable: "Still Coming",
      unknown: "Not Enough Data",
    }
    const counts: Record<string, number> = {}
    customers.forEach((c) => {
      const label = labels[c.pattern] || "Unknown"
      counts[label] = (counts[label] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [customers])

  // Top priority customer
  const topPriority = useMemo(() => {
    return [...customers]
      .filter((c) => c.confidenceLevel !== "low" && c.churnScore >= 50 && !wonBackIds.has(c.id))
      .sort((a, b) => b.churnScore - a.churnScore)[0] || null
  }, [customers, wonBackIds])

  return (
    <div className="space-y-6">
      {/* Page title — staggered entrance §8 */}
      <div className="animate-fade-up" style={{ animationDelay: "0ms" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, lineHeight: 1.2, letterSpacing: "-0.02em", color: "#0f172a" }}>
          Dashboard
        </h1>
        <p style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 14, color: "#475569", marginTop: 4 }}>
          Here&apos;s how your customers are doing today
        </p>
      </div>

      {/* Top action banner — staggered (§8) */}
      {topPriority && (
        <Link
          href="/retention"
          className="block glass-card p-5 group cursor-pointer animate-fade-up"
          style={{ animationDelay: "200ms" }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(239,68,68,0.12)" }}>
              <Sparkles className="w-5 h-5 text-[#ef4444]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">Your #1 action today</p>
              <p className="text-lg font-display font-bold text-[#0f172a] mt-0.5">
                Reach out to {topPriority.name}
              </p>
              <p className="text-sm text-[#475569] mt-1">
                {topPriority.name.split(" ")[0]} hasn&apos;t visited in {topPriority.daysSinceVisit} days.
                They love {topPriority.topItems[0] || "coming in"}.{" "}
                <span className="text-[#0891b2] font-medium inline-flex items-center gap-1 group-hover:underline">
                  Go to Retention <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Stat Cards Row — staggered 80ms per card (§4.1, §8) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up" style={{ animationDelay: "400ms" }}>
        <StatCard
          title="Revenue at Risk"
          value={`$${stats.atRiskRevenue.toLocaleString()}`}
          subtitle="Could lose this year"
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
          title="Retained"
          value={wonBackCount > 0 ? `$${revenueRecovered.toLocaleString()}` : "$0"}
          subtitle={wonBackCount > 0 ? `${wonBackCount} customer${wonBackCount !== 1 ? "s" : ""} returned` : "Start reaching out!"}
          type="recovered"
          animate
        />
      </div>

      {/* Charts Grid — staggered (§8) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: "700ms" }}>
        {/* Customer Health Breakdown — pie */}
        <div className="glass-card p-5">
          <h2 className="font-display text-lg font-bold text-[#0f172a] mb-1">Customer Health</h2>
          <p className="text-xs text-[#94a3b8] mb-4">How your customers are doing right now</p>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {riskDistribution.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={RISK_COLORS[entry.name as keyof typeof RISK_COLORS] || "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.4)",
                    borderRadius: "12px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    fontSize: "13px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", fontFamily: "var(--font-body)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Last Visit Distribution — bar */}
        <div className="glass-card p-5">
          <h2 className="font-display text-lg font-bold text-[#0f172a] mb-1">When Did They Last Visit?</h2>
          <p className="text-xs text-[#94a3b8] mb-4">How long since each customer came in</p>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daysBuckets} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis tick={{ fontSize: 11, fill: "#475569" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.4)",
                    borderRadius: "12px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    fontSize: "13px",
                  }}
                />
                <Bar dataKey="count" fill="#0891b2" radius={[8, 8, 0, 0]} name="Customers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trend — area chart */}
        <div className="glass-card p-5">
          <h2 className="font-display text-lg font-bold text-[#0f172a] mb-1">Revenue Over Time</h2>
          <p className="text-xs text-[#94a3b8] mb-4">Total monthly spend from all customers</p>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendingTrend}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0891b2" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#475569" }} />
                <YAxis tick={{ fontSize: 11, fill: "#475569" }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.4)",
                    borderRadius: "12px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    fontSize: "13px",
                  }}
                  formatter={(value: number) => [`$${value}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0891b2"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Why They Leave — bar chart of patterns */}
        <div className="glass-card p-5">
          <h2 className="font-display text-lg font-bold text-[#0f172a] mb-1">Why They Leave</h2>
          <p className="text-xs text-[#94a3b8] mb-4">Common patterns in customer behavior</p>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patternData} layout="vertical" barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#475569" }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#475569" }} width={120} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.4)",
                    borderRadius: "12px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                    fontSize: "13px",
                  }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 8, 8, 0]} name="Customers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-up" style={{ animationDelay: "900ms" }}>
        <Link href="/customers" className="glass-card p-5 group cursor-pointer flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(8,145,178,0.1)" }}>
            <Users className="w-6 h-6 text-[#0891b2]" />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-[#0f172a]">Customer Database</p>
            <p className="text-sm text-[#475569]">{customers.length} customers tracked</p>
          </div>
          <ArrowRight className="w-5 h-5 text-[#94a3b8] group-hover:text-[#0891b2] transition-colors" />
        </Link>
        <Link href="/retention" className="glass-card p-5 group cursor-pointer flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.1)" }}>
            <TrendingUp className="w-6 h-6 text-[#10b981]" />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-[#0f172a]">Retention Actions</p>
            <p className="text-sm text-[#475569]">
              {stats.criticalCount} customer{stats.criticalCount !== 1 ? "s" : ""} need your attention
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-[#94a3b8] group-hover:text-[#10b981] transition-colors" />
        </Link>
      </div>
    </div>
  )
}
