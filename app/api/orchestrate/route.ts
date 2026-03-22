import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import type { Customer } from "@/lib/rfm"
import { getAllCompetitors, getAllProducts, getCachedPrice, setCachedPrice } from "@/lib/db"

interface OrchestrateRequest {
  customer: Customer
  catalog: any[]
  business: any
}

function parseClaudeJSON(text: string) {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

async function runChurnAgent(customer: Customer) {
  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are a customer churn analysis engine.
Analyze this customer's churn risk. Return ONLY valid JSON (no markdown):
{
  "score": <0-100>,
  "confidence": "<high|medium|low>",
  "pattern": "<gradual_fade|sudden_drop|group_churn>",
  "reasoning": "<1-2 sentences with specific numbers like days gone and spend change>"
}

Customer: ${JSON.stringify(customer)}`
      }]
    })
    return parseClaudeJSON(msg.content[0].type === 'text' ? msg.content[0].text : '')
  } catch (e) {
    console.error('Churn agent failed:', e)
    return {
      score: customer.churnScore,
      confidence: customer.confidenceLevel,
      pattern: customer.pattern,
      reasoning: `${customer.daysSinceVisit} days gone, spend ${customer.spendTrend?.replace(/_/g, ' ') || 'declining'}. ${
        customer.pattern === 'gradual_fade' ? 'Likely lifestyle or competitor shift.' : 'Something specific happened.'
      }`,
      fallback: true
    }
  }
}

async function runRecommenderAgent(customer: Customer, catalog: any[]) {
  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are a product recommendation engine.
Customer: ${customer.name}, buys: ${JSON.stringify(customer.topItems)}, avg spend: $${customer.avgTransactionValue}
Catalog: ${JSON.stringify(catalog)}

Recommend 1-3 products they haven't tried. Prioritize items launched after 2026-01-01.
Return ONLY valid JSON:
{
  "recommendations": [
    { "productName": "<name from catalog>", "reason": "<1 sentence>", "position": "<lead recommendation|secondary>" }
  ]
}`
      }]
    })
    return parseClaudeJSON(msg.content[0].type === 'text' ? msg.content[0].text : '')
  } catch (e) {
    console.error('Recommender agent failed:', e)
    return {
      recommendations: [{
        productName: 'Lavender Matcha Latte',
        reason: 'New this month. Similar price point to their usual order.',
        position: 'lead recommendation'
      }],
      fallback: true
    }
  }
}

async function runPricingAgent(product: string, ourPrice: number) {
  // Check cache first
  const cached = getCachedPrice(product)
  if (cached) {
    const competitors = [cached.amazon, cached.target, cached.walmart].filter((p): p is number => p != null)
    const lowestPrice = competitors.length > 0 ? Math.min(...competitors) : ourPrice
    const delta = ourPrice - lowestPrice

    return {
      product,
      ourPrice,
      amazon: cached.amazon,
      target: cached.target,
      walmart: cached.walmart,
      delta: Math.round(delta * 100) / 100,
      valueMessage: 'Our prices are competitive — and our quality speaks for itself.',
      citations: cached.citations,
      source: 'cache',
    }
  }

  try {
    const pResp = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{
          role: 'user',
          content: `Current retail price of "${product}" on Amazon, Target, Walmart. Return ONLY JSON: { "amazon": <number>, "target": <number>, "walmart": <number> }`
        }],
        return_citations: true
      })
    })

    const pData = await pResp.json()
    const responseText = pData.choices?.[0]?.message?.content || ''
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)

    if (!jsonMatch) throw new Error('No JSON in Perplexity response')

    const prices = JSON.parse(jsonMatch[0])
    const competitors = [prices.amazon, prices.target, prices.walmart].filter((p: any) => p != null)
    const lowestPrice = competitors.length > 0 ? Math.min(...competitors) : ourPrice
    const delta = ourPrice - lowestPrice

    const client = new Anthropic()
    const valueMsg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: `Our "${product}" is $${ourPrice}. Lowest competitor: $${lowestPrice}. Delta: $${delta.toFixed(2)}. Write ONE warm sentence about our pricing advantage for a win-back email. No quotes.`
      }]
    })

    // Cache the result
    setCachedPrice({
      product,
      amazon: prices.amazon ?? null,
      target: prices.target ?? null,
      walmart: prices.walmart ?? null,
      delta: Math.round(delta * 100) / 100,
      citations: pData.citations || [],
    })

    return {
      product,
      ourPrice,
      amazon: prices.amazon,
      target: prices.target,
      walmart: prices.walmart,
      delta: Math.round(delta * 100) / 100,
      valueMessage: valueMsg.content[0].type === 'text' ? valueMsg.content[0].text : '',
      citations: pData.citations || [],
      source: 'perplexity_live'
    }
  } catch (e) {
    console.error('Pricing agent failed:', e)
    const match = getAllCompetitors().products?.[0]
    return {
      product,
      ourPrice,
      amazon: match?.amazon || 4.99,
      target: match?.target || 5.20,
      walmart: match?.walmart || 4.85,
      delta: match?.delta || -0.10,
      valueMessage: 'Our prices are competitive — and our quality speaks for itself.',
      citations: [],
      source: 'fallback_static',
      fallback: true
    }
  }
}


async function runSynthesisAgent(
  churn: any, recommendations: any, pricing: any,
  business: any, customerName: string
) {
  try {
    const client = new Anthropic()
    const firstName = customerName.split(' ')[0]
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `You are a warm ${business.type} owner writing a personal win-back email to ${firstName}.

BUSINESS: ${business.name}, tone: ${business.tone}
SIGNOFF: ${business.emailSignoff}

CHURN ANALYSIS: ${JSON.stringify(churn)}
RECOMMENDATIONS: ${JSON.stringify(recommendations)}
PRICING: ${JSON.stringify(pricing)}

Return ONLY valid JSON:
{
  "subject": "<personal subject, feels like a friend texting>",
  "body": "<full email text, UNDER 120 words>",
  "wordCount": <number>,
  "tags": [<"Rec" if used recs, "Price" if pricing>],
  "footer": "Powered by Pulse"
}

RULES:
- Use FIRST NAME only, not full name
- Reference their actual purchase history by name
- Mention the recommended product naturally
- Weave in pricing advantage if delta is negative
- Tone: ${business.tone} — NOT corporate, NOT marketing
- MUST be under 120 words
- End with business signoff`
      }]
    })
    return parseClaudeJSON(msg.content[0].type === 'text' ? msg.content[0].text : '')
  } catch (e) {
    console.error('Synthesis agent failed:', e)
    const firstName = customerName.split(' ')[0]
    return {
      subject: `${firstName} — we miss you`,
      body: `Hi ${firstName},\n\nIt's been a while since we've seen you. We wanted to reach out and let you know we've been thinking about you. Come by this week — we'd love to catch up.\n\n${business.emailSignoff}`,
      wordCount: 40,
      tags: [],
      footer: 'Powered by Pulse',
      fallback: true
    }
  }
}

export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    const body: OrchestrateRequest = await request.json()
    const { customer, catalog, business } = body

    if (!customer) {
      return NextResponse.json({ error: 'Missing customer' }, { status: 400 })
    }

    const businessData = business || {
      name: 'Hayward Coffee Co.',
      type: 'coffee_shop',
      tone: 'warm, neighborhood, unhurried',
      discountBudget: 500,
      emailSignoff: '— The team at Hayward Coffee Co.',
      emailOpening: 'Hi {firstName},'
    }

    let catalogData = catalog
    if (!catalogData) {
      catalogData = getAllProducts()
    }

    const pricingProduct = customer.topItems?.[0] || 'Cold Brew Coffee'
    const pricingPrice = Array.isArray(catalogData)
      ? catalogData.find((p: any) => p.name?.toLowerCase().includes(pricingProduct.toLowerCase()))?.price || 5.00
      : 5.00

    const [churn, recommendations, pricing] = await Promise.all([
      runChurnAgent(customer),
      runRecommenderAgent(customer, catalogData),
      runPricingAgent(pricingProduct, pricingPrice),
    ])

    const email = await runSynthesisAgent(
      churn, recommendations, pricing, businessData, customer.name
    )

    const firstName = customer.name.split(' ')[0]
    const phoneScript = [
      `Acknowledge: "${firstName}, we've missed you around here."`,
      `Hook: "We just launched a ${recommendations.recommendations?.[0]?.productName || 'something new'} — made like your usual ${customer.topItems?.[0]?.toLowerCase() || 'order'}."`,
      `CTA: "Come by this week, I'll make your first one on us."`
    ]

    const specialOffer = {
      headline: `Special offer for ${firstName}`,
      details: `10% off your next visit + first ${recommendations.recommendations?.[0]?.productName || 'drink'} on us`,
      validity: 'Valid 7 days',
      code: `WINBACK${customer.id.slice(-4).toUpperCase()}`
    }

    const latencyMs = Date.now() - startTime

    return NextResponse.json({
      churn,
      recommendations: recommendations.recommendations || recommendations,
      pricing,
      email,
      phoneScript,
      specialOffer,
      latencyMs,
      cached: false
    })

  } catch (error) {
    console.error('Orchestrate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
