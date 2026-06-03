# Tyrian test suite

Automated coverage for launch-critical flows. No real emails are ever sent —
assertions check **database state** and **HTTP responses**. Stripe webhooks are
signed locally (no Stripe round-trip).

## Run everything

```bash
pnpm test
```

This starts a throwaway dev server on **:3100** (with `RESEND_API_KEY=''` and
dummy Stripe creds), runs every integration suite plus the Vitest tests, prints
an aggregate summary, and exits non-zero on any failure. If a server is already
listening on :3100 it is reused.

## Run pieces individually

```bash
# Pure-logic units + match-pros selection (no server needed; uses live dev DB)
pnpm test:unit
pnpm test:watch

# A single integration suite against a running server on :3100
TEST_BASE_URL=http://localhost:3100 \
  STRIPE_WEBHOOK_SECRET=whsec_tyrian_test_secret \
  node --env-file=.env.local scripts/test/suites/<name>.suite.mjs
```

## Layout

- `lib/harness.mjs` — shared infra: service-role + anon Supabase clients, the
  assertion helper (`createSuite`), uniquely-tagged fixtures, a cleanup registry,
  `@supabase/ssr` session-cookie minting, and `apiFetch` / Stripe-signing helpers.
- `suites/*.suite.mjs` — end-to-end suites hitting the running app:
  `smoke`, `signup`, `requests`, `admin-roles`, `stripe`, `security`.
- `unit/*.test.ts` — pure-logic Vitest (geo scoring, founding pricing, invite caps).
- `integration/match-pros.test.ts` — push-to-pro selection, asserted on the
  recipient count returned by `notifyMatchingPros` (delivery is stubbed).
- `run-all.mjs` — the orchestrator behind `pnpm test`.

## Data hygiene

Every fixture row is tagged `__test_<run>_…` and registered for teardown;
`cleanupAll()` deletes users, profiles, lodges, listings, requests, and responses
created during the run. Safe to run repeatedly against the dev DB.
