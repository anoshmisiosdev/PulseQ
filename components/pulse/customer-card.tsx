"use client"

import { memo } from "react"
import { cn } from "@/lib/utils"
import type { Customer } from "@/lib/rfm"
import { TrendingDown, Zap } from "lucide-react"

interface CustomerCardProps {
  customer: Customer
  onClick: (customer: Customer) => void
  isSelected?: boolean
}

function getRiskInfo(churnScore: number, confidenceLevel: string) {
  if (confidenceLevel === "low") {
    return {
      label: "Low Confidence",
      badgeClass: "badge-dimmed",
      cardClass: "glass-card--dimmed",
      borderColor: "#94a3b8",
    }
  }
  if (churnScore >= 80) {
    return {
      label: `Critical ${churnScore}`,
      badgeClass: "badge-critical",
      cardClass: "glass-card--critical",
      borderColor: "#ef4444",
    }
  }
  if (churnScore >= 50) {
    return {
      label: `At Risk ${churnScore}`,
      badgeClass: "badge-at-risk",
      cardClass: "glass-card--at-risk",
      borderColor: "#f59e0b",
    }
  }
  if (churnScore >= 30) {
    return {
      label: `Watch ${churnScore}`,
      badgeClass: "badge-at-risk",
      cardClass: "",
      borderColor: "#f59e0b",
    }
  }
  return {
    label: `Loyal ${churnScore}`,
    badgeClass: "badge-loyal",
    cardClass: "glass-card--loyal",
    borderColor: "#10b981",
  }
}

const patternLabels: Record<string, { label: string; icon?: typeof TrendingDown }> = {
  gradual_fade: { label: "Gradual Fade", icon: TrendingDown },
  sudden_drop: { label: "Sudden Drop", icon: Zap },
  group_churn: { label: "Group Churn" },
  stable: { label: "Stable" },
  unknown: { label: "Unknown" },
}

function CustomerCardComponent({ customer, onClick, isSelected }: CustomerCardProps) {
  const risk = getRiskInfo(customer.churnScore, customer.confidenceLevel)
  const pattern = patternLabels[customer.pattern] || patternLabels.unknown
  const atRiskRevenue = customer.avgTransactionValue * 12

  return (
    <button
      onClick={() => onClick(customer)}
      className={cn(
        "glass-card press-scale w-full text-left relative",
        risk.cardClass,
        isSelected && "ring-2 ring-[#0891b2] shadow-lg"
      )}
      style={{ minHeight: 140, padding: 16 }}
    >
      {/* Name + Risk Badge row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p
          className="truncate"
          style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, lineHeight: 1.3, color: "#0f172a" }}
        >
          {customer.name}
        </p>
        {/* Risk badge — pill shape (§7.6) */}
        <span
          className={cn("flex-shrink-0 rounded-full", risk.badgeClass)}
          style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 11, letterSpacing: "0.04em", padding: "4px 10px", lineHeight: 1 }}
        >
          {risk.label}
        </span>
      </div>

      {/* Days since visit */}
      <p style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 12, color: "#94a3b8", lineHeight: 1.4, letterSpacing: "0.01em" }}>
        {customer.daysSinceVisit} days ago
      </p>

      {/* Revenue at risk */}
      <p style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 13, color: "#475569", lineHeight: 1.4, marginTop: 2 }}>
        ${atRiskRevenue.toLocaleString()} at risk
      </p>

      {/* Pattern tag (§7.1) */}
      <div className="mt-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full",
            customer.pattern === "sudden_drop" ? "badge-sudden-drop" : "badge-gradual-fade"
          )}
          style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 11, padding: "3px 8px", lineHeight: 1 }}
        >
          {pattern.icon && <pattern.icon className="w-3 h-3" />}
          {pattern.label}
        </span>
      </div>
    </button>
  )
}

export const CustomerCard = memo(CustomerCardComponent)
