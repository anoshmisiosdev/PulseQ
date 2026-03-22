import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import type { Customer } from "@/lib/rfm"

interface BriefingRequest {
  customers: Customer[]
  business: any
  revenueRecovered: number
  wonBackCount: number
}

export async function POST(request: Request) {
  try {
    const body: BriefingRequest = await request.json()
    const { customers, business, revenueRecovered, wonBackCount } = body

    if (!customers || !Array.isArray(customers)) {
      return NextResponse.json({ error: 'Missing customers data' }, { status: 400 })
    }

    const critical = customers.filter(c => c.churnScore > 80 && c.confidenceLevel !== 'low')
    const atRisk = customers.filter(c => c.churnScore >= 50 && c.churnScore < 80 && c.confidenceLevel !== 'low')
    const suddenDrops = customers.filter(c => c.pattern === 'sudden_drop')
    const gradualFades = customers.filter(c => c.pattern === 'gradual_fade')
    const groupChurns = customers.filter(c => c.pattern === 'group_churn')
    const atRiskRevenue = critical.reduce((s, c) => s + c.avgTransactionValue * 12, 0)
    const topAtRisk = critical.sort((a, b) => b.churnScore - a.churnScore).slice(0, 3)

    const businessData = business || { name: 'Hayward Coffee Co.', type: 'coffee_shop', voiceId: '21m00Tcm4TlvDq8ikWAM', voiceName: 'Rachel' }

    let script: string
    try {
      const client = new Anthropic()
      const briefingMsg = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{
          role: 'user',
          content: `You are a business intelligence assistant for ${businessData.name}.

Customer data:
- ${critical.length} critical customers (score > 80)
- ${atRisk.length} at-risk customers (score 50-79)
- ${suddenDrops.length} sudden drop patterns
- ${gradualFades.length} gradual fade patterns
- ${groupChurns.length} group churn patterns
- At-risk revenue: $${atRiskRevenue.toFixed(0)}
- Revenue recovered: $${revenueRecovered || 0}
- Won back: ${wonBackCount || 0}
- Top risk: ${topAtRisk[0]?.name || 'N/A'}, ${topAtRisk[0]?.daysSinceVisit || 0} days gone
${groupChurns.length > 0 ? `\nGROUP CHURN ALERT: ${groupChurns.length} customers stopped around the same date: ${groupChurns.map(c => c.name).join(', ')}` : ''}

Write a 60-90 second spoken business briefing (150-220 words).
Tone: warm, direct, like a trusted advisor. Voice: ${businessData.voiceName}.
Structure: 1) What improved 2) Biggest risk (name + numbers) 3) What went wrong 4) One thing to improve 5) Today's one action
No bullet points. Written to be SPOKEN. Do NOT start with "Hello" or "Good morning".
Name actual customers. End with one specific action.`
        }]
      })
      script = briefingMsg.content[0].type === 'text' ? briefingMsg.content[0].text : ''
    } catch (e) {
      const top = topAtRisk[0]
      script = `Your biggest risk right now is ${top?.name || 'a critical customer'}. They've been gone ${top?.daysSinceVisit || 'too many'} days. You have ${critical.length} critical customers representing $${atRiskRevenue.toFixed(0)} in at-risk revenue. Today's action: reach out to your highest-risk customer. One call could recover over $${((top?.avgTransactionValue || 8) * 12).toFixed(0)} for the year.`
    }

    const voiceId = businessData.voiceId || '21m00Tcm4TlvDq8ikWAM'

    try {
      const audioResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: script,
            model_id: 'eleven_turbo_v2',
            voice_settings: { stability: 0.60, similarity_boost: 0.75, style: 0.30 }
          })
        }
      )

      if (!audioResponse.ok) throw new Error(`ElevenLabs: ${audioResponse.status}`)

      const audioBuffer = await audioResponse.arrayBuffer()
      return new NextResponse(Buffer.from(audioBuffer), {
        headers: { 'Content-Type': 'audio/mpeg' }
      })
    } catch (e) {
      console.error('ElevenLabs failed, returning script text:', e)
      return NextResponse.json({ script, audioFailed: true })
    }

  } catch (error) {
    console.error('Briefing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
