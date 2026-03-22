"use client"

import { useState, useMemo, useCallback } from "react"
import { usePulse } from "@/components/pulse/client-layout"
import { DetailPanel } from "@/components/pulse/detail-panel"
import { Search, SlidersHorizontal, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Customer } from "@/lib/rfm"

type FilterType = "all" | "critical" | "at-risk" | "watch" | "loyal"
type SortKey = "name" | "health" | "risk" | "days"
type SortDir = "asc" | "desc"

const filterLabels: Record<FilterType, { label: string; dot?: string }> = {
  all: { label: "Everyone" },
  critical: { label: "Needs Attention", dot: "#ef4444" },
  "at-risk": { label: "Slipping Away", dot: "#f59e0b" },
  watch: { label: "Keep an Eye On", dot: "#eab308" },
  loyal: { label: "Regulars", dot: "#10b981" },
}

function getHealthInfo(churnScore: number, confidenceLevel: string) {
  if (confidenceLevel === "low") return { label: "Low Data", color: "#94a3b8", bg: "rgba(148,163,184,0.12)" }
  if (churnScore >= 80) return { label: "Critical", color: "#ef4444", bg: "rgba(239,68,68,0.12)" }
  if (churnScore >= 50) return { label: "At Risk", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" }
  if (churnScore >= 30) return { label: "Watch", color: "#d97706", bg: "rgba(245,158,11,0.08)" }
  return { label: "Loyal", color: "#10b981", bg: "rgba(16,185,129,0.12)" }
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function CustomersPage() {
  const { customers, businessType, wonBackIds, addWonBack } = usePulse()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [filter, setFilter] = useState<FilterType>("all")
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("health")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDir(key === "name" ? "asc" : "desc")
    }
  }

  const filteredCustomers = useMemo(() => {
    let result = customers.filter((c) => !wonBackIds.has(c.id))

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.topItems.some((item) => item.toLowerCase().includes(q))
      )
    }

    if (filter !== "all") {
      result = result.filter((c) => {
        if (c.confidenceLevel === "low") return false
        if (filter === "critical") return c.churnScore >= 80
        if (filter === "at-risk") return c.churnScore >= 50 && c.churnScore < 80
        if (filter === "watch") return c.churnScore >= 30 && c.churnScore < 50
        if (filter === "loyal") return c.churnScore < 30
        return true
      })
    }

    const dir = sortDir === "asc" ? 1 : -1
    result.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir
      if (sortKey === "health") return (a.churnScore - b.churnScore) * dir
      if (sortKey === "risk") return ((a.avgTransactionValue * 12) - (b.avgTransactionValue * 12)) * dir
      if (sortKey === "days") return (a.daysSinceVisit - b.daysSinceVisit) * dir
      return 0
    })

    return result
  }, [customers, wonBackIds, filter, search, sortKey, sortDir])

  const filterCounts = useMemo(() => {
      const active = customers.filter((c) => !wonBackIds.has(c.id))
      return {
        all: active.length,
        critical: active.filter((c) => c.churnScore >= 80 && c.confidenceLevel !== "low").length,
        "at-risk": active.filter((c) => c.churnScore >= 50 && c.churnScore < 80 && c.confidenceLevel !== "low").length,
        watch: active.filter((c) => c.churnScore >= 30 && c.churnScore < 50 && c.confidenceLevel !== "low").length,
        loyal: active.filter((c) => c.churnScore < 30 && c.confidenceLevel !== "low").length,
      }
    },
    [customers, wonBackIds]
  )

  const handleCustomerClick = useCallback((customer: Customer) => {
    setSelectedCustomer(customer)
  }, [])

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-[#94a3b8]" />
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-[#0891b2]" />
      : <ChevronDown className="w-3 h-3 text-[#0891b2]" />
  }

  return (
    <>
      <div className="space-y-5 animate-fade-up">
        {/* Page Header */}
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28, lineHeight: 1.2, letterSpacing: "-0.02em", color: "#0f172a" }}>
            Customer Database
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 14, color: "#475569", marginTop: 4 }}>
            {filterCounts.all} customers tracked — tap any row to see details and take action
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Search by name, email, or favorite item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-inset text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#0891b2]/40 transition-shadow"
            style={{ fontFamily: "var(--font-body)", borderRadius: 10 }}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(Object.keys(filterLabels) as FilterType[]).map((key) => {
            const f = filterLabels[key]
            const count = filterCounts[key]
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "px-4 py-2 text-sm rounded-full transition-all whitespace-nowrap flex items-center gap-2 border",
                  filter === key
                    ? "bg-[#0891b2] text-white border-[#0891b2] shadow-sm"
                    : "glass-inset text-[#475569] border-transparent hover:text-[#0f172a] hover:border-white/40"
                )}
                style={{ fontFamily: "var(--font-body)", fontWeight: 600 }}
              >
                {f.dot && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: filter === key ? "rgba(255,255,255,0.6)" : f.dot }}
                  />
                )}
                {f.label}
                <span className={cn("text-xs px-1.5 py-0.5 rounded-full", filter === key ? "bg-white/20" : "bg-black/5")}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Compact Table */}
        <div className="glass-card overflow-hidden" style={{ borderRadius: 16 }}>
          {/* Table Header */}
          <div
            className="grid items-center gap-4 px-5 py-3 border-b"
            style={{
              gridTemplateColumns: "2fr 1fr 1fr 1.2fr",
              borderColor: "rgba(255,255,255,0.3)",
              background: "rgba(255,255,255,0.3)",
            }}
          >
            {([
              { key: "name" as SortKey, label: "Name" },
              { key: "health" as SortKey, label: "Health" },
              { key: "risk" as SortKey, label: "$ At Risk" },
              { key: "days" as SortKey, label: "Last Seen" },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleSort(key)}
                className="flex items-center gap-1.5 text-left group"
                style={{
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: 12,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: sortKey === key ? "#0891b2" : "#94a3b8",
                }}
              >
                {label}
                <SortIcon col={key} />
              </button>
            ))}
          </div>

          {/* Table Rows */}
          <div>
            {filteredCustomers.map((customer, i) => {
              const health = getHealthInfo(customer.churnScore, customer.confidenceLevel)
              const atRisk = customer.avgTransactionValue * 12
              const isSelected = selectedCustomer?.id === customer.id
              const isDimmed = customer.confidenceLevel === "low"

              return (
                <button
                  key={customer.id}
                  onClick={() => handleCustomerClick(customer)}
                  className={cn(
                    "w-full grid items-center gap-4 px-5 py-3.5 text-left transition-all",
                    "hover:bg-white/40",
                    isSelected && "bg-[rgba(8,145,178,0.06)]",
                    isDimmed && "opacity-50 grayscale",
                    i !== filteredCustomers.length - 1 && "border-b"
                  )}
                  style={{
                    gridTemplateColumns: "2fr 1fr 1fr 1.2fr",
                    borderColor: "rgba(255,255,255,0.2)",
                  }}
                >
                  {/* Name */}
                  <div className="min-w-0">
                    <p
                      className="truncate"
                      style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, color: "#0f172a", lineHeight: 1.3 }}
                    >
                      {customer.name}
                    </p>
                    <p
                      className="truncate"
                      style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 12, color: "#94a3b8", marginTop: 2 }}
                    >
                      {customer.email}
                    </p>
                  </div>

                  {/* Health Badge */}
                  <div>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full"
                      style={{
                        fontFamily: "var(--font-body)",
                        fontWeight: 600,
                        fontSize: 11,
                        padding: "4px 10px",
                        letterSpacing: "0.04em",
                        background: health.bg,
                        color: health.color,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: health.color }} />
                      {health.label}
                    </span>
                  </div>

                  {/* $ At Risk */}
                  <p style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: 14,
                    color: customer.churnScore >= 50 ? "#ef4444" : "#475569",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    ${atRisk.toLocaleString()}
                  </p>

                  {/* Last Seen */}
                  <div>
                    <p style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 13, color: "#0f172a" }}>
                      {formatDate(customer.lastVisit)}
                    </p>
                    <p style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                      {customer.daysSinceVisit} days ago
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Empty State */}
        {filteredCustomers.length === 0 && (
          <div className="glass-card p-12 text-center">
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "#0f172a", marginBottom: 8 }}>
              {search ? "No matches found" : "No customers here"}
            </h3>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#475569" }}>
              {search
                ? `No customers match "${search}". Try a different search.`
                : "Great news — nobody matches this filter right now."}
            </p>
          </div>
        )}
      </div>

      {/* Detail Panel — outside animate-fade-up to preserve fixed positioning */}
      <DetailPanel
        customer={selectedCustomer}
        businessType={businessType}
        onClose={() => setSelectedCustomer(null)}
        onWonBack={addWonBack}
      />
    </>
  )
}
