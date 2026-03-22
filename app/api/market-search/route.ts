import { NextResponse } from "next/server"
import { getCachedPrice, setCachedPrice, getBusinessProfile } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { product, ourPrice, forceRefresh } = await request.json()

    if (!product) {
      return NextResponse.json({ error: 'Missing product' }, { status: 400 })
    }

    // Check cache first
    if (!forceRefresh) {
      const cached = await getCachedPrice(product)
      if (cached) {
        const competitors = (cached.prices || []).map((p: any) => p.price).filter((p): p is number => p != null)
        const lowestPrice = competitors.length > 0 ? Math.min(...competitors) : ourPrice || 5.00
        const delta = (ourPrice || 5.00) - lowestPrice

        return NextResponse.json({
          product,
          ourPrice,
          prices: cached.prices || [],
          delta: Math.round(delta * 100) / 100,
          citations: cached.citations,
          source: 'cache',
          cachedAt: cached.fetchedAt,
        })
      }
    }

    // Cache miss — call Perplexity
    const profile = await getBusinessProfile()
    const locationStr = profile?.location ? ` in ${profile.location}` : ''
    const businessDesc = profile?.description
      ? `a business described as: "${profile.description.slice(0, 150)}"`
      : 'a local business'

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
          content: `I run ${businessDesc}${locationStr}. Identify the 3 most relevant local competitors to my business. Find the current retail price of "${product}" at each competitor. Return ONLY JSON: { "prices": [{ "name": "Competitor Name", "price": <number> }] }`
        }],
        return_citations: true
      })
    })

    const pData = await pResp.json()
    const responseText = pData.choices?.[0]?.message?.content || ''
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)

    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0])
    const pricesArray = parsed.prices || []
    const competitors = pricesArray.map((p: any) => p.price).filter((p: any) => p != null)
    const lowestPrice = competitors.length > 0 ? Math.min(...competitors) : ourPrice || 5.00
    const delta = (ourPrice || 5.00) - lowestPrice

    // Store in cache — only if we got real results; don't let cache errors block the response
    if (pricesArray.length > 0) {
      setCachedPrice({
        product,
        prices: pricesArray,
        delta: Math.round(delta * 100) / 100,
        citations: pData.citations || [],
      }).catch((cacheErr: unknown) => console.warn('Cache write failed:', cacheErr))
    }

    return NextResponse.json({
      product,
      ourPrice,
      prices: pricesArray,
      delta: Math.round(delta * 100) / 100,
      citations: pData.citations || [],
      source: 'perplexity_live'
    })
  } catch (error) {
    console.error('Market search error:', error)
    return NextResponse.json({
      product: '',
      ourPrice: 5.00,
      prices: [{"name": "Fallback Cafe", "price": 4.99}],
      delta: -0.10,
      citations: [],
      source: 'fallback_static',
      fallback: true
    })
  }
}
