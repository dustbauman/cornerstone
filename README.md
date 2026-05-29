# Tyrian

Verified business network and request board for Freemasons. Built with Next.js 14, Supabase, Stripe, and Resend.

## Setup

```bash
pnpm install
cp .env.example .env.local   # fill in Supabase, Stripe, Resend keys
pnpm dev
```

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=hello@tyrian.work
CRON_SECRET=
```

## Seed data

```bash
pnpm seed          # demo lodges, listings, requests into Supabase
pnpm seed:lodges   # FL/OK lodge directory from data/lodges/
```

Lodge reference data lives in `data/lodges/`. Product briefs are in `docs/briefs/`.

## Project layout

```
data/lodges/          Seed JSON (Florida, Oklahoma lodge directories)
docs/briefs/          Active Tyrian build documentation
docs/archive/         Original Cornerstone demo briefs
scripts/              Database seed scripts
src/app/              Next.js App Router pages and API routes
src/components/       UI by domain (layout, directory, requests, lodge, admin)
src/lib/              Supabase, demo mode, email, DB helpers, constants
tools/                Local-only scrapers (gitignored)
```

## Deploy

Linked to Vercel. Push to `main` to deploy. Stripe webhook endpoint: `/api/webhooks/stripe`.
