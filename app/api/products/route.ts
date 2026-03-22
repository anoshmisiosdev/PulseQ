import { NextResponse } from "next/server"
import { getAllProducts } from "@/lib/db"

export async function GET() {
  const products = await getAllProducts()
  return NextResponse.json(products)
}
