import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import type { Customer } from "@/lib/rfm"

function parseClaudeJSON(text: string) {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

export async function POST(request: Request) {
  try {
    const { customer, surveyResponses } = await request.json()

    if (!customer) {
      return NextResponse.json({ error: 'Missing customer' }, { status: 400 })
    }

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
  "reasoning": "<1-2 sentences with specific numbers like days gone and spend change>",
  "surveyModifier": <-0.2 to 0.3>
}

Customer: ${JSON.stringify(customer)}
Survey data: ${JSON.stringify(surveyResponses || [])}`
      }]
    })

    return NextResponse.json(parseClaudeJSON(msg.content[0].type === 'text' ? msg.content[0].text : ''))
  } catch (error) {
    console.error('Churn error:', error)
    const { customer: c } = await request.json().catch(() => ({ customer: null }))
    return NextResponse.json({
      score: c?.churnScore || 50,
      confidence: c?.confidenceLevel || 'medium',
      pattern: c?.pattern || 'gradual_fade',
      reasoning: 'Unable to analyze at this time.',
      surveyModifier: 0,
      fallback: true
    })
  }
}
