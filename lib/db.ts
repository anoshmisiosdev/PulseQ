import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Types ──────────────────────────────────────────────

export interface BusinessRow {
  type: string
  name: string
  tone: string
  voiceId: string
  voiceName: string
  discountBudget: number
  avgTransactionValue: number
  customerLifetimeValue: number
  emailSignoff: string
  emailOpening: string
  productLanguage: string
}

export interface ProductRow {
  id: string
  name: string
  price: number
  category: string
  launched: string
  margin: number
}

export interface CompetitorRow {
  name: string
  ourPrice: number
  prices: { name: string, price: number }[]
  delta: number
}

export interface CustomerRow {
  id: string
  name: string
  email: string
  lastVisit: string
  daysSinceVisit: number
  topItems: string
  churnScore: number
  confidenceLevel: string
  pattern: string
  spendTrend: string
  avgTransactionValue: number
}

export interface TransactionRow {
  id: number
  customerId: string
  date: string
  amount: number
}

export interface SurveyRow {
  customerId: string
  date: string
  satisfaction: number
  wouldRecommend: number
  comments: string
  surveyInfluence: number
}

// ── Queries ────────────────────────────────────────────

export async function getAllBusinesses(): Promise<Record<string, BusinessRow>> {
  const { data, error } = await supabase.from("businesses").select("*")
  if (error) throw error
  const result: Record<string, BusinessRow> = {}
  for (const row of data || []) {
    result[row.type] = row as BusinessRow
  }
  return result
}

export async function getBusiness(type: string): Promise<BusinessRow | undefined> {
  const { data, error } = await supabase.from("businesses").select("*").eq("type", type).single()
  if (error) return undefined
  return data as BusinessRow
}

export async function getAllProducts(): Promise<ProductRow[]> {
  const { data, error } = await supabase.from("products").select("*")
  if (error) throw error
  return (data || []) as ProductRow[]
}

export async function getAllCompetitors(): Promise<{ products: CompetitorRow[] }> {
  const { data, error } = await supabase.from("competitors").select("*")
  if (error) throw error
  const mapped = (data || []).map((row: any) => ({
    ...row,
    prices: typeof row.prices === 'string' ? JSON.parse(row.prices) : (row.prices || [])
  }))
  return { products: mapped as CompetitorRow[] }
}

export async function getAllCustomers() {
  const { data: customers, error: cErr } = await supabase.from("customers").select("*")
  if (cErr) throw cErr
  const { data: transactions, error: tErr } = await supabase
    .from("transactions")
    .select("*")
    .order("date")
  if (tErr) throw tErr

  const txMap = new Map<string, { date: string; amount: number }[]>()
  for (const tx of transactions || []) {
    if (!txMap.has(tx.customerId)) txMap.set(tx.customerId, [])
    txMap.get(tx.customerId)!.push({ date: tx.date, amount: tx.amount })
  }

  return (customers || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    lastVisit: c.lastVisit,
    daysSinceVisit: c.daysSinceVisit,
    transactions: txMap.get(c.id) || [],
    topItems: typeof c.topItems === "string" ? JSON.parse(c.topItems) : c.topItems,
    churnScore: c.churnScore,
    confidenceLevel: c.confidenceLevel,
    pattern: c.pattern,
    spendTrend: c.spendTrend,
    avgTransactionValue: c.avgTransactionValue,
  }))
}

// ── Business Profile ───────────────────────────────────

export interface BusinessProfileRow {
  location: string
  description: string
  popularProducts: string[]
}

export async function getBusinessProfile(): Promise<BusinessProfileRow> {
  const { data, error } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("id", "default")
    .single()
  if (error || !data) return { location: "", description: "", popularProducts: [] }
  return {
    location: data.location,
    description: data.description,
    popularProducts: typeof data.popularProducts === "string"
      ? JSON.parse(data.popularProducts)
      : data.popularProducts,
  }
}

export async function saveBusinessProfile(profile: BusinessProfileRow): Promise<void> {
  const { error } = await supabase.from("business_profiles").upsert({
    id: "default",
    location: profile.location,
    description: profile.description,
    popularProducts: JSON.stringify(profile.popularProducts),
  })
  if (error) throw error
}

// ── Price Cache ────────────────────────────────────────

const CACHE_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

export interface PriceCacheRow {
  product: string
  prices: { name: string, price: number }[]
  delta: number | null
  citations: string[]
  fetchedAt: string
}

export async function getCachedPrice(product: string): Promise<PriceCacheRow | null> {
  const { data, error } = await supabase
    .from("price_cache")
    .select("*")
    .eq("product", product)
    .single()
  if (error || !data) return null

  const fetchedAt = new Date(data.fetchedAt).getTime()
  if (Date.now() - fetchedAt > CACHE_TTL_MS) return null

  return {
    product: data.product,
    prices: typeof data.prices === "string" ? JSON.parse(data.prices) : (data.prices || []),
    delta: data.delta,
    citations: typeof data.citations === "string" ? JSON.parse(data.citations) : data.citations,
    fetchedAt: data.fetchedAt,
  }
}

export async function setCachedPrice(input: Omit<PriceCacheRow, "fetchedAt">): Promise<void> {
  const { error } = await supabase.from("price_cache").upsert({
    product: input.product,
    prices: JSON.stringify(input.prices),
    delta: input.delta,
    citations: JSON.stringify(input.citations),
    fetchedAt: new Date().toISOString(),
  })
  if (error) throw error
}

export async function getAllSurveys(): Promise<{ responses: SurveyRow[] }> {
  const { data, error } = await supabase.from("surveys").select("*")
  if (error) throw error
  return {
    responses: (data || []).map((r: any) => ({
      ...r,
      wouldRecommend: r.wouldRecommend === 1 || r.wouldRecommend === true,
    })),
  }
}
