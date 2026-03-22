import { NextResponse } from "next/server"
import { getBusinessProfile, saveBusinessProfile } from "@/lib/db"

export async function GET() {
  const profile = await getBusinessProfile()
  return NextResponse.json(profile)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { location, description, popularProducts } = body

  if (!location?.trim() || !description?.trim() || !Array.isArray(popularProducts) || popularProducts.length === 0) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 })
  }

  await saveBusinessProfile({
    location: location.trim(),
    description: description.trim(),
    popularProducts,
  })

  return NextResponse.json({ success: true })
}
