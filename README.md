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
# Founding program (one-time) — create in Stripe dashboard
STRIPE_PRICE_PIONEER=              # $99 lifetime (slots 1–5)
STRIPE_PRICE_CHARTER=              # $299 lifetime (slots 6–10)
# Standard lodges (one-time until Phase 2 annual billing)
STRIPE_PRICE_STANDARD_SMALL=
STRIPE_PRICE_STANDARD=
STRIPE_PRICE_LARGE=
RESEND_API_KEY=
RESEND_FROM_EMAIL=hello@tyrian.work
CRON_SECRET=
# Maps Embed API — business listing location maps (see Google Cloud setup below)
NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY=
```

## Seed data

```bash
pnpm seed          # demo lodges, listings, requests into Supabase
pnpm seed:lodges   # FL/OK lodge directory from data/lodges/
```

Lodge reference data lives in `data/lodges/`. Product briefs are in `docs/briefs/`.

**Pricing:** Founding program (Pioneer $99 / Charter $299) is documented in `docs/briefs/tyrian-pricing-v2.md`. Annual standard billing is Phase 2 — see `docs/briefs/tyrian-pricing-phase2.md`.

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

## Database migrations

SQL migrations live in `scripts/migrations/`. After resetting or wiping Supabase data, re-apply any that are missing:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db query --linked -f scripts/migrations/010_lodge_coordinates.sql
```

The network page (`/network`) requires `010_lodge_coordinates.sql` (`lat` / `lng` on `lodges` and `lodge_directory`).

## Deploy

Linked to Vercel. Push to `main` to deploy. Stripe webhook endpoint: `/api/webhooks/stripe`.
