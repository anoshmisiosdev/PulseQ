import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

function parseClaudeJSON(text: string) {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

export async function POST(request: Request) {
  try {
    const { customer, churn, recommendations, pricing, business } = await request.json()

    if (!customer) {
      return NextResponse.json({ error: 'Missing customer' }, { status: 400 })
    }

    const businessData = business || {
      name: 'Hayward Coffee Co.',
      type: 'coffee_shop',
      tone: 'warm, neighborhood, unhurried',
      emailSignoff: '— The team at Hayward Coffee Co.'
    }

    const client = new Anthropic()
    const firstName = customer.name.split(' ')[0]

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `You are a warm ${businessData.type} owner writing a personal win-back email to ${firstName}.

BUSINESS: ${businessData.name}, tone: ${businessData.tone}
SIGNOFF: ${businessData.emailSignoff}

CHURN ANALYSIS: ${JSON.stringify(churn || {})}
RECOMMENDATIONS: ${JSON.stringify(recommendations || [])}
PRICING: ${JSON.stringify(pricing || {})}

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
- Tone: ${businessData.tone} — NOT corporate, NOT marketing
- MUST be under 120 words
- End with business signoff`
      }]
    })

    return NextResponse.json(parseClaudeJSON(msg.content[0].type === 'text' ? msg.content[0].text : ''))
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({
      subject: 'We miss you',
      body: 'Hi,\n\nIt\'s been a while. Come by this week — we\'d love to see you again.\n\n— The team',
      wordCount: 20,
      tags: [],
      footer: 'Powered by Pulse',
      fallback: true
    })
  }
}
