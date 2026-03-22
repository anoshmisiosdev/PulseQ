import postgres from "postgres"
import path from "path"
import fs from "fs"
import { loadEnvConfig } from "@next/env"

loadEnvConfig(process.cwd())

async function main() {
  const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" })

  // ── Drop existing tables ──────────────────────────────

  await sql`DROP TABLE IF EXISTS transactions CASCADE`
  await sql`DROP TABLE IF EXISTS surveys CASCADE`
  await sql`DROP TABLE IF EXISTS price_cache CASCADE`
  await sql`DROP TABLE IF EXISTS business_profiles CASCADE`
  await sql`DROP TABLE IF EXISTS customers CASCADE`
  await sql`DROP TABLE IF EXISTS competitors CASCADE`
  await sql`DROP TABLE IF EXISTS products CASCADE`
  await sql`DROP TABLE IF EXISTS businesses CASCADE`

  console.log("Dropped existing tables")

  // ── Create tables ──────────────────────────────────────

  await sql`
    CREATE TABLE businesses (
      "type" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "tone" TEXT NOT NULL,
      "voiceId" TEXT NOT NULL,
      "voiceName" TEXT NOT NULL,
      "discountBudget" REAL NOT NULL,
      "avgTransactionValue" REAL NOT NULL,
      "customerLifetimeValue" REAL NOT NULL,
      "emailSignoff" TEXT NOT NULL,
      "emailOpening" TEXT NOT NULL,
      "productLanguage" TEXT NOT NULL
    )
  `

  await sql`
    CREATE TABLE products (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "price" REAL NOT NULL,
      "category" TEXT NOT NULL,
      "launched" TEXT NOT NULL,
      "margin" REAL NOT NULL
    )
  `

  await sql`
    CREATE TABLE competitors (
      "name" TEXT PRIMARY KEY,
      "ourPrice" REAL NOT NULL,
      "prices" TEXT NOT NULL DEFAULT '[]',
      "delta" REAL NOT NULL
    )
  `

  await sql`
    CREATE TABLE customers (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "lastVisit" TEXT NOT NULL,
      "daysSinceVisit" INTEGER NOT NULL,
      "topItems" TEXT NOT NULL,
      "churnScore" INTEGER NOT NULL,
      "confidenceLevel" TEXT NOT NULL,
      "pattern" TEXT NOT NULL,
      "spendTrend" TEXT NOT NULL,
      "avgTransactionValue" REAL NOT NULL
    )
  `

  await sql`
    CREATE TABLE transactions (
      "id" SERIAL PRIMARY KEY,
      "customerId" TEXT NOT NULL REFERENCES customers("id"),
      "date" TEXT NOT NULL,
      "amount" REAL NOT NULL
    )
  `

  await sql`
    CREATE TABLE surveys (
      "id" SERIAL PRIMARY KEY,
      "customerId" TEXT NOT NULL,
      "date" TEXT NOT NULL,
      "satisfaction" INTEGER NOT NULL,
      "wouldRecommend" INTEGER NOT NULL,
      "comments" TEXT NOT NULL,
      "surveyInfluence" REAL NOT NULL
    )
  `

  await sql`
    CREATE TABLE business_profiles (
      "id" TEXT PRIMARY KEY DEFAULT 'default',
      "location" TEXT NOT NULL DEFAULT '',
      "description" TEXT NOT NULL DEFAULT '',
      "popularProducts" TEXT NOT NULL DEFAULT '[]'
    )
  `

  await sql`INSERT INTO business_profiles ("id") VALUES ('default')`

  await sql`
    CREATE TABLE price_cache (
      "product" TEXT PRIMARY KEY,
      "prices" TEXT NOT NULL DEFAULT '[]',
      "delta" REAL,
      "citations" TEXT NOT NULL DEFAULT '[]',
      "fetchedAt" TEXT NOT NULL
    )
  `

  console.log("Tables created")

  // ── Seed businesses ────────────────────────────────────

  const businessData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib/data/business.json"), "utf-8"))

  for (const [type, biz] of Object.entries(businessData)) {
    const b = biz as any
    await sql`
      INSERT INTO businesses ("type", "name", "tone", "voiceId", "voiceName", "discountBudget", "avgTransactionValue", "customerLifetimeValue", "emailSignoff", "emailOpening", "productLanguage")
      VALUES (${type}, ${b.name}, ${b.tone}, ${b.voiceId}, ${b.voiceName}, ${b.discountBudget}, ${b.avgTransactionValue}, ${b.customerLifetimeValue}, ${b.emailSignoff}, ${b.emailOpening}, ${b.productLanguage})
    `
  }
  console.log(`Seeded ${Object.keys(businessData).length} businesses`)

  // ── Seed products ──────────────────────────────────────

  const catalogData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib/data/catalog.json"), "utf-8"))

  for (const p of catalogData) {
    await sql`
      INSERT INTO products ("id", "name", "price", "category", "launched", "margin")
      VALUES (${p.id}, ${p.name}, ${p.price}, ${p.category}, ${p.launched}, ${p.margin})
    `
  }
  console.log(`Seeded ${catalogData.length} products`)

  // ── Seed competitors ───────────────────────────────────

  const competitorsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib/data/competitors.json"), "utf-8"))

  for (const c of competitorsData.products) {
    await sql`
      INSERT INTO competitors ("name", "ourPrice", "prices", "delta")
      VALUES (${c.name}, ${c.ourPrice}, ${JSON.stringify(c.prices)}, ${c.delta})
    `
  }
  console.log(`Seeded ${competitorsData.products.length} competitors`)

  // ── Seed customers + transactions ──────────────────────

  const customersData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib/data/customers.json"), "utf-8"))

  let txCount = 0
  for (const c of customersData) {
    await sql`
      INSERT INTO customers ("id", "name", "email", "lastVisit", "daysSinceVisit", "topItems", "churnScore", "confidenceLevel", "pattern", "spendTrend", "avgTransactionValue")
      VALUES (${c.id}, ${c.name}, ${c.email}, ${c.lastVisit}, ${c.daysSinceVisit}, ${JSON.stringify(c.topItems)}, ${c.churnScore}, ${c.confidenceLevel}, ${c.pattern}, ${c.spendTrend}, ${c.avgTransactionValue})
    `
    for (const tx of c.transactions) {
      await sql`
        INSERT INTO transactions ("customerId", "date", "amount")
        VALUES (${c.id}, ${tx.date}, ${tx.amount})
      `
      txCount++
    }
  }
  console.log(`Seeded ${customersData.length} customers, ${txCount} transactions`)

  // ── Seed surveys ───────────────────────────────────────

  const surveysData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib/data/surveys.json"), "utf-8"))

  for (const s of surveysData.responses) {
    await sql`
      INSERT INTO surveys ("customerId", "date", "satisfaction", "wouldRecommend", "comments", "surveyInfluence")
      VALUES (${s.customerId}, ${s.date}, ${s.satisfaction}, ${s.wouldRecommend ? 1 : 0}, ${s.comments}, ${s.surveyInfluence})
    `
  }
  console.log(`Seeded ${surveysData.responses.length} surveys`)

  await sql.end()
  console.log("\nDatabase seeded successfully on Supabase!")
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
