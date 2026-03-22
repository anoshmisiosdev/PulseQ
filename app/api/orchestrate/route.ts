import { NextResponse } from "next/server"
import type { Customer } from "@/lib/rfm"

interface OrchestrateRequest {
  customer: Customer
  businessType: "coffee_shop" | "gym" | "boutique"
}

// Mock responses for demo purposes
// In production, these would call Claude, Perplexity, and ElevenLabs APIs
export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const body: OrchestrateRequest = await request.json()
    const { customer, businessType } = body

    if (!customer) {
      return NextResponse.json({ error: "Missing customer" }, { status: 400 })
    }

    const firstName = customer.name.split(" ")[0]
    const topItem = customer.topItems[0] || "your usual"
    const daysGone = customer.daysSinceVisit

    // Simulate parallel agent execution
    const [churn, recommendations, pricing, survey] = await Promise.all([
      // Churn Agent
      Promise.resolve({
        score: customer.churnScore,
        confidence: customer.confidenceLevel,
        pattern: customer.pattern,
        reasoning: `${daysGone} days gone, spend ${customer.spendTrend.replace(/_/g, " ")}. ${
          customer.pattern === "gradual_fade"
            ? "Likely lifestyle or competitor shift."
            : customer.pattern === "sudden_drop"
              ? "Something specific happened - check for negative experiences."
              : "Pattern indicates potential recovery opportunity."
        }`,
      }),

      // Recommender Agent
      Promise.resolve([
        {
          productName: "Lavender Matcha Latte",
          reason: "Similar price point to their usual. Newly launched March 2026. They haven't tried it yet.",
          position: 1,
        },
        {
          productName: "Honey Oat Cold Brew",
          reason: "Complements their preference for oat-based drinks.",
          position: 2,
        },
      ]),

      // Pricing Agent (would use Perplexity in production)
      Promise.resolve({
        product: "Cold Brew (16oz)",
        ourPrice: 4.5,
        competitors: {
          amazon: 5.25,
          target: 5.4,
          walmart: 5.1,
        },
        delta: -0.6,
        valueMessage: "You're $0.60 cheaper than the lowest competitor. Lead with freshness and local quality.",
        sources: ["amazon.com", "target.com", "walmart.com"],
      }),

      // Survey Agent
      Promise.resolve({
        trigger: customer.churnScore > 60,
        discount: "10%",
        questions: [
          "What made you switch to a different spot?",
          "Would 10% off your next visit bring you back?",
          "What's one thing we could do better?",
        ],
      }),
    ])

    // Synthesis Agent - Generate final email
    const businessNames = {
      coffee_shop: "Hayward Coffee Co.",
      gym: "Fitwell Gym",
      boutique: "Aria Boutique",
    }

    const signoffs = {
      coffee_shop: "— The team at Hayward Coffee Co.",
      gym: "— Coach at Fitwell",
      boutique: "— The Aria Team",
    }

    const email = {
      subject: `${firstName} — we miss you (and have something new)`,
      body: `Hi ${firstName},

We noticed it's been ${daysGone} days since you last came in. You used to be one of our favorites — ${topItem}, ${customer.topItems[1] || "every visit"}.

We don't know what changed, but we wanted to reach out.

We launched a new ${recommendations[0].productName} this month. ${recommendations[0].reason}

Come by this week. First ${topItem.toLowerCase()} on us. We'd love to see you.

${signoffs[businessType]}

${survey.trigger ? `[Survey offer: ${survey.discount} off if you reply]` : ""}

Powered by Pulse`,
      wordCount: 107,
      tags: ["Rec", survey.trigger ? "Survey" : null, "Powered by Pulse"].filter(Boolean),
    }

    // Phone script
    const phoneScript = [
      `Acknowledge: "${firstName}, we've missed you around here."`,
      `Hook: "We just launched a ${recommendations[0].productName} — made like your usual ${topItem.toLowerCase()}."`,
      `CTA: "Come by this week, I'll make your first one on us."`,
    ]

    // Special offer
    const specialOffer = {
      headline: `Special offer for ${firstName}`,
      details: `${survey.discount} off your next visit + first ${recommendations[0].productName} on us`,
      validity: "Valid 7 days",
      code: `WINBACK${customer.id.slice(-4).toUpperCase()}`,
    }

    const latencyMs = Date.now() - startTime

    return NextResponse.json({
      churn,
      recommendations,
      pricing,
      survey,
      email,
      phoneScript,
      specialOffer,
      latencyMs,
    })
  } catch (error) {
    console.error("Orchestrate error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
