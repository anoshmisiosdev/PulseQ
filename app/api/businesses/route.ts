import { NextResponse } from "next/server"
import { getAllBusinesses } from "@/lib/db"

export async function GET() {
  const businesses = await getAllBusinesses()
  return NextResponse.json(businesses)
}
