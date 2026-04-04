# JudgeKit

Lightweight hackathon & science fair judging tool. Assign judges to teams, score on configurable criteria, track progress, and export results. **No database required** — data is stored in a single JSON file.

## Features

- **Admin Dashboard** — Create events, add teams (with table numbers), add judges (auto-generated access codes), configure scoring criteria, assign judges manually or auto-distribute
- **Judge Portal** — Judges enter a 6-character code to see assigned teams, browse before starting, score on each criterion, add notes, and submit
- **Team View** — Teams enter their table number to see assigned judges and judging progress (auto-refreshes)
- **Assignment Matrix** — Visual grid showing all judge-team assignments with status colors
- **Auto-Assign** — Evenly distribute judges across teams with one click
- **Export** — Download results as CSV (for Excel/Sheets) or JSON
- **Rankings** — Live weighted-average team rankings in the admin dashboard

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create a new event.

## How It Works

1. **Create an event** with a name and admin PIN
2. **Add teams** with table numbers and optional project names
3. **Add judges** — each gets a unique 6-character access code
4. **Set scoring criteria** — name, max score, and weight
5. **Assign judges to teams** — manually via the matrix or auto-assign
6. **Share access codes** with judges and **table numbers** with teams
7. **Judges score** teams through their portal
8. **Export results** when judging is complete

## Data Storage

All data is stored in `data/event.json` on the server. No external database is needed.

- Data persists across server restarts
- Export to CSV/JSON when the event is over
- Delete the JSON file to start fresh

## Deployment

Works on any Node.js host:

```bash
npm run build
npm start
```

Deploy to Railway, Render, Fly.io, or any VPS. The only requirement is a writable filesystem for the `data/` directory.

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- JSON file storage (zero dependencies)
