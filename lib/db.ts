import Database from "better-sqlite3"
import path from "path"

const DB_PATH = path.join(process.cwd(), "../pulse.db")

let _db: Database.Database | null = null

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma("journal_mode = WAL")
    _db.pragma("foreign_keys = ON")
  }
  return _db
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

export function getAllBusinesses(): Record<string, BusinessRow> {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM businesses").all() as BusinessRow[]
  const result: Record<string, BusinessRow> = {}
  for (const row of rows) {
    result[row.type] = row
  }
  return result
}

export function getBusiness(type: string): BusinessRow | undefined {
  const db = getDb()
  return db.prepare("SELECT * FROM businesses WHERE type = ?").get(type) as BusinessRow | undefined
}

export function getAllProducts(): ProductRow[] {
  const db = getDb()
  return db.prepare("SELECT * FROM products").all() as ProductRow[]
}

export function getAllCompetitors(): { products: CompetitorRow[] } {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM competitors").all() as CompetitorRow[]
  return { products: rows }
}

export function getAllCustomers() {
  const db = getDb()
  const customers = db.prepare("SELECT * FROM customers").all() as CustomerRow[]
  const transactions = db.prepare("SELECT * FROM transactions ORDER BY date").all() as TransactionRow[]

  const txMap = new Map<string, { date: string; amount: number }[]>()
  for (const tx of transactions) {
    if (!txMap.has(tx.customerId)) txMap.set(tx.customerId, [])
    txMap.get(tx.customerId)!.push({ date: tx.date, amount: tx.amount })
  }

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    lastVisit: c.lastVisit,
    daysSinceVisit: c.daysSinceVisit,
    transactions: txMap.get(c.id) || [],
    topItems: JSON.parse(c.topItems),
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
  const db = getDb()
  const row = db.prepare("SELECT * FROM business_profiles WHERE id = 'default'").get() as any
  if (!row) return { location: "", description: "", popularProducts: [] }
  return {
    location: row.location,
    description: row.description,
    popularProducts: JSON.parse(row.popularProducts),
  }
}

export function saveBusinessProfile(profile: BusinessProfileRow): void {
  const db = getDb()
  db.prepare(
    "INSERT OR REPLACE INTO business_profiles (id, location, description, popularProducts) VALUES ('default', ?, ?, ?)"
  ).run(profile.location, profile.description, JSON.stringify(profile.popularProducts))
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
  const db = getDb()
  const row = db.prepare("SELECT * FROM price_cache WHERE product = ?").get(product) as any
  if (!row) return null

  const fetchedAt = new Date(row.fetchedAt).getTime()
  if (Date.now() - fetchedAt > CACHE_TTL_MS) return null

  return {
    product: row.product,
    amazon: row.amazon,
    target: row.target,
    walmart: row.walmart,
    delta: row.delta,
    citations: JSON.parse(row.citations),
    fetchedAt: row.fetchedAt,
  }
}

export function setCachedPrice(data: Omit<PriceCacheRow, "fetchedAt">): void {
  const db = getDb()
  db.prepare(
    "INSERT OR REPLACE INTO price_cache (product, amazon, target, walmart, delta, citations, fetchedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(
    data.product,
    data.amazon,
    data.target,
    data.walmart,
    data.delta,
    JSON.stringify(data.citations),
    new Date().toISOString()
  )
}

export function getAllSurveys(): { responses: SurveyRow[] } {
  const db = getDb()
  const rows = db.prepare("SELECT * FROM surveys").all() as (Omit<SurveyRow, "wouldRecommend"> & { wouldRecommend: number })[]
  return {
    responses: rows.map((r) => ({
      ...r,
      wouldRecommend: r.wouldRecommend === 1,
    })) as any,
  }
}
