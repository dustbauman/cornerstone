# TYRIAN — Revenue Model V2
## Pricing Strategy & Implementation Reference

> **Document type:** Product/business context for Claude Code sessions
> **Status:** Active — replaces V1 one-time fee model
> **Last updated:** June 2026

### Implementation status (engineering)

| Phase | Scope | Status |
|-------|--------|--------|
| **Phase 1** | Pioneer ($99) + Charter ($299) founding program; standard lodges remain **one-time** fees | **Shipped** — `src/lib/pricing/`, join/checkout/webhook |
| **Phase 2** | Annual Stripe subscriptions for slot 11+; renewal webhooks; access by `current_period_end` | **Planned** — see [tyrian-pricing-phase2.md](./tyrian-pricing-phase2.md) |

Code maps Pioneer → `lodges.tier = 'founding'`, Charter → `lodges.tier = 'charter'`.

---

## Overview

TYRIAN is a members-only business networking and service directory platform for verified Freemasons. Lodges pay a platform fee; all lodge members then access the platform as part of that lodge's account. This document defines the V2 revenue model, pricing tiers, and implementation requirements.

---

## Revenue Model: V1 → V2

### V1 (deprecated)
- One-time platform fee per lodge
- All lodge members join free for life after payment
- No recurring revenue

### V2 (current)
- **Founding Lodge Program** (first 10 lodges): lifetime access at a one-time fee, no annual renewal, ever
- **Standard Lodges** (slot 11+): annual fee, tiered by member count
- Founding lodges are permanently grandfathered — no future re-pricing applies to them

---

## Pricing Tiers

### Founding Lodge Program

| Tier | Slots | Price | Type | Members |
|------|-------|-------|------|---------|
| Tier I — Pioneer | 1–5 | $99 | One-time, lifetime | Unlimited |
| Tier II — Charter | 6–10 | $299 | One-time, lifetime | Unlimited |

**Rules:**
- Founding tiers fill sequentially: Tier I must be full before Tier II opens
- "Lifetime" = no annual fee, no renewal, permanent access as long as platform operates
- Founding status is tied to the lodge entity, not individual members
- Founding lodges receive a `is_founding: true` flag and `founding_tier: 'pioneer' | 'charter'` in the database

### Standard Annual Pricing

| Tier | Member Count | Price | Billing |
|------|-------------|-------|---------|
| Small | Up to 40 members | $299/yr | Annual |
| Mid | Up to 100 members | $499/yr | Annual |
| Large | 100+ members (unlimited) | $799/yr | Annual |

**Rules:**
- Member count is verified at time of signup and reviewed at each annual renewal
- If a lodge grows into a higher tier mid-year, they are billed the difference at next renewal (not mid-cycle)
- Standard pricing activates automatically once founding slots 1–10 are filled
- No grandfathering for standard lodges — pricing may change at renewal with 60-day notice

---

## Database Schema Requirements

### `lodges` table additions / fields to confirm

```sql
-- Founding program fields
is_founding          BOOLEAN DEFAULT false
founding_tier        TEXT CHECK (founding_tier IN ('pioneer', 'charter')) -- null if not founding
founding_slot        INTEGER -- 1–10, null if standard

-- Billing model
billing_model        TEXT CHECK (billing_model IN ('lifetime', 'annual')) NOT NULL
annual_tier          TEXT CHECK (annual_tier IN ('small', 'mid', 'large')) -- null if lifetime
member_cap           INTEGER -- 40, 100, or null (unlimited)

-- Renewal tracking
subscription_status  TEXT CHECK (subscription_status IN ('active', 'past_due', 'cancelled'))
current_period_end   TIMESTAMPTZ -- null for lifetime lodges
stripe_customer_id   TEXT
stripe_subscription_id TEXT -- null for lifetime lodges
```

### Business logic constants

```typescript
// pricing.constants.ts

export const FOUNDING_SLOTS_TOTAL = 10;
export const FOUNDING_TIER_1_SLOTS = 5;   // Pioneer: slots 1–5
export const FOUNDING_TIER_2_SLOTS = 5;   // Charter: slots 6–10

export const FOUNDING_PRICES = {
  pioneer: 9900,   // $99.00 in cents
  charter: 29900,  // $299.00 in cents
} as const;

export const STANDARD_PRICES = {
  small: {
    annualCents: 29900,   // $299/yr
    memberCap: 40,
  },
  mid: {
    annualCents: 49900,   // $499/yr
    memberCap: 100,
  },
  large: {
    annualCents: 79900,   // $799/yr
    memberCap: null,       // unlimited
  },
} as const;
```

---

## Enrollment Flow

### Founding Lodge Signup

1. Admin checks `SELECT COUNT(*) FROM lodges WHERE is_founding = true` to determine available slots
2. If slots 1–5 available → show Pioneer tier ($99, lifetime)
3. If slots 1–5 full, slots 6–10 available → show Charter tier ($299, lifetime)
4. If all 10 slots full → redirect to standard annual signup
5. On successful payment:
   - Set `is_founding = true`, `founding_tier`, `founding_slot` (next available)
   - Set `billing_model = 'lifetime'`
   - Set `subscription_status = 'active'`
   - `current_period_end = null` (never expires)
   - No Stripe subscription created — one-time payment charge only

### Standard Lodge Signup

1. Lodge selects tier based on their member count
2. Stripe subscription created with annual billing
3. Set `billing_model = 'annual'`, `annual_tier`, `member_cap`
4. `current_period_end` = 1 year from activation
5. Renewal handled via Stripe webhooks

---

## Access Control Logic

```typescript
// lodge-access.ts

export function lodgeHasActiveAccess(lodge: Lodge): boolean {
  if (lodge.billing_model === 'lifetime') {
    // Founding lodges: access never expires
    return lodge.subscription_status === 'active';
  }

  if (lodge.billing_model === 'annual') {
    // Standard lodges: check renewal date
    const now = new Date();
    const periodEnd = new Date(lodge.current_period_end);
    return lodge.subscription_status === 'active' && periodEnd > now;
  }

  return false;
}

export function lodgeIsAtMemberCap(lodge: Lodge, currentMemberCount: number): boolean {
  if (lodge.member_cap === null) return false; // unlimited (founding or Large tier)
  return currentMemberCount >= lodge.member_cap;
}
```

---

## Stripe Integration Notes

### One-time payments (founding lodges)
- Use `stripe.paymentIntents.create()` — NOT a subscription
- On `payment_intent.succeeded` webhook: activate lodge, set founding fields
- Store `stripe_customer_id` but no `stripe_subscription_id`

### Annual subscriptions (standard lodges)
- Use `stripe.subscriptions.create()` with `billing_cycle_anchor` and `interval: 'year'`
- Handle webhooks:
  - `invoice.payment_succeeded` → extend `current_period_end`, ensure `subscription_status = 'active'`
  - `invoice.payment_failed` → set `subscription_status = 'past_due'`, trigger grace period logic
  - `customer.subscription.deleted` → set `subscription_status = 'cancelled'`, revoke access

### Price IDs to create in Stripe dashboard
```
STRIPE_PRICE_PIONEER_ONETIME=price_xxxxx    // $99 one-time
STRIPE_PRICE_CHARTER_ONETIME=price_xxxxx    // $299 one-time
STRIPE_PRICE_STANDARD_SMALL_ANNUAL=price_xxxxx   // $299/yr
STRIPE_PRICE_STANDARD_MID_ANNUAL=price_xxxxx     // $499/yr
STRIPE_PRICE_STANDARD_LARGE_ANNUAL=price_xxxxx   // $799/yr
```

---

## Admin / Operator Notes

### Founding slot tracking
- Build an admin view that shows founding slot status: how many Pioneer and Charter slots remain
- Slot count must be real-time — race conditions are possible if two lodges sign up simultaneously; use a DB-level constraint or transaction lock

### Founding program close
- When `founding_slot = 10` is assigned, set a platform config flag `founding_program_open = false`
- This flag controls which signup flow is shown and can gate marketing messaging

### Grandfathering guarantee
- Document in your Terms of Service that founding lodge pricing is irrevocable
- Never apply tier upgrades or annual fees to founding lodges, regardless of member growth
- If founding lodge grows to 200+ members, they remain on lifetime with unlimited access — this is the deal

---

## Messaging Summary

| Audience | Key Message |
|----------|-------------|
| Tier I prospect | "$99 once, lifetime access. You're not a customer, you're a founding member." |
| Tier II prospect | "Pioneer slots are full. Charter is $299 — still lifetime, still no annual fee." |
| Standard prospect | "Starts at $299/yr — less than $8 per member per year." |
| General | "TYRIAN pays for itself the first time a member referral lands a job." |

---

## Open Questions

- [ ] Will founding lodges ever be charged for premium add-on features, or is "lifetime" truly all-inclusive?
- [ ] How is member count verified at renewal — self-reported by lodge secretary, or pulled from profile count?
- [ ] Grace period for `past_due` standard lodges — 7 days? 14?
- [ ] Do lodge admins get emailed 60/30/7 days before renewal?
- [ ] Is there a multi-lodge discount for grand lodges or jurisdictions managing multiple lodges?

---

*TYRIAN · Revenue Model V2 · June 2026*
