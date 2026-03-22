// Coffee shop customers visit ~2x/week = 104 visits/year
export const ANNUAL_VISIT_MULTIPLIER = 104

export interface Transaction {
  date: string
  amount: number
}

export interface Customer {
  id: string
  name: string
  email: string
  lastVisit: string
  daysSinceVisit: number
  transactions: Transaction[]
  topItems: string[]
  churnScore: number
  confidenceLevel: "high" | "medium" | "low"
  pattern: "gradual_fade" | "sudden_drop" | "group_churn" | "stable" | "unknown"
  spendTrend: string
  avgTransactionValue: number
}

export function scoreCustomer(customer: Customer): number {
  const today = new Date()

  // R = Recency (days since last visit)
  const lastVisit = new Date(customer.lastVisit)
  const recencyDays = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
  const recencyScore = Math.max(0, 100 - recencyDays * 0.5) // 200 days = 0 points

  // F = Frequency (transactions in last 6 months)
  const sixMonthsAgo = new Date(today)
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const frequencyCount = customer.transactions.filter((t) => new Date(t.date) > sixMonthsAgo).length
  const frequencyScore = Math.min(100, frequencyCount * 10)

  // M = Monetary (total spend in last 6 months)
  const monetaryTotal = customer.transactions
    .filter((t) => new Date(t.date) > sixMonthsAgo)
    .reduce((sum, t) => sum + t.amount, 0)
  const monetaryScore = Math.min(100, monetaryTotal / 1) // scales to 100

  // Weighted score (40% R, 30% F, 30% M)
  // Invert to get churn score (lower RFM = higher churn risk)
  const rfmScore = recencyScore * 0.4 + frequencyScore * 0.3 + monetaryScore * 0.3
  const churnScore = Math.max(0, Math.min(100, 100 - rfmScore))

  return Math.round(churnScore)
}

export function getConfidenceLevel(customer: Customer): "high" | "medium" | "low" {
  const transactionCount = customer.transactions.length
  if (transactionCount < 3) return "low"
  if (transactionCount < 6) return "medium"
  return "high"
}

export function getChurnPattern(
  customer: Customer
): "gradual_fade" | "sudden_drop" | "group_churn" | "stable" | "unknown" {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const recent = customer.transactions.filter((t) => new Date(t.date) > sixMonthsAgo)
  const older = customer.transactions.filter((t) => new Date(t.date) <= sixMonthsAgo)

  if (customer.transactions.length < 3) return "unknown"
  if (recent.length === 0) return "sudden_drop"
  if (older.length > 0 && recent.length < older.length * 0.5) return "gradual_fade"
  if (customer.daysSinceVisit < 14) return "stable"

  return "gradual_fade"
}

export function getRiskLevel(churnScore: number): "critical" | "at-risk" | "watch" | "loyal" {
  if (churnScore >= 80) return "critical"
  if (churnScore >= 50) return "at-risk"
  if (churnScore >= 30) return "watch"
  return "loyal"
}

export function getRiskColor(churnScore: number, confidenceLevel: string): string {
  if (confidenceLevel === "low") return "dimmed"
  if (churnScore >= 80) return "critical"
  if (churnScore >= 50) return "at-risk"
  if (churnScore >= 30) return "watch"
  return "loyal"
}

export function calculateAtRiskRevenue(customers: Customer[]): number {
  return customers
    .filter((c) => c.churnScore >= 50 && c.confidenceLevel !== "low")
    .reduce((sum, c) => sum + c.avgTransactionValue * ANNUAL_VISIT_MULTIPLIER, 0)
}

export function getCriticalCount(customers: Customer[]): number {
  return customers.filter((c) => c.churnScore >= 80 && c.confidenceLevel !== "low").length
}

export function getAverageDaysSince(customers: Customer[]): number {
  if (customers.length === 0) return 0
  const total = customers.reduce((sum, c) => sum + c.daysSinceVisit, 0)
  return Math.round(total / customers.length)
}
