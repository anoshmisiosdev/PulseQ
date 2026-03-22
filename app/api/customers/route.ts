import { NextResponse } from "next/server"
import customersData from "@/lib/data/customers.json"
import { calculateAtRiskRevenue, getCriticalCount, getAverageDaysSince } from "@/lib/rfm"
import type { Customer } from "@/lib/rfm"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const filter = searchParams.get("filter")

  let customers = customersData.customers as Customer[]

  // Apply filter if provided
  if (filter && filter !== "all") {
    customers = customers.filter((c) => {
      if (c.confidenceLevel === "low") return false
      if (filter === "critical") return c.churnScore >= 80
      if (filter === "at-risk") return c.churnScore >= 50 && c.churnScore < 80
      if (filter === "watch") return c.churnScore >= 30 && c.churnScore < 50
      if (filter === "loyal") return c.churnScore < 30
      return true
    })
  }

  // Calculate summary stats
  const allCustomers = customersData.customers as Customer[]
  const summary = {
    total: allCustomers.length,
    atRiskRevenue: calculateAtRiskRevenue(allCustomers),
    criticalCount: getCriticalCount(allCustomers),
    avgDaysSince: getAverageDaysSince(allCustomers),
  }

  return NextResponse.json({
    customers,
    summary,
  })
}
