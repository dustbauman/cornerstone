# TYRIAN — Revenue Model V3
## Launch Growth Pricing Reference

> **Document type:** Product/business context for coding sessions
> **Status:** Active — replaces the previous $99/$299 founding and $299/$499/$799 tiered model
> **Last updated:** June 2026

## Current Model

TYRIAN needs lodge density before pricing complexity. The launch model is intentionally simple:

| Cohort | Slots | Signup | Recurring | Access |
|--------|-------|--------|-----------|--------|
| Founding Lodges | 1-5 | Free | Free for life | Unlimited members |
| Early Lodges | 6-10 | Free signup | $99/year | Unlimited members |
| Standard Lodges | 11+ | Normal signup | $99/year | Unlimited members |

Rules:

- The first five active launch lodges use `lodges.tier = 'founding'`.
- The next five active launch lodges use `lodges.tier = 'charter'`, but they are not lifetime-free.
- All later paid lodges use the existing size tier values only as operational labels; price is always $99/year.
- No $299, $499, or $799 lodge pricing remains in the active model.
- Member-count-based invite caps are removed for launch growth.

## Implementation Notes

Source files:

- `src/lib/pricing/constants.ts`
- `src/lib/pricing/founding.ts`
- `src/app/join/page.tsx`
- `src/app/join/confirm/page.tsx`
- `src/app/api/create-checkout/route.ts`
- `src/app/api/webhooks/stripe/route.ts`

Stripe:

- Create one recurring annual Stripe price for $99/year.
- Preferred env var: `STRIPE_PRICE_LODGE_ANNUAL`.
- Fallback env vars supported temporarily: `STRIPE_PRICE_STANDARD_ANNUAL`, then `STRIPE_PRICE_STANDARD`.
- Paid checkout sessions use `mode: 'subscription'`.
- Lifetime-free founding lodges skip Stripe and activate immediately.

Current DB compatibility:

- `tier = 'founding'` means lifetime-free founding lodge.
- `tier = 'charter'` means early lodge cohort at normal annual pricing.
- `tier in ('small', 'standard', 'large')` remains valid for existing operational flows, but no longer changes price or invite capacity.

## Messaging

| Audience | Message |
|----------|---------|
| First five lodges | "Founding Lodges are free for life." |
| Next five lodges | "Free signup, then normal $99/year platform access." |
| All later lodges | "$99/year for the whole lodge. Every member can join." |

## Follow-Up Hardening

- Add billing fields (`billing_model`, `subscription_status`, `current_period_end`, `stripe_subscription_id`) before enforcing annual renewal access.
- Store Stripe subscription IDs from `checkout.session.completed`.
- Add renewal reminder emails after subscription tracking exists.
- Add a DB-level slot allocator if concurrent founding signups become likely.

*TYRIAN · Revenue Model V3 · June 2026*
