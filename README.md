<p align="center">
  <strong>JudgeKit</strong><br/>
  <em>Lightweight judging for hackathons, science fairs, and pitch competitions.</em>
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/jdanjohnson/judgekit&env=UPSTASH_REDIS_REST_URL,UPSTASH_REDIS_REST_TOKEN"><img src="https://vercel.com/button" alt="Deploy with Vercel" /></a>
</p>

---

Assign judges to teams, score on configurable criteria, track progress in real-time, and export results — all without accounts. Every judge, team, and admin gets a **shareable link**.

## Features

- **Admin Dashboard** — Sidebar layout with overview stats, team/judge/criteria management, shareable links, and CSV/JSON export
- **Judge Portal** — Collapsible team cards with slider-based scoring, notes, and draft saving
- **Team View** — See assigned judges, judging status, and scores (once all judging is complete)
- **Unified Entry** — Single landing page with code-based lookup for judges, teams, and admins
- **Multi-Step Event Creation** — Guided wizard: Details → Criteria → Settings
- **Bulk Import** — Paste teams (`name, table #, project name` per line) or judges (one per line / comma-separated) to add many at once
- **Auto-Assign** — Evenly distribute judges across teams with one click
- **Assignment Management** — View all judge↔team assignments grouped by team, manually add or remove individual assignments, configurable target judges-per-team
- **Validation Warnings** — Flags teams below the target judge count and lists unassigned judges so nothing slips through the cracks
- **Event Configuration** — Edit event name, description, and timer duration from the Settings tab after creation
- **Start / Stop Judging** — Toggle judging on or off from the Overview tab; scoring is locked when judging is stopped
- **Judging Timer** — Live elapsed or countdown timer visible to admins and judges; shows overtime in red when the configured duration is exceeded
- **Master Admin Panel** — View all events with their PINs, team/judge counts, and status at `/admin`; protected by optional `MASTER_ADMIN_SECRET`
- **Organizer Notes** — Leave notes for judges from the Settings tab; displayed as a card in the judge portal
- **Editable Criteria** — Update criterion name, description, max score, and weight after creation via inline editing
- **Weighted / Unweighted Scoring** — Toggle between weighted (by criterion weight) and unweighted (simple average) final score calculation
- **Real-Time Progress** — Live progress bars and status pills across all views
- **Export** — Download results as CSV or JSON from the admin sidebar
- **Multi-Event** — Single deployment supports unlimited concurrent events

## Quick Start

### 1. Set up Upstash Redis

1. Create a free Redis database at [console.upstash.com](https://console.upstash.com)
2. Copy the **REST URL** and **REST Token**

### 2. Run locally

```bash
git clone https://github.com/jdanjohnson/judgekit.git
cd judgekit
npm install
cp .env.example .env.local
# Add your Upstash credentials to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create a new event.

### 3. Deploy to Vercel

Click the **Deploy** button above, or:

1. Fork this repo
2. Import it on [vercel.com/new](https://vercel.com/new)
3. Add environment variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Deploy

> **Tip:** Install the [Upstash Vercel integration](https://vercel.com/integrations/upstash) to auto-configure the env vars.

## How It Works

1. **Create an event** — name, description, admin PIN
2. **Add teams** — one at a time or bulk-paste lines of `name, table #, project name`
3. **Add judges** — one at a time or bulk-paste (one per line or comma-separated); each gets a unique 6-character access code
4. **Set scoring criteria** — name, max score, and weight
5. **Assign judges** — auto-assign or manage manually from the Assignments tab (add/remove individual pairings, see warnings for under-assigned teams)
6. **Share links** — copy direct URLs for each judge and team from the Share tab
7. **Judges score** — open their link, expand a team card, slide to score, submit
8. **Export results** — CSV or JSON when judging is complete

## URL Structure

| Role  | URL Pattern                            |
|-------|----------------------------------------|
| Master Admin | `/admin`                               |
| Admin        | `/event/{eventId}/admin`               |
| Judge        | `/event/{eventId}/judge/{accessCode}`  |
| Team         | `/event/{eventId}/team/{tableNumber}`  |

Codes can also be entered on the landing page — a unified lookup resolves the correct route.

## Environment Variables

| Variable                    | Required | Description              |
|-----------------------------|----------|--------------------------|
| `UPSTASH_REDIS_REST_URL`    | Yes      | Upstash Redis REST URL   |
| `UPSTASH_REDIS_REST_TOKEN`  | Yes      | Upstash Redis REST token |
| `MASTER_ADMIN_SECRET`       | No       | Secret to protect the `/admin` master panel. If not set, `/admin` is open to anyone. |

Also accepts `KV_REST_API_URL` / `KV_REST_API_TOKEN` (Vercel KV naming).

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com) 4
- [Upstash Redis](https://upstash.com) — serverless key-value storage
- Custom dark theme with DM Mono + Fraunces typography

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repo and clone your fork
2. **Install** dependencies: `npm install`
3. **Create a branch**: `git checkout -b feat/your-feature`
4. **Make changes** and test locally with `npm run dev`
5. **Lint**: `npm run lint`
6. **Build**: `npm run build`
7. **Commit** with a clear message and push
8. **Open a Pull Request** against `main`

### Guidelines

- Keep PRs focused — one feature or fix per PR
- Follow the existing code style (TypeScript, inline styles for UI components)
- Test your changes locally before submitting
- Update the README if your change affects setup or usage

### Reporting Issues

Open an [issue](https://github.com/jdanjohnson/judgekit/issues) with:
- A clear title and description
- Steps to reproduce (if it's a bug)
- Expected vs actual behavior

## License

MIT
