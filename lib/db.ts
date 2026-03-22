import Database from "better-sqlite3"
import path from "path"

const DB_PATH = path.join(process.cwd(), "pulse.db")

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
