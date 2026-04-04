# JudgeKit

Lightweight hackathon & science fair judging tool. Assign judges to teams, score on configurable criteria, track progress, and export results. **Shareable links, no accounts needed** — deploy to Vercel with Upstash Redis for persistent storage.

## Features

- **Admin Dashboard** — Create events, add teams (with table numbers), add judges (auto-generated access codes), configure scoring criteria, assign judges manually or auto-distribute
- **Judge Portal** — Judges use a direct link or 6-character code to see assigned teams, score on each criterion, add notes, and submit
- **Team View** — Teams use a direct link or table number to see assigned judges and judging progress (auto-refreshes)
- **Shareable Links** — Every judge and team gets a unique URL that can be shared directly
- **Assignment Matrix** — Visual grid showing all judge-team assignments with status colors
- **Auto-Assign** — Evenly distribute judges across teams with one click
- **Export** — Download results as CSV (for Excel/Sheets) or JSON
- **Rankings** — Live weighted-average team rankings in the admin dashboard
- **Multi-Event** — Single deployment supports unlimited concurrent events

## Quick Start

### 1. Set up Upstash Redis

1. Create a free Redis database at [console.upstash.com](https://console.upstash.com)
2. Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### 2. Run locally

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your Upstash credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create a new event.

### 3. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jdanjohnson/judgekit&env=UPSTASH_REDIS_REST_URL,UPSTASH_REDIS_REST_TOKEN)

Or connect your GitHub repo to Vercel and add the environment variables:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

> **Tip:** If you add the [Upstash integration](https://vercel.com/integrations/upstash) on Vercel, the env vars (`KV_REST_API_URL` / `KV_REST_API_TOKEN`) are set automatically.

## How It Works

1. **Create an event** with a name and admin PIN
2. **Add teams** with table numbers and optional project names
3. **Add judges** — each gets a unique 6-character access code
4. **Set scoring criteria** — name, max score, and weight
5. **Assign judges to teams** — manually via the matrix or auto-assign
6. **Share links** — use the Share tab to copy direct URLs for each judge and team
7. **Judges score** teams through their portal
8. **Export results** when judging is complete

## URL Structure

Each event gets a unique 8-character ID. All URLs are shareable:

| Role  | URL Pattern |
|-------|-------------|
| Admin | `/event/{eventId}/admin` |
| Judge | `/event/{eventId}/judge/{accessCode}` |
| Team  | `/event/{eventId}/team/{tableNumber}` |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis REST token |

The app also accepts `KV_REST_API_URL` / `KV_REST_API_TOKEN` (Vercel KV naming).

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com) 4
- [shadcn/ui](https://ui.shadcn.com)
- [Upstash Redis](https://upstash.com) (serverless storage)
