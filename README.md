# PulseQ

AI-powered customer retention dashboard. Identifies churn risk, generates win-back outreach, and delivers daily audio briefings.

## Stack

Next.js 16 | SQLite (better-sqlite3) | Claude API | ElevenLabs TTS | Perplexity (pricing)

## Setup

Requires Node.js v18+.

1. Install dependencies:
   ```
   npm install
   ```

2. Create `.env` in the project root:
   ```
   ANTHROPIC_API_KEY=your_key_here
   PERPLEXITY_API_KEY=your_key_here
   ELEVENLABS_API_KEY=your_key_here
   ```

3. Seed the database:
   ```
   npm run seed
   ```

4. Start the dev server:
   ```
   npm run dev
   ```

Open http://localhost:3000.
ts
## Features

- **Dashboard** — customer risk heatmap, revenue-at-risk stats, filter by churn segment
- **Audio Briefing** — AI-generated spoken summary of business state (Claude + ElevenLabs)
- **Outreach** — per-customer email drafts, phone scripts, and special offers via multi-agent orchestration
- **Pricing** — live competitor price comparison via Perplexity API
- **Business Profile** — configurable business info stored in SQLite
- **Retention View** — track contacted, responded, and won-back customers
