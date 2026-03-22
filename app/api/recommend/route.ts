import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

function parseClaudeJSON(text: string) {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

export async function POST(request: Request) {
  try {
    const { customer, catalog } = await request.json()

    if (!customer) {
      return NextResponse.json({ error: 'Missing customer' }, { status: 400 })
    }

    const client = new Anthropic()
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are a product recommendation engine.
Customer: ${customer.name}, buys: ${JSON.stringify(customer.topItems)}, avg spend: $${customer.avgTransactionValue}
Catalog: ${JSON.stringify(catalog || [])}

Recommend 1-3 products they haven't tried. Prioritize items launched after 2026-01-01.
Return ONLY valid JSON:
{
  "recommendations": [
    { "productName": "<name from catalog>", "reason": "<1 sentence>", "position": "<lead recommendation|secondary>" }
  ]
}`
      }]
    })

    return NextResponse.json(parseClaudeJSON(msg.content[0].type === 'text' ? msg.content[0].text : ''))
  } catch (error) {
    console.error('Recommend error:', error)
    return NextResponse.json({
      recommendations: [{
        productName: 'Lavender Matcha Latte',
        reason: 'New this month. Similar price point to their usual order.',
        position: 'lead recommendation'
      }],
      fallback: true
    })
  }
}
