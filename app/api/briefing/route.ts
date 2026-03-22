import { NextResponse } from "next/server"
import type { Customer } from "@/lib/rfm"

interface BriefingRequest {
  customers: Customer[]
  businessType: "coffee_shop" | "gym" | "boutique"
  revenueRecovered: number
  wonBackCount: number
}

export async function POST(request: Request) {
  try {
    const body: BriefingRequest = await request.json()
    const { customers, revenueRecovered, wonBackCount } = body

    if (!customers || !Array.isArray(customers)) {
      return NextResponse.json({ error: "Missing customers data" }, { status: 400 })
    }

    // Build macro analysis
    const critical = customers.filter((c) => c.churnScore > 80 && c.confidenceLevel !== "low")
    const atRisk = customers.filter((c) => c.churnScore >= 50 && c.churnScore < 80 && c.confidenceLevel !== "low")
    const suddenDrops = customers.filter((c) => c.pattern === "sudden_drop")
    const gradualFades = customers.filter((c) => c.pattern === "gradual_fade")

    const atRiskRevenue = critical.reduce((s, c) => s + c.avgTransactionValue * 12, 0)
    const topAtRisk = critical.sort((a, b) => b.churnScore - a.churnScore).slice(0, 3)

    // Generate briefing script (would use Claude in production)
    const briefingScript = generateBriefingScript({
      criticalCount: critical.length,
      atRiskCount: atRisk.length,
      suddenDropCount: suddenDrops.length,
      gradualFadeCount: gradualFades.length,
      atRiskRevenue,
      revenueRecovered,
      wonBackCount,
      topCustomer: topAtRisk[0],
    })

    // In production, this would call ElevenLabs API
    // For now, return the script text
    return NextResponse.json({
      script: briefingScript,
      stats: {
        critical: critical.length,
        atRisk: atRisk.length,
        suddenDrops: suddenDrops.length,
        gradualFades: gradualFades.length,
        atRiskRevenue,
      },
    })
  } catch (error) {
    console.error("Briefing error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

interface BriefingData {
  criticalCount: number
  atRiskCount: number
  suddenDropCount: number
  gradualFadeCount: number
  atRiskRevenue: number
  revenueRecovered: number
  wonBackCount: number
  topCustomer?: Customer
}

function generateBriefingScript(data: BriefingData): string {
  const {
    criticalCount,
    atRiskCount,
    suddenDropCount,
    gradualFadeCount,
    atRiskRevenue,
    revenueRecovered,
    wonBackCount,
    topCustomer,
  } = data

  let script = ""

  // Positive first
  if (wonBackCount > 0) {
    script += `You won back ${wonBackCount} customer${wonBackCount > 1 ? "s" : ""} — that's $${revenueRecovered.toLocaleString()} recovered. Your Revenue Recovered counter is moving. Keep it moving.\n\n`
  } else {
    script += `Your Revenue Recovered counter is at zero. That changes today.\n\n`
  }

  // Biggest risk
  if (topCustomer) {
    script += `Right now your biggest risk is ${topCustomer.name}. ${
      topCustomer.pattern === "gradual_fade"
        ? `They were one of your most consistent regulars — every two weeks, ${topCustomer.topItems[0] || "their usual"}, for over a year.`
        : `They stopped coming suddenly — ${topCustomer.daysSinceVisit} days ago with no warning.`
    } They've been gone ${topCustomer.daysSinceVisit} days. Their spend was ${topCustomer.spendTrend.replace(/_/g, " ")} before they stopped. That's a ${topCustomer.pattern.replace("_", " ")}, which usually means ${
      topCustomer.pattern === "gradual_fade"
        ? "a competitor or a life change — not a bad experience. That means they can come back if you reach out."
        : "something specific happened. Worth investigating what changed that day."
    }\n\n`
  }

  // Pattern diagnosis
  if (suddenDropCount > 1) {
    script += `${suddenDropCount} customers dropped suddenly in the same period. That date pattern is a signal. Check what changed — a bad batch, a staffing change, something happened. Worth looking into.\n\n`
  }

  // Actionable suggestion
  script += `One thing to improve: your new Lavender Matcha Latte launched recently and none of your at-risk customers have seen a recommendation for it yet. That's a missed retention opportunity sitting right there.\n\n`

  // Today's action
  if (topCustomer) {
    script += `Today's one action: call ${topCustomer.name.split(" ")[0]}. Not a text, not an email — call them. You've got their script already in Pulse. One call, five minutes. Potentially $${(topCustomer.avgTransactionValue * 12).toLocaleString()} back for the year.`
  } else {
    script += `Today's one action: review your ${criticalCount} critical customers and reach out to at least one. Start with the highest risk score.`
  }

  return script
}
