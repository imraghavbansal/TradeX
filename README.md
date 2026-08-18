TradeX — a real-time stock market app built with Next.js, TradingView widgets, Finnhub market data, MongoDB, and scheduled alerts/emails via Inngest.

## Local Development

### First-time setup

```bash
npm install
cp env.example .env.local   # then fill in the real values (see below)
```

### Running the app

MongoDB is a real, always-on Atlas cluster (see `MONGODB_URI` in `.env.local`) — local dev doesn't depend on a local database process anymore. The app needs **two services running together**: the Next.js dev server and the Inngest scheduler (for price alerts, market-data refresh, and welcome/news emails).

**Easiest — one command, one terminal:**

```bash
npm run dev:all
```

This starts `next dev` and the Inngest dev server together (via `concurrently`), with color-coded, prefixed output. Press `Ctrl+C` once to stop both cleanly — no manual cleanup needed.

**Manual — two separate terminals**, if you want to run/restart pieces independently:

```bash
npx inngest-cli dev -u http://localhost:3000/api/inngest   # terminal 1
npm run dev                                                 # terminal 2
```

Open [http://localhost:3000](http://localhost:3000).

### Troubleshooting

- **Sign-in/sign-up/watchlist/alerts failing with a connection error** → the Atlas cluster is unreachable (paused from inactivity on the free tier, network access misconfigured, or the connection string is stale). Check [cloud.mongodb.com](https://cloud.mongodb.com) → the cluster is running, and Network Access allows `0.0.0.0/0`.
- **Alerts never arrive by email, even though creating them works** → Inngest isn't connected. It's what actually checks alerts on a schedule and sends the email; without it, alerts just sit there. Run `inngest-cli dev -u http://localhost:3000/api/inngest` (or `npm run dev:all`).
- **Want an isolated throwaway local database instead of touching real data** → `npm run db:local` still works (spins up an in-memory MongoDB persisted to `.local-mongo-data/`); swap `MONGODB_URI` in `.env.local` to point at it (see the comments in that file). If it fails with a `DBPathInUse` error, delete `.local-mongo-data/mongod.lock` and retry — your data isn't affected, that only clears a stale lock marker.

### Environment variables

See `env.example` for the full list with descriptions (Finnhub, MongoDB, Better Auth, Gemini, Nodemailer, site URL). `MONGODB_URI` should be a real MongoDB Atlas connection string, with Network Access set to allow connections from anywhere (`0.0.0.0/0`) — required both for local dev reliability and because Vercel's serverless functions have no fixed IP.

## Deploy on Vercel

Set the same environment variables in your Vercel project (with real values — a real MongoDB Atlas URI, your production domain for `BETTER_AUTH_URL`/`NEXT_PUBLIC_SITE_URL`, etc.), and connect the [Inngest Vercel integration](https://www.inngest.com/docs/deploy/vercel) so scheduled functions (price alerts, market-data refresh, emails) actually run in production — without it, the code is correct but nothing ever triggers it.
