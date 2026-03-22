import { NextResponse } from "next/server"
import { getRetainedCustomerIds, markCustomerRetained } from "@/lib/db"

export async function GET() {
  const ids = await getRetainedCustomerIds()
  return NextResponse.json({ ids })
}

export async function POST(request: Request) {
  const { customerId, revenueRecovered } = await request.json()
  if (!customerId) {
    return NextResponse.json({ error: "customerId is required" }, { status: 400 })
  }
  await markCustomerRetained(customerId, revenueRecovered ?? 0)
  return NextResponse.json({ success: true })
}
