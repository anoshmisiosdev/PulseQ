import { NextResponse } from "next/server"
import { getAllCustomers } from "@/lib/db"
import { calculateAtRiskRevenue, getCriticalCount, getAverageDaysSince } from "@/lib/rfm"
import type { Customer } from "@/lib/rfm"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const filter = searchParams.get("filter")

  const allCustomers = getAllCustomers() as unknown as Customer[]
  let customers = allCustomers

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

  const summary = {
    total: allCustomers.length,
    atRiskRevenue: calculateAtRiskRevenue(allCustomers),
    criticalCount: getCriticalCount(allCustomers),
    avgDaysSince: getAverageDaysSince(allCustomers),
  }

  return NextResponse.json({ customers, summary })
}
