# PulseQ — AI Customer Retention Dashboard

## What This Is

PulseQ is an AI-powered customer retention tool for small businesses (coffee shops, gyms, boutiques). It identifies churn risk, generates personalized win-back outreach (email, phone scripts, offers), compares competitor pricing, and delivers daily audio briefings.

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** Supabase Postgres (migrated from SQLite/better-sqlite3)
- **AI:** Claude API (`@anthropic-ai/sdk`) — churn analysis, recommendations, email synthesis
- **Pricing:** Perplexity API (`sonar` model) — live competitor price lookups
- **Voice:** ElevenLabs TTS — audio briefings
- **UI:** Tailwind CSS 4, Radix UI primitives, Recharts, shadcn-style glass components
- **Deployment:** Vercel (serverless)

## Architecture

### Database (`lib/db.ts`)
- Uses `@supabase/supabase-js` with service role key (server-side only)
- All query functions are **async** — every call site must `await`
- Tables use **quoted camelCase** column names in Postgres (e.g. `"voiceId"`, `"churnScore"`)
- Price cache table has a 2-hour TTL
- Seed script (`scripts/seed.ts`) uses the `postgres` npm package for DDL

### DB Tables
- `businesses` — business profiles by type (coffee_shop, gym, boutique)
- `products` — product catalog
- `competitors` — competitor pricing data (uses `prices` JSON text column, not separate amazon/target/walmart)
- `customers` — customer records with churn scores
- `transactions` — customer transaction history
- `surveys` — customer satisfaction surveys
- `business_profiles` — user-configurable business info (location, description, popular products)
- `price_cache` — cached competitor prices (uses `prices` JSON text column)

### API Routes (`app/api/`)
- `orchestrate` — multi-agent pipeline: churn → recommendations → pricing → email synthesis
- `market-search` — Perplexity-powered competitor price lookup with DB caching
- `briefing` — AI daily briefing generation
- `churn` — standalone churn analysis
- `email` — email generation
- `recommend` — product recommendations
- `voice` — ElevenLabs TTS
- `action` — action tracking
- `profile` — GET/POST business profile
- `businesses`, `customers`, `products` — CRUD endpoints

### Pages (`app/`)
- `/` — main dashboard with stat cards, risk heatmap, customer cards
- `/customers` — full customer database with search, filters, sort. Won-back customers are filtered out via `wonBackIds`
- `/retention` — action-oriented retention queue, sorted by urgency. Customers disappear when marked retained
- `/prices` — competitor price comparison cards. Fetches from API (DB-cached), auto-reloads every 2 hours
- `/business` — business profile editor

### State Management (`components/pulse/client-layout.tsx`)
- `PulseContext` provides: `customers`, `businessType`, `businessData`, `catalogData`, `revenueRecovered`, `wonBackCount`, `wonBackIds`, `addWonBack`, `businessProfile`, `setBusinessProfile`
- `addWonBack(customer)` adds to `wonBackIds` Set and updates revenue/count
- Both `/customers` and `/retention` pages filter by `wonBackIds` for consistency

### Key Libraries
- `lib/rfm.ts` — Customer type, churn risk utilities (calculateAtRiskRevenue, getCriticalCount, getAverageDaysSince)
- `lib/data/` — JSON seed data (business.json, catalog.json, competitors.json, customers.json, surveys.json)

## Environment Variables

Required in `.env.local` (and Vercel project settings):
```
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
POSTGRES_URL          # used by seed script only
ANTHROPIC_API_KEY
PERPLEXITY_API_KEY
ELEVENLABS_API_KEY
```

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run seed` — drop/recreate all tables and seed Supabase from JSON files

## Conventions

- Glass morphism UI: `glass-card`, `glass-inset` CSS classes
- Fonts: `var(--font-display)` for headings, `var(--font-body)` for text
- Colors: cyan `#0891b2` primary, slate grays for text, red/amber/green for status
- Components live in `components/pulse/`
- No ORMs — direct Supabase client queries in `lib/db.ts`
