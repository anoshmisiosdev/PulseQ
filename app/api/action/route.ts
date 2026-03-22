import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

function parseClaudeJSON(text: string) {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
    const { customer, actionType, business } = body

    if (!customer || !actionType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const businessData = business || { type: 'coffee_shop', tone: 'warm, neighborhood, unhurried' }

    const client = new Anthropic()
    let prompt: string

    if (actionType === 'phone') {
      prompt = `Generate a 3-point phone script for a ${businessData.type} owner calling ${customer.name} (${customer.daysSinceVisit} days gone, pattern: ${customer.pattern}, usual: ${JSON.stringify(customer.topItems)}). Tone: ${businessData.tone}. Return ONLY JSON: { "actionType": "phone", "script": [{ "point": "Acknowledge", "line": "<text>" }, { "point": "Hook", "line": "<text>" }, { "point": "CTA", "line": "<text>" }] }. Each line under 25 words.`
    } else {
      prompt = `Create a special offer for ${customer.name} (${customer.daysSinceVisit} days gone, avg spend: $${customer.avgTransactionValue}). Business: ${businessData.type}, tone: ${businessData.tone}. Return ONLY JSON: { "actionType": "offer", "offer": "<discount + product hook>", "validity": "<time limit>", "shareableMessage": "<copy-pasteable message under 50 words>" }`
    }

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }]
    })

    const result = parseClaudeJSON(msg.content[0].type === 'text' ? msg.content[0].text : '')
    return NextResponse.json(result)

  } catch (error) {
    console.error('Action error:', error)
    const actionType = body?.actionType
    if (actionType === 'phone') {
      return NextResponse.json({
        actionType: 'phone',
        script: [
          { point: 'Acknowledge', line: `We've missed you around here.` },
          { point: 'Hook', line: `We just launched something new.` },
          { point: 'CTA', line: `Come by this week, first one's on us.` }
        ],
        fallback: true
      })
    }
    return NextResponse.json({
      actionType: 'offer',
      offer: '10% off + a free drink',
      validity: '7 days',
      shareableMessage: `We miss you! 10% off your next visit this week.`,
      fallback: true
    })
  }
}
