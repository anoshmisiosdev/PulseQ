import path from "path"
import fs from "fs"

const DATA_DIR = path.join(process.cwd(), "lib", "data")

function readJSON<T>(filename: string): T {
  const filePath = path.join(DATA_DIR, filename)
  return JSON.parse(fs.readFileSync(filePath, "utf-8"))
}

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
  amazon: number
  target: number
  walmart: number
  delta: number
}

export interface CustomerRow {
  id: string
  name: string
  email: string
  lastVisit: string
  daysSinceVisit: number
  topItems: string[]
  transactions: { date: string; amount: number }[]
  churnScore: number
  confidenceLevel: string
  pattern: string
  spendTrend: string
  avgTransactionValue: number
}

export interface SurveyRow {
  customerId: string
  date: string
  satisfaction: number
  wouldRecommend: boolean
  comments: string
  surveyInfluence: number
}

// ── In-memory caches (ephemeral per serverless invocation) ──

let _businessProfile: BusinessProfileRow = { location: "", description: "", popularProducts: [] }

const _priceCache = new Map<string, PriceCacheRow>()

// ── Queries ────────────────────────────────────────────

export function getAllBusinesses(): Record<string, BusinessRow> {
  return readJSON<Record<string, BusinessRow>>("business.json")
}

export function getBusiness(type: string): BusinessRow | undefined {
  const businesses = getAllBusinesses()
  return businesses[type]
}

export function getAllProducts(): ProductRow[] {
  return readJSON<ProductRow[]>("catalog.json")
}

export function getAllCompetitors(): { products: CompetitorRow[] } {
  return readJSON<{ products: CompetitorRow[] }>("competitors.json")
}

export function getAllCustomers() {
  const customers = readJSON<CustomerRow[]>("customers.json")
  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    lastVisit: c.lastVisit,
    daysSinceVisit: c.daysSinceVisit,
    transactions: c.transactions || [],
    topItems: c.topItems,
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

export function getBusinessProfile(): BusinessProfileRow {
  return _businessProfile
}

export function saveBusinessProfile(profile: BusinessProfileRow): void {
  _businessProfile = profile
}

// ── Price Cache ────────────────────────────────────────

const CACHE_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

export interface PriceCacheRow {
  product: string
  amazon: number | null
  target: number | null
  walmart: number | null
  delta: number | null
  citations: string[]
  fetchedAt: string
}

export function getCachedPrice(product: string): PriceCacheRow | null {
  const row = _priceCache.get(product)
  if (!row) return null

  const fetchedAt = new Date(row.fetchedAt).getTime()
  if (Date.now() - fetchedAt > CACHE_TTL_MS) {
    _priceCache.delete(product)
    return null
  }

  return row
}

export function setCachedPrice(data: Omit<PriceCacheRow, "fetchedAt">): void {
  _priceCache.set(data.product, {
    ...data,
    fetchedAt: new Date().toISOString(),
  })
}

export function getAllSurveys(): { responses: SurveyRow[] } {
  return readJSON<{ responses: SurveyRow[] }>("surveys.json")
}
