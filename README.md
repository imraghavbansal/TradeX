TradeX — a real-time stock market app built with Next.js, TradingView widgets, Finnhub market data, MongoDB, and scheduled alerts/emails via Inngest.

## Local Development

### First-time setup

```bash
npm install
cp env.example .env.local   # then fill in the real values (see below)
```

### Running the app

The app needs **three services running together**: the Next.js dev server, a local MongoDB instance, and the Inngest scheduler (for price alerts, market-data refresh, and welcome/news emails).

**Easiest — one command, one terminal:**

```bash
npm run dev:all
```

This starts MongoDB, `next dev`, and the Inngest dev server together (via `concurrently`), with color-coded, prefixed output so you can tell which service logged what. Press `Ctrl+C` once to stop all three cleanly — no manual cleanup needed.

**Manual — three separate terminals**, if you want to run/restart pieces independently:

```bash
npm run db:local     # terminal 1 — wait for "Local MongoDB running..."
npx inngest-cli dev -u http://localhost:3000/api/inngest   # terminal 2
npm run dev          # terminal 3
```

Open [http://localhost:3000](http://localhost:3000).

### Troubleshooting

- **Sign-in/sign-up/watchlist/alerts failing with a connection error** → MongoDB isn't running. Run `npm run db:local` (or `npm run dev:all`).
- **Alerts never arrive by email, even though creating them works** → Inngest isn't connected. It's what actually checks alerts on a schedule and sends the email; without it, alerts just sit there. Run `inngest-cli dev -u http://localhost:3000/api/inngest` (or `npm run dev:all`).
- **`db:local` fails with a `DBPathInUse` / lock file error** → a previous session didn't shut down cleanly. Close any terminals still running the app, then delete `.local-mongo-data/mongod.lock` and try again. Your data isn't affected — this only clears a stale lock marker.
- **Local data persists** between restarts in `.local-mongo-data/` — nothing resets just because you closed the project.

### Environment variables

See `env.example` for the full list with descriptions (Finnhub, MongoDB, Better Auth, Gemini, Nodemailer, site URL). For local dev, `MONGODB_URI` should point at `mongodb://127.0.0.1:27017/stockdb` to match `db:local` — swap in a real MongoDB Atlas connection string only when you're ready to use a real cloud database.

## Deploy on Vercel

Set the same environment variables in your Vercel project (with real values — a real MongoDB Atlas URI, your production domain for `BETTER_AUTH_URL`/`NEXT_PUBLIC_SITE_URL`, etc.), and connect the [Inngest Vercel integration](https://www.inngest.com/docs/deploy/vercel) so scheduled functions (price alerts, market-data refresh, emails) actually run in production — without it, the code is correct but nothing ever triggers it.
