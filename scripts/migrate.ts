import postgres from "postgres"
import { loadEnvConfig } from "@next/env"

loadEnvConfig(process.cwd())

async function main() {
  const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" })

  try {
    console.log("Starting migration...")
    
    await sql`ALTER TABLE price_cache DROP COLUMN IF EXISTS amazon;`
    await sql`ALTER TABLE price_cache DROP COLUMN IF EXISTS target;`
    await sql`ALTER TABLE price_cache DROP COLUMN IF EXISTS walmart;`
    await sql`ALTER TABLE price_cache ADD COLUMN IF NOT EXISTS prices TEXT NOT NULL DEFAULT '[]';`

    await sql`ALTER TABLE competitors DROP COLUMN IF EXISTS amazon;`
    await sql`ALTER TABLE competitors DROP COLUMN IF EXISTS target;`
    await sql`ALTER TABLE competitors DROP COLUMN IF EXISTS walmart;`
    await sql`ALTER TABLE competitors ADD COLUMN IF NOT EXISTS prices TEXT NOT NULL DEFAULT '[]';`
    
    console.log("Migration successful!")
  } catch (err) {
    console.error("Migration failed", err)
  } finally {
    await sql.end()
  }
}

main()
