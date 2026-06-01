# Tyrian — Pricing Phase 2: Annual Standard Billing

> **Prerequisite:** Phase 1 shipped (Pioneer $99 / Charter $299 founding program).
> **Source of truth:** [tyrian-pricing-v2.md](./tyrian-pricing-v2.md)

## Goal

When all 10 founding slots are filled, new lodges pay **annual** platform fees by member count — not the current one-time checkout. Founding lodges (`tier` = `founding` or `charter`) stay on lifetime access forever.

## Out of scope for Phase 2 (unless explicitly added)

- Re-pricing or billing existing founding lodges
- Premium add-ons on top of base tier
- Multi-lodge jurisdiction discounts

---

## Database migration

Add columns to `lodges` (names from V2 doc; adjust if schema evolves):

```sql
alter table lodges
  add column if not exists billing_model text
    check (billing_model in ('lifetime', 'annual')),
  add column if not exists annual_tier text
    check (annual_tier in ('small', 'mid', 'large')),
  add column if not exists current_period_end timestamptz,
  add column if not exists subscription_status text
    check (subscription_status in ('active', 'past_due', 'cancelled')),
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists founding_slot int
    check (founding_slot is null or (founding_slot >= 1 and founding_slot <= 10));
```

Backfill:

- `billing_model = 'lifetime'` where `tier in ('founding', 'charter')`
- `billing_model = 'annual'` is **not** required for existing one-time standard lodges until you migrate them or grandfather them — product decision needed

Optional: `founding_program_open` boolean in a `platform_config` table for marketing gates.

---

## Stripe

### Products / prices (annual)

| Env var | Amount |
|---------|--------|
| `STRIPE_PRICE_STANDARD_SMALL_ANNUAL` | $299/yr |
| `STRIPE_PRICE_STANDARD_MID_ANNUAL` | $499/yr |
| `STRIPE_PRICE_STANDARD_LARGE_ANNUAL` | $799/yr |

### Checkout changes (`app/api/create-checkout/route.ts`)

- When `resolveFoundingOffer()` returns `null`:
  - `mode: 'subscription'` (not `payment`)
  - Line item = annual price for selected size (`small` → small annual, etc.)
  - Metadata: `billing_model: 'annual'`, `annual_tier`

### Webhooks (`app/api/webhooks/stripe/route.ts`)

Handle in addition to `checkout.session.completed`:

| Event | Action |
|-------|--------|
| `checkout.session.completed` (subscription mode) | Activate lodge; set `stripe_subscription_id`, `current_period_end`, `subscription_status = 'active'` |
| `invoice.payment_succeeded` | Extend `current_period_end`; set `active` |
| `invoice.payment_failed` | `subscription_status = 'past_due'`; grace period (TBD: 7 vs 14 days) |
| `customer.subscription.deleted` | `cancelled`; revoke access per policy |

Founding signups: keep **one-time** `payment` mode only; never create a subscription.

---

## Access control

Add `src/lib/pricing/access.ts`:

```typescript
export function lodgeHasActiveAccess(lodge: Lodge): boolean {
  if (lodge.billing_model === 'lifetime' || lodge.tier === 'founding' || lodge.tier === 'charter') {
    return lodge.subscription_status !== 'cancelled' // or status === 'active'
  }
  if (lodge.billing_model === 'annual') {
    return lodge.subscription_status === 'active' && new Date(lodge.current_period_end) > new Date()
  }
  // Legacy one-time standard (pre-Phase-2): treat paid + active as access until migrated
  return lodge.status === 'active'
}
```

Wire into:

- Member join / invite acceptance (`canAcceptNewMember` path)
- Middleware or layout guards for lodge admin
- Optional cron to flag lodges nearing renewal

---

## UI / copy

| Surface | Change |
|---------|--------|
| `/join` | After founding full: show annual pricing (“$299/yr”, not “one-time”) |
| `/join/confirm` | Label “Annual platform fee”; show renewal terms |
| Admin | Renewal date, tier, link to Stripe Customer Portal |
| Emails | 60 / 30 / 7 day renewal reminders (open question in V2 doc) |

---

## Upgrade path for existing standard lodges

If lodges already paid one-time $299/$499/$799:

1. **Grandfather** — leave on lifetime one-time (simplest; no migration billing)
2. **Migrate** — set `billing_model = 'annual'` at first renewal date with notice

Document the choice in Terms of Service before flipping Phase 2 live.

---

## Race conditions (founding slots)

Phase 1 uses count-at-checkout + count-at-webhook. Phase 2 optional hardening:

- `founding_slot` unique partial index
- Transaction with `SELECT … FOR UPDATE` on slot counter row

---

## Test plan

- [ ] Founding slot 5 → Pioneer; slot 6 → Charter; slot 11 → annual subscription checkout
- [ ] Webhook renewal extends `current_period_end`
- [ ] `past_due` blocks new member joins (if product requires)
- [ ] Founding lodge with 200+ members: still unlimited, no annual charge
- [ ] Stripe Customer Portal cancels → access revoked after period end

---

## Files likely touched

```
scripts/migrations/013_billing_v2.sql
src/lib/pricing/access.ts
src/lib/pricing/constants.ts          # STANDARD annual cents
src/app/api/create-checkout/route.ts
src/app/api/webhooks/stripe/route.ts
src/app/join/page.tsx
src/app/join/confirm/page.tsx
src/lib/auth/admission.ts             # if access gated here
README.md                             # env vars
```

---

*Phase 2 brief · Tyrian · June 2026*
