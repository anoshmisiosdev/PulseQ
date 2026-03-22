import { NextResponse } from "next/server"
import { getAllBusinesses } from "@/lib/db"

export async function GET() {
  const businesses = getAllBusinesses()
  return NextResponse.json(businesses)
}
