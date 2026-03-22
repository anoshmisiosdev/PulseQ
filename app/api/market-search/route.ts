import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { product, ourPrice } = await request.json()

    if (!product) {
      return NextResponse.json({ error: 'Missing product' }, { status: 400 })
    }

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

    if (!jsonMatch) throw new Error('No JSON in response')

    const prices = JSON.parse(jsonMatch[0])
    const competitors = [prices.amazon, prices.target, prices.walmart].filter((p: any) => p != null)
    const lowestPrice = competitors.length > 0 ? Math.min(...competitors) : ourPrice || 5.00
    const delta = (ourPrice || 5.00) - lowestPrice

    return NextResponse.json({
      product,
      ourPrice,
      ...prices,
      delta: Math.round(delta * 100) / 100,
      citations: pData.citations || [],
      source: 'perplexity_live'
    })
  } catch (error) {
    console.error('Market search error:', error)
    return NextResponse.json({
      product: '',
      ourPrice: 5.00,
      amazon: 4.99,
      target: 5.20,
      walmart: 4.85,
      delta: -0.10,
      citations: [],
      source: 'fallback_static',
      fallback: true
    })
  }
}
