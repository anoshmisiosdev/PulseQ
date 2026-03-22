"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  X, Mail, Phone, Gift, Play, Check,
  TrendingDown, TrendingUp, Minus, Volume2,
  Copy, CheckCircle2, Send, MessageCircle, Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Customer } from "@/lib/rfm"
import { LineChart, Line, ResponsiveContainer, YAxis, Area, AreaChart } from "recharts"
import businessData from "@/lib/data/business.json"
import confetti from "canvas-confetti"

interface DetailPanelProps {
  customer: Customer | null
  businessType: "coffee_shop" | "gym" | "boutique"
  onClose: () => void
  onWonBack: (customer: Customer) => void
}

type ActionType = "email" | "phone" | "offer"

const patternDescriptions: Record<string, { text: string; borderColor: string }> = {
  gradual_fade: {
    text: "Customer visits have been declining steadily. This usually indicates a competitor or lifestyle change.",
    borderColor: "#f59e0b",
  },
  sudden_drop: {
    text: "Customer stopped visiting abruptly. This may indicate a negative experience or major life event.",
    borderColor: "#ef4444",
  },
  group_churn: {
    text: "Multiple customers stopped around the same time. Check for operational issues around that date.",
    borderColor: "#ef4444",
  },
  stable: {
    text: "Customer visit pattern is consistent. Focus on retention and upselling.",
    borderColor: "#10b981",
  },
  unknown: {
    text: "Not enough data to determine a pattern yet.",
    borderColor: "#94a3b8",
  },
}

function getRiskColor(churnScore: number) {
  if (churnScore >= 80) return "#ef4444"
  if (churnScore >= 50) return "#f59e0b"
  if (churnScore >= 30) return "#f59e0b"
  return "#10b981"
}

function fireConfetti() {
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.7 },
    colors: ["#6366f1", "#10b981", "#22d3ee", "#f59e0b"],
    gravity: 1.2,
    scalar: 0.9,
    drift: 0,
  })
}

export function DetailPanel({ customer, businessType, onClose, onWonBack }: DetailPanelProps) {
  const [activeAction, setActiveAction] = useState<ActionType>("email")
  const [isPlaying, setIsPlaying] = useState(false)
  const [contacted, setContacted] = useState(false)
  const [responded, setResponded] = useState(false)
  const [wonBack, setWonBack] = useState(false)
  const [copied, setCopied] = useState(false)
  const [emailContent, setEmailContent] = useState("")
  const [phoneScript, setPhoneScript] = useState<string[]>([])
  const [offerContent, setOfferContent] = useState({ headline: "", details: "", code: "" })
  const audioRef = useRef<HTMLAudioElement>(null)

  const business = businessData[businessType as keyof typeof businessData]

  const generateContent = useCallback(() => {
    if (!customer) return
    const firstName = customer.name.split(" ")[0]
    const topItem = customer.topItems[0] || "your usual"

    setEmailContent(
      `${business.emailOpening.replace("{firstName}", firstName)}

We noticed it's been ${customer.daysSinceVisit} days since your last visit. We miss seeing you — you were always a ${topItem} fan.

We don't know what changed, but we wanted to reach out personally.

Come by this week and your first ${topItem.toLowerCase()} is on us. We'd love to see you again.

${business.emailSignoff}

Powered by Pulse`
    )

    setPhoneScript([
      `"${firstName}, this is [Your Name] from ${business.name}. We've missed you!"`,
      `"I noticed it's been a while since your last visit. Is everything okay?"`,
      `"We'd love to have you back — next ${topItem.toLowerCase()} is on us."`,
    ])

    setOfferContent({
      headline: `Welcome back, ${firstName}!`,
      details: `Free ${topItem} + 10% off your next visit. Valid for 7 days.`,
      code: `WELCOME-${firstName.toUpperCase()}`,
    })
  }, [customer, business])

  useEffect(() => {
    if (customer) {
      setWonBack(false)
      setContacted(false)
      setResponded(false)
      setCopied(false)
      generateContent()
    }
  }, [customer, generateContent])

  const handlePlayVoice = async () => {
    setIsPlaying(true)
    setTimeout(() => setIsPlaying(false), 5000)
  }

  const handleWonBack = () => {
    if (customer && !wonBack) {
      setWonBack(true)
      fireConfetti()
      onWonBack(customer)
    }
  }

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* fallback */ }
  }

  if (!customer) return null

  const chartData = customer.transactions.map((t) => ({ date: t.date, amount: t.amount }))
  const riskColor = getRiskColor(customer.churnScore)
  const patternInfo = patternDescriptions[customer.pattern] || patternDescriptions.unknown
  const TrendIcon = customer.spendTrend.includes("down") ? TrendingDown : customer.spendTrend.includes("up") ? TrendingUp : Minus

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel — spring slide-in (§7.3) */}
      <div className="detail-panel fixed top-0 right-0 bottom-0 w-full max-w-[380px] z-50 animate-slide-in-right">
        <div
          className="h-full flex flex-col overflow-y-auto"
          style={{
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderLeft: "1px solid rgba(255,255,255,0.4)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            borderRadius: "24px 0 0 24px",
          }}
        >
          {/* ---- Header (§7.3-1) ---- */}
          <div className="p-5 border-b border-white/20">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, lineHeight: 1.2, letterSpacing: "-0.01em", color: "#0f172a" }}>
                  {customer.name}
                </h2>
                <p style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                  {customer.email}
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/40 rounded-lg transition-colors">
                <X className="w-5 h-5 text-[#94a3b8]" />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span
                className="rounded-full"
                style={{
                  fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 11, padding: "4px 10px", lineHeight: 1, letterSpacing: "0.04em",
                  background: `${riskColor}1f`, color: riskColor,
                }}
              >
                {customer.churnScore >= 80 ? "Critical" : customer.churnScore >= 50 ? "At Risk" : customer.churnScore >= 30 ? "Watch" : "Loyal"} {customer.churnScore}
              </span>
              <span className="flex items-center gap-1 text-xs text-[#475569]">
                <TrendIcon className="w-3.5 h-3.5" />
                {customer.spendTrend.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* ---- Scrollable Content ---- */}
          <div className="overflow-y-auto p-5 space-y-4">
            {/* Sparkline (§7.3-2) — risk-colored line + area fill */}
            <div className="glass-inset rounded-2xl p-4">
              <p style={{ fontFamily: "var(--font-body)", fontWeight: 500, fontSize: 13, color: "#475569", marginBottom: 8 }}>
                Spending History
              </p>
              <div style={{ height: 60 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id={`risk-fill-${customer.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={riskColor} stopOpacity={0.1} />
                        <stop offset="95%" stopColor={riskColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                    <Area type="monotone" dataKey="amount" stroke={riskColor} strokeWidth={2} fill={`url(#risk-fill-${customer.id})`} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Insight (§7.3-3) — left accent matching pattern */}
            <div
              className="glass-inset rounded-2xl p-4"
              style={{ borderLeft: `4px solid ${patternInfo.borderColor}` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="badge-agent-churn rounded-full" style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 11, padding: "3px 8px", letterSpacing: "0.04em" }}>
                  Claude: Churn Agent
                </span>
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 14, lineHeight: 1.7, color: "#475569" }}>
                {patternInfo.text}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span
                  className={cn(
                    "rounded-full",
                    customer.pattern === "sudden_drop" ? "badge-sudden-drop" : customer.pattern === "gradual_fade" ? "badge-gradual-fade" : "badge-at-risk"
                  )}
                  style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 11, padding: "3px 8px" }}
                >
                  {customer.pattern === "sudden_drop" && <Zap className="w-3 h-3 inline mr-1" />}
                  {customer.pattern === "gradual_fade" && <TrendingDown className="w-3 h-3 inline mr-1" />}
                  {customer.pattern.replace("_", " ")}
                </span>
                <span
                  className={cn("rounded-full", customer.confidenceLevel === "high" ? "badge-high-conf" : "badge-dimmed")}
                  style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 11, padding: "3px 8px" }}
                >
                  {customer.confidenceLevel} confidence
                </span>
              </div>
            </div>

            {/* Action Menu (§7.3-5) — 3 glass-inset buttons */}
            <div className="flex gap-2">
              {([
                { type: "email" as ActionType, icon: Mail, label: "Email" },
                { type: "phone" as ActionType, icon: Phone, label: "Phone Script" },
                { type: "offer" as ActionType, icon: Gift, label: "Special Offer" },
              ]).map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setActiveAction(type)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all",
                    activeAction === type
                      ? "text-white shadow-sm"
                      : "glass-inset text-[#475569] hover:bg-white/50"
                  )}
                  style={{
                    fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, letterSpacing: "0.01em",
                    borderRadius: 12,
                    ...(activeAction === type ? {
                      background: "#0891b2",
                      boxShadow: "0 0 12px rgba(8,145,178,0.2)",
                    } : {}),
                  }}
                >
                  <Icon style={{ width: 18, height: 18 }} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Content Area (§7.3-6) */}
            <div className="glass-inset rounded-2xl p-4">
              {activeAction === "email" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge-agent-churn rounded-full" style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 11, padding: "2px 7px" }}>Churn</span>
                    <span className="badge-agent-pricing rounded-full" style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 11, padding: "2px 7px" }}>Synthesis</span>
                  </div>
                  <div
                    className="rounded-xl p-4 whitespace-pre-wrap max-h-52 overflow-y-auto"
                    style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 14, lineHeight: 1.6, color: "#0f172a", background: "rgba(255,255,255,0.5)" }}
                  >
                    {emailContent}
                  </div>
                  <button
                    onClick={() => handleCopy(emailContent)}
                    className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 glass-inset hover:bg-white/50 transition-all"
                    style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, borderRadius: 12, color: copied ? "#10b981" : "#475569" }}
                  >
                    {copied ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Email</>}
                  </button>
                </div>
              )}

              {activeAction === "phone" && (
                <div className="space-y-3">
                  {phoneScript.map((point, i) => (
                    <div key={i} className="glass-inset rounded-xl p-3 flex gap-3">
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(8,145,178,0.1)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#0891b2" }}
                      >
                        {i + 1}
                      </span>
                      <p style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 14, lineHeight: 1.6, color: "#0f172a" }}>
                        {point}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {activeAction === "offer" && (
                <div className="text-center space-y-3">
                  <div className="rounded-xl p-5" style={{ background: "linear-gradient(135deg, rgba(8,145,178,0.08), rgba(99,102,241,0.08))" }}>
                    <Gift className="w-8 h-8 mx-auto mb-2 text-[#0891b2]" />
                    <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "#0f172a" }}>{offerContent.headline}</p>
                    <p style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 14, color: "#475569", marginTop: 4 }}>{offerContent.details}</p>
                    <div className="mt-3 inline-block px-4 py-2 rounded-lg" style={{ background: "rgba(8,145,178,0.08)", border: "1px solid rgba(8,145,178,0.15)" }}>
                      <p style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 11, color: "#94a3b8" }}>Offer code</p>
                      <p style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 700, fontSize: 14, color: "#0891b2" }}>{offerContent.code}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(`${offerContent.headline}\n${offerContent.details}\nCode: ${offerContent.code}`)}
                    className="w-full py-2.5 rounded-xl flex items-center justify-center gap-2 glass-inset hover:bg-white/50 transition-all"
                    style={{ fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, borderRadius: 12, color: copied ? "#10b981" : "#475569" }}
                  >
                    {copied ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Offer</>}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ---- Footer: Voice Button + Status Buttons (§7.3-7, §7.3-8) ---- */}
          <div className="p-5 border-t border-white/20 space-y-4">
            {/* Voice Button — 56px circle (§7.3-7) */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                {/* Sound wave rings when playing */}
                {isPlaying && (
                  <>
                    <span className="voice-ring absolute inset-0 w-14 h-14 rounded-full" style={{ animationDelay: "0s" }} />
                    <span className="voice-ring absolute inset-0 w-14 h-14 rounded-full" style={{ animationDelay: "0.5s" }} />
                    <span className="voice-ring absolute inset-0 w-14 h-14 rounded-full" style={{ animationDelay: "1s" }} />
                  </>
                )}
                <button
                  onClick={handlePlayVoice}
                  disabled={isPlaying}
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-all press-scale relative z-10"
                  style={{
                    background: isPlaying ? "#0e7490" : "#0891b2",
                    boxShadow: isPlaying ? "0 0 16px rgba(8,145,178,0.3)" : "0 4px 12px rgba(8,145,178,0.2)",
                  }}
                >
                  {isPlaying ? (
                    <Volume2 className="w-6 h-6 text-white animate-pulse" />
                  ) : (
                    <Play className="w-6 h-6 text-white ml-0.5" />
                  )}
                </button>
              </div>
              <p style={{ fontFamily: "var(--font-body)", fontWeight: 400, fontSize: 12, color: "#94a3b8" }}>
                {isPlaying ? "Let it play..." : `Play as ${business.voiceName}`}
              </p>
            </div>

            {/* Status Buttons — Contacted, Responded, Won Back (§7.3-8) */}
            <div className="flex gap-2">
              {/* Contacted */}
              <button
                onClick={() => setContacted(true)}
                className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                style={{
                  fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, borderRadius: 12,
                  ...(contacted
                    ? { background: "#0891b2", color: "#fff" }
                    : { background: "transparent", border: "2px solid #0891b2", color: "#0891b2" }),
                }}
              >
                <Send className="w-4 h-4" />
                {contacted ? "Sent" : "Contacted"}
              </button>

              {/* Responded */}
              <button
                onClick={() => setResponded(true)}
                className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                style={{
                  fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, borderRadius: 12,
                  ...(responded
                    ? { background: "#f59e0b", color: "#fff" }
                    : { background: "transparent", border: "2px solid #f59e0b", color: "#f59e0b" }),
                }}
              >
                <MessageCircle className="w-4 h-4" />
                {responded ? "Yes!" : "Responded"}
              </button>
            </div>

            {/* Won Back — prominent, solid green (§7.3-8) */}
            <button
              onClick={handleWonBack}
              disabled={wonBack}
              className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all press-scale"
              style={{
                fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 16, borderRadius: 12,
                background: wonBack ? "#6366f1" : "#10b981",
                color: "#fff",
                boxShadow: wonBack ? "0 0 16px rgba(99,102,241,0.2)" : "0 4px 12px rgba(16,185,129,0.2)",
              }}
            >
              {wonBack ? (
                <><Check className="w-5 h-5" /> Won Back! +${(customer.avgTransactionValue * 12).toFixed(0)}</>
              ) : (
                <><CheckCircle2 className="w-5 h-5" /> Mark as Won Back</>
              )}
            </button>
          </div>

          <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
        </div>
      </div>
    </>
  )
}
