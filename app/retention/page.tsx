"use client"

import { useState, useMemo, useCallback } from "react"
import { usePulse } from "@/components/pulse/client-layout"
import { DetailPanel } from "@/components/pulse/detail-panel"
import { cn } from "@/lib/utils"
import type { Customer } from "@/lib/rfm"
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  Phone,
  Mail,
  Gift,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Target,
} from "lucide-react"

function formatDaysAgo(days: number): string {
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 14) return "about a week ago"
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 60) return "about a month ago"
  return `${Math.floor(days / 30)} months ago`
}

export default function RetentionPage() {
  const { customers, businessType, revenueRecovered, wonBackCount, addWonBack } = usePulse()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Customers sorted by priority (highest risk first), only those needing action
  const actionQueue = useMemo(() => {
    return [...customers]
      .filter((c) => c.confidenceLevel !== "low" && c.churnScore >= 50)
      .sort((a, b) => b.churnScore - a.churnScore)
  }, [customers])

  // Customers who are a "watch" — not urgent but worth noting
  const watchList = useMemo(() => {
    return [...customers]
      .filter((c) => c.confidenceLevel !== "low" && c.churnScore >= 30 && c.churnScore < 50)
      .sort((a, b) => b.churnScore - a.churnScore)
  }, [customers])

  const handleCustomerClick = useCallback((customer: Customer) => {
    setSelectedCustomer(customer)
  }, [])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-display text-[28px] font-extrabold tracking-tight text-[#0f172a]">
          Retention
        </h1>
        <p className="text-sm text-[#475569] mt-1">
          Your action plan to win customers back — sorted by who needs you most
        </p>
      </div>

      {/* Progress Banner */}
      <div className="glass-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: wonBackCount > 0 ? "rgba(16,185,129,0.12)" : "rgba(8,145,178,0.1)" }}>
              {wonBackCount > 0 ? (
                <TrendingUp className="w-6 h-6 text-[#10b981]" />
              ) : (
                <Target className="w-6 h-6 text-[#0891b2]" />
              )}
            </div>
            <div>
              {wonBackCount > 0 ? (
                <>
                  <p className="font-display text-xl font-bold text-[#0f172a]">
                    ${revenueRecovered.toLocaleString()} recovered
                  </p>
                  <p className="text-sm text-[#475569]">
                    {wonBackCount} customer{wonBackCount !== 1 ? "s" : ""} won back so far
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-xl font-bold text-[#0f172a]">
                    {actionQueue.length} customers to reach out to
                  </p>
                  <p className="text-sm text-[#475569]">
                    Tap a customer below to send them a message and win them back
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex gap-4 text-center">
            <div>
              <p className="font-display text-2xl font-bold text-[#ef4444]">
                {actionQueue.filter((c) => c.churnScore >= 80).length}
              </p>
              <p className="text-[10px] text-[#94a3b8] uppercase tracking-wide font-medium">Urgent</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-[#f59e0b]">
                {actionQueue.filter((c) => c.churnScore < 80).length}
              </p>
              <p className="text-[10px] text-[#94a3b8] uppercase tracking-wide font-medium">At Risk</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-[#eab308]">{watchList.length}</p>
              <p className="text-[10px] text-[#94a3b8] uppercase tracking-wide font-medium">Watching</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Queue — priority list */}
      {actionQueue.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-[#ef4444]" />
            <h2 className="font-display text-lg font-bold text-[#0f172a]">
              Reach Out Now
            </h2>
            <span className="text-xs text-[#94a3b8]">— these customers need you</span>
          </div>

          <div className="space-y-3">
            {actionQueue.map((customer, index) => {
              const isCritical = customer.churnScore >= 80
              const firstName = customer.name.split(" ")[0]

              return (
                <button
                  key={customer.id}
                  onClick={() => handleCustomerClick(customer)}
                  className={cn(
                    "w-full glass-card text-left p-4 sm:p-5 group flex items-center gap-4",
                    isCritical && "border-l-4 border-l-[#ef4444]"
                  )}
                  style={isCritical ? { animation: index === 0 ? "breathe 3s ease-in-out infinite" : undefined } : undefined}
                >
                  {/* Priority Number */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                      isCritical
                        ? "bg-[rgba(239,68,68,0.12)] text-[#ef4444]"
                        : "bg-[rgba(245,158,11,0.12)] text-[#f59e0b]"
                    )}
                  >
                    {index + 1}
                  </div>

                  {/* Customer Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-display font-bold text-[#0f172a] truncate">
                        {customer.name}
                      </p>
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                          isCritical
                            ? "bg-[rgba(239,68,68,0.12)] text-[#ef4444]"
                            : "bg-[rgba(245,158,11,0.12)] text-[#f59e0b]"
                        )}
                      >
                        {isCritical ? "Urgent" : "At Risk"}
                      </span>
                    </div>
                    <p className="text-sm text-[#475569]">
                      Last visited {formatDaysAgo(customer.daysSinceVisit)} · Loves {customer.topItems[0] || "visiting"}
                    </p>
                  </div>

                  {/* Suggested Actions */}
                  <div className="hidden sm:flex items-center gap-1.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(8,145,178,0.08)] text-[#0891b2]" title="Send email">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(8,145,178,0.08)] text-[#0891b2]" title="Call script">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(8,145,178,0.08)] text-[#0891b2]" title="Special offer">
                      <Gift className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="w-4 h-4 text-[#94a3b8] group-hover:text-[#0891b2] transition-colors flex-shrink-0" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Watch List */}
      {watchList.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-[#eab308]" />
            <h2 className="font-display text-lg font-bold text-[#0f172a]">
              Keep an Eye On
            </h2>
            <span className="text-xs text-[#94a3b8]">— not urgent, but worth watching</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {watchList.map((customer) => (
              <button
                key={customer.id}
                onClick={() => handleCustomerClick(customer)}
                className="glass-card text-left p-4 group flex items-center gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-[#eab308] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0f172a] truncate">{customer.name}</p>
                  <p className="text-xs text-[#475569]">
                    {formatDaysAgo(customer.daysSinceVisit)} · {customer.topItems[0] || "regular"}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#94a3b8] group-hover:text-[#0891b2] transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tips for the business owner */}
      <div className="glass-card p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(99,102,241,0.1)" }}>
            <Sparkles className="w-5 h-5 text-[#6366f1]" />
          </div>
          <div>
            <h3 className="font-display font-bold text-[#0f172a] mb-2">Quick Tips</h3>
            <ul className="space-y-2 text-sm text-[#475569]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10b981] mt-0.5 flex-shrink-0" />
                <span><strong>Start at the top.</strong> The first customer on the list is your most urgent — reach out today.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10b981] mt-0.5 flex-shrink-0" />
                <span><strong>Personalize it.</strong> Mention their favorite item by name — it shows you care.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10b981] mt-0.5 flex-shrink-0" />
                <span><strong>Offer something small.</strong> A free drink or 10% off is enough — the gesture matters more than the discount.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#10b981] mt-0.5 flex-shrink-0" />
                <span><strong>Mark them as Won Back</strong> when they return so you can track your progress.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* All clear state */}
      {actionQueue.length === 0 && watchList.length === 0 && (
        <div className="glass-card p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-[#10b981] mx-auto mb-3" />
          <p className="font-display text-xl font-bold text-[#0f172a] mb-2">All caught up!</p>
          <p className="text-sm text-[#475569]">
            No customers need attention right now. Great work keeping everyone happy.
          </p>
        </div>
      )}

      {/* Detail Panel */}
      <DetailPanel
        customer={selectedCustomer}
        businessType={businessType}
        onClose={() => setSelectedCustomer(null)}
        onWonBack={addWonBack}
      />
    </div>
  )
}
