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

    function buildPrompt(retry: boolean): string {
      const base = `I run ${businessDesc}${locationStr}. Search for the current price of "${product}" at 3 nearby competing businesses.`
      const instruction = retry
        ? `You MUST provide a numeric price for every competitor — if an exact price is unavailable, use a realistic market estimate. Do NOT return null.`
        : `For each competitor, provide their actual or estimated price as a number (e.g. 4.75). Never return null for price.`
      return `${base} ${instruction} Respond with ONLY this JSON and nothing else: {"prices":[{"name":"Cafe Example","price":4.75},{"name":"Another Spot","price":5.25},{"name":"Third Place","price":4.50}]}`
    }

    function parsePerplexityResponse(text: string): { name: string; price: number }[] {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return []
      try {
        const parsed = JSON.parse(jsonMatch[0])
        return (parsed.prices || []).filter(
          (p: any) => p && typeof p.name === 'string' && typeof p.price === 'number' && p.price > 0
        )
      } catch {
        return []
      }
    }

    async function callPerplexity(prompt: string) {
      const resp = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: prompt }],
          return_citations: true
        })
      })
      return resp.json()
    }

    let pData = await callPerplexity(buildPrompt(false))
    let responseText = pData.choices?.[0]?.message?.content || ''
    let pricesArray = parsePerplexityResponse(responseText)

    // Retry once if no valid prices came back
    if (pricesArray.length === 0) {
      pData = await callPerplexity(buildPrompt(true))
      responseText = pData.choices?.[0]?.message?.content || ''
      pricesArray = parsePerplexityResponse(responseText)
    }

    if (pricesArray.length === 0) throw new Error('No valid prices returned after retry')

    const competitorPrices = pricesArray.map((p) => p.price)
    const lowestPrice = Math.min(...competitorPrices)
    const delta = (ourPrice || 5.00) - lowestPrice

    // Store in cache — don't let cache errors block the response
    setCachedPrice({
      product,
      prices: pricesArray,
      delta: Math.round(delta * 100) / 100,
      citations: pData.citations || [],
    }).catch((cacheErr: unknown) => console.warn('Cache write failed:', cacheErr))

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
      prices: [{"name": "Fallback Cafe", "price": 4.04}],
      delta: -0.10,
      citations: [],
      source: 'fallback_static',
      fallback: true
    })
  }
}
