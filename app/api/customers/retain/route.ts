import { NextResponse } from "next/server"
import { markCustomerRetained } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { customerId } = await request.json()
    if (!customerId) {
      return NextResponse.json({ error: "Missing customerId" }, { status: 400 })
    }
    await markCustomerRetained(customerId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Retain error:", error)
    return NextResponse.json({ error: "Failed to mark retained" }, { status: 500 })
  }
}
