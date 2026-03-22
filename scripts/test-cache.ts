import { loadEnvConfig } from "@next/env"
loadEnvConfig(process.cwd())

import { getCachedPrice } from "../lib/db"

async function test() {
  const cached = await getCachedPrice("Oat Milk Latte")
  console.log("Cached Oat Milk Latte:", JSON.stringify(cached, null, 2))
}

test()
