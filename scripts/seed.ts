import Database from "better-sqlite3"
import path from "path"
import fs from "fs"

const DB_PATH = path.join(process.cwd(), "pulse.db")

// Remove existing DB to start fresh
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH)
  console.log("Removed existing database")
}

const db = new Database(DB_PATH)
db.pragma("journal_mode = WAL")
db.pragma("foreign_keys = ON")

// ── Create tables ──────────────────────────────────────

db.exec(`
  CREATE TABLE businesses (
    type TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tone TEXT NOT NULL,
    voiceId TEXT NOT NULL,
    voiceName TEXT NOT NULL,
    discountBudget REAL NOT NULL,
    avgTransactionValue REAL NOT NULL,
    customerLifetimeValue REAL NOT NULL,
    emailSignoff TEXT NOT NULL,
    emailOpening TEXT NOT NULL,
    productLanguage TEXT NOT NULL
  );

  CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    launched TEXT NOT NULL,
    margin REAL NOT NULL
  );

  CREATE TABLE competitors (
    name TEXT PRIMARY KEY,
    ourPrice REAL NOT NULL,
    amazon REAL NOT NULL,
    target REAL NOT NULL,
    walmart REAL NOT NULL,
    delta REAL NOT NULL
  );

  CREATE TABLE customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    lastVisit TEXT NOT NULL,
    daysSinceVisit INTEGER NOT NULL,
    topItems TEXT NOT NULL,
    churnScore INTEGER NOT NULL,
    confidenceLevel TEXT NOT NULL,
    pattern TEXT NOT NULL,
    spendTrend TEXT NOT NULL,
    avgTransactionValue REAL NOT NULL
  );

  CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId TEXT NOT NULL,
    date TEXT NOT NULL,
    amount REAL NOT NULL,
    FOREIGN KEY (customerId) REFERENCES customers(id)
  );

  CREATE TABLE surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerId TEXT NOT NULL,
    date TEXT NOT NULL,
    satisfaction INTEGER NOT NULL,
    wouldRecommend INTEGER NOT NULL,
    comments TEXT NOT NULL,
    surveyInfluence REAL NOT NULL
  );
`)

console.log("Tables created")

// ── Seed businesses ────────────────────────────────────

const businessData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib/data/business.json"), "utf-8"))
const insertBusiness = db.prepare(`
  INSERT INTO businesses (type, name, tone, voiceId, voiceName, discountBudget, avgTransactionValue, customerLifetimeValue, emailSignoff, emailOpening, productLanguage)
  VALUES (@type, @name, @tone, @voiceId, @voiceName, @discountBudget, @avgTransactionValue, @customerLifetimeValue, @emailSignoff, @emailOpening, @productLanguage)
`)

for (const [type, biz] of Object.entries(businessData)) {
  const b = biz as any
  insertBusiness.run({ type, ...b })
}
console.log(`Seeded ${Object.keys(businessData).length} businesses`)

// ── Seed products ──────────────────────────────────────

const catalogData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib/data/catalog.json"), "utf-8"))
const insertProduct = db.prepare(`
  INSERT INTO products (id, name, price, category, launched, margin)
  VALUES (@id, @name, @price, @category, @launched, @margin)
`)

for (const p of catalogData) {
  insertProduct.run(p)
}
console.log(`Seeded ${catalogData.length} products`)

// ── Seed competitors ───────────────────────────────────

const competitorsData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib/data/competitors.json"), "utf-8"))
const insertCompetitor = db.prepare(`
  INSERT INTO competitors (name, ourPrice, amazon, target, walmart, delta)
  VALUES (@name, @ourPrice, @amazon, @target, @walmart, @delta)
`)

for (const c of competitorsData.products) {
  insertCompetitor.run(c)
}
console.log(`Seeded ${competitorsData.products.length} competitors`)

// ── Seed customers + transactions ──────────────────────

const customersData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib/data/customers.json"), "utf-8"))
const insertCustomer = db.prepare(`
  INSERT INTO customers (id, name, email, lastVisit, daysSinceVisit, topItems, churnScore, confidenceLevel, pattern, spendTrend, avgTransactionValue)
  VALUES (@id, @name, @email, @lastVisit, @daysSinceVisit, @topItems, @churnScore, @confidenceLevel, @pattern, @spendTrend, @avgTransactionValue)
`)
const insertTransaction = db.prepare(`
  INSERT INTO transactions (customerId, date, amount)
  VALUES (@customerId, @date, @amount)
`)

let txCount = 0
for (const c of customersData) {
  insertCustomer.run({
    id: c.id,
    name: c.name,
    email: c.email,
    lastVisit: c.lastVisit,
    daysSinceVisit: c.daysSinceVisit,
    topItems: JSON.stringify(c.topItems),
    churnScore: c.churnScore,
    confidenceLevel: c.confidenceLevel,
    pattern: c.pattern,
    spendTrend: c.spendTrend,
    avgTransactionValue: c.avgTransactionValue,
  })
  for (const tx of c.transactions) {
    insertTransaction.run({ customerId: c.id, date: tx.date, amount: tx.amount })
    txCount++
  }
}
console.log(`Seeded ${customersData.length} customers, ${txCount} transactions`)

// ── Seed surveys ───────────────────────────────────────

const surveysData = JSON.parse(fs.readFileSync(path.join(process.cwd(), "lib/data/surveys.json"), "utf-8"))
const insertSurvey = db.prepare(`
  INSERT INTO surveys (customerId, date, satisfaction, wouldRecommend, comments, surveyInfluence)
  VALUES (@customerId, @date, @satisfaction, @wouldRecommend, @comments, @surveyInfluence)
`)

for (const s of surveysData.responses) {
  insertSurvey.run({
    customerId: s.customerId,
    date: s.date,
    satisfaction: s.satisfaction,
    wouldRecommend: s.wouldRecommend ? 1 : 0,
    comments: s.comments,
    surveyInfluence: s.surveyInfluence,
  })
}
console.log(`Seeded ${surveysData.responses.length} surveys`)

db.close()
console.log("\nDatabase seeded successfully at:", DB_PATH)
