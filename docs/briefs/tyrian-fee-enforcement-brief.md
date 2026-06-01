# Tyrian — Lodge Member Count & Fee Enforcement Brief
## Addendum to Lodge Directory Prerequisite

This brief covers three things:
1. Adding member count data to the lodge directory
2. Surfacing that data as a soft nudge on the confirmation screen
3. Enforcing tier limits via invite caps with an upgrade path

---

## Part 1 — Schema additions

Run in Supabase SQL editor before building anything in this brief.

```sql
-- Add member count tracking to lodge_directory
alter table lodge_directory
  add column if not exists member_count        int,
  add column if not exists member_count_source text,
  add column if not exists member_count_updated_at timestamptz;

-- Add invite tracking to lodges table
alter table lodges
  add column if not exists invite_cap        int,
  add column if not exists invites_sent      int not null default 0;

-- Add upgrade tracking
alter table lodges
  add column if not exists original_tier     text,
  add column if not exists upgraded_at       timestamptz,
  add column if not exists upgrade_stripe_session_id text;

-- Index for fast invite cap lookups
create index if not exists lodges_invite_cap_idx on lodges(id, invite_cap, invites_sent);
```

### Invite cap values by tier

Set these when a lodge is activated in the Stripe webhook handler:

```typescript
const INVITE_CAPS: Record<string, number | null> = {
  founding:       null,   // unlimited — founding lodges get everything
  charter:        null,   // unlimited — early adopters get full access
  standard_small: 40,     // under 40 members
  standard:       100,    // 40–100 members
  large:          null,   // unlimited
}

// In webhook handler, after determining tier:
const inviteCap = INVITE_CAPS[tier] ?? null

await supabase.from('lodges').update({
  status: 'active',
  tier,
  invite_cap: inviteCap,
  original_tier: tier,
  invites_sent: 0,
  // ... other fields
}).eq('id', lodgeId)
```

---

## Part 2 — Scraping member counts from lodges.glflamason.org

The official FL Grand Lodge secretary portal has member counts per lodge.
The data is rendered by JavaScript, so it requires browser automation
(Claude in Chrome) rather than a plain HTTP fetch.

### What to capture per lodge

When viewing a lodge detail page on the official site, capture:
- Lodge name (for matching)
- Lodge number (primary key for matching to lodge_directory)
- Member count (labeled as "Members" or similar on the page)
- Date scraped

### Matching strategy

Match scraped lodges to `lodge_directory` rows using `number` as the key:

```typescript
// After scraping, update lodge_directory
const { error } = await supabase
  .from('lodge_directory')
  .update({
    member_count: scrapedCount,
    member_count_source: 'lodges.glflamason.org',
    member_count_updated_at: new Date().toISOString(),
  })
  .eq('number', lodgeNumber)
  .eq('state', 'FL')
```

### Fallback for missing counts

Not every lodge will have a count. Where `member_count` is null:
- Don't show the nudge on the confirmation screen
- Default to the member's self-reported size selection
- Flag for manual review in the admin panel

### Update script location

Save the scraped data as a SQL update script:
`scripts/update-fl-member-counts.sql`

Format:
```sql
update lodge_directory set 
  member_count = 87,
  member_count_source = 'lodges.glflamason.org',
  member_count_updated_at = now()
where number = '25' and state = 'FL';

update lodge_directory set
  member_count = 143,
  member_count_source = 'lodges.glflamason.org',
  member_count_updated_at = now()
where number = '41' and state = 'FL';

-- ... one row per lodge
```

Run this script in the Supabase SQL editor to populate counts.
Re-run periodically (annually) to keep counts current.

---

## Part 3 — Confirmation screen tier nudge

### Where it lives

`app/join/confirm/page.tsx` — the screen between the form and Stripe.

### Logic

When the page loads, fetch the `member_count` for the selected lodge
from `lodge_directory`. Compare it to the member's selected size tier.

```typescript
// Tier boundaries
const TIER_BOUNDARIES = {
  standard_small: { min: 0,   max: 39  },
  standard:       { min: 40,  max: 100 },
  large:          { min: 101, max: Infinity },
}

type NudgeType = 'none' | 'upgrade' | 'downgrade'

function getNudge(selectedSize: string, memberCount: number | null): NudgeType {
  if (!memberCount) return 'none'
  const boundary = TIER_BOUNDARIES[selectedSize as keyof typeof TIER_BOUNDARIES]
  if (!boundary) return 'none'
  if (memberCount > boundary.max) return 'upgrade'
  if (memberCount < boundary.min && selectedSize !== 'standard_small') return 'downgrade'
  return 'none'
}
```

### UI — upgrade nudge (selected tier too small)

Show below the lodge summary card, above the payment button.
Style: gold-faint background, gold left border — informational, not alarming.

```
┌─────────────────────────────────────────────────────────────┐
│ Based on Grand Lodge records, Tampa Lodge #25 has            │
│ approximately 87 registered members.                         │
│                                                              │
│ The Standard plan ($499) covers lodges up to 100 members     │
│ and is the right fit for your lodge.                         │
│                                                              │
│ ● Standard — $499     ← highlighted / pre-selected          │
│ ○ Small — $299        ← still selectable                     │
│ ○ Large — $799        ← still selectable                     │
│                                                              │
│ Not sure? You can always upgrade later — you'll only         │
│ pay the difference.                                          │
└─────────────────────────────────────────────────────────────┘
```

Implementation:
- When nudge type is 'upgrade': auto-select the recommended tier
  and update the displayed price
- The member can still click to a different tier — don't lock it
- If they override the suggestion, show a subtle note:
  "You've selected [tier]. Your lodge can invite up to [N] members."

### UI — no member count available

Don't show any nudge. The self-reported selection stands.
No message, no friction. Silent.

### Component

```tsx
// components/TierNudge.tsx

interface TierNudgeProps {
  memberCount: number | null
  selectedSize: string
  onTierChange: (size: string) => void
}

export function TierNudge({ memberCount, selectedSize, onTierChange }: TierNudgeProps) {
  const nudge = getNudge(selectedSize, memberCount)
  if (nudge === 'none' || !memberCount) return null

  const recommended = memberCount > 100 ? 'large' 
    : memberCount > 39 ? 'standard' 
    : 'standard_small'
  
  const recommendedLabel = recommended === 'large' ? 'Large ($799)'
    : recommended === 'standard' ? 'Standard ($499)'
    : 'Small ($299)'

  return (
    <div style={{
      background: '#FAF3E0',
      borderLeft: '3px solid #C9A84C',
      borderRadius: '0 8px 8px 0',
      padding: '14px 16px',
      marginBottom: '16px'
    }}>
      <p style={{
        fontSize: '13px', fontWeight: 500,
        color: '#1B2A4A', marginBottom: '6px'
      }}>
        Based on Grand Lodge records, your lodge has approximately{' '}
        <strong>{memberCount} registered members</strong>.
      </p>
      <p style={{
        fontSize: '13px', color: '#6B7280',
        marginBottom: '12px', lineHeight: 1.6
      }}>
        We've suggested <strong>{recommendedLabel}</strong> as the right fit.
        You can still choose any tier — if you hit your invite limit later,
        you can upgrade and only pay the difference.
      </p>

      {/* Tier selector */}
      {[
        { value: 'standard_small', label: 'Small', price: '$299', cap: '40 member invites' },
        { value: 'standard',       label: 'Standard', price: '$499', cap: '100 member invites' },
        { value: 'large',          label: 'Large', price: '$799', cap: 'Unlimited invites' },
      ].map(tier => (
        <label key={tier.value} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 10px', marginBottom: '4px',
          background: selectedSize === tier.value ? '#1B2A4A' : 'white',
          borderRadius: '6px', cursor: 'pointer',
          border: `1px solid ${selectedSize === tier.value ? '#1B2A4A' : '#E5E0D5'}`,
          transition: 'all 0.15s'
        }}>
          <input
            type="radio"
            name="lodge_size"
            value={tier.value}
            checked={selectedSize === tier.value}
            onChange={() => onTierChange(tier.value)}
            style={{ display: 'none' }}
          />
          <span style={{
            width: 14, height: 14, borderRadius: '50%',
            border: `2px solid ${selectedSize === tier.value ? '#C9A84C' : '#9CA3AF'}`,
            background: selectedSize === tier.value ? '#C9A84C' : 'transparent',
            flexShrink: 0
          }} />
          <span style={{
            fontSize: '13px', fontWeight: 500,
            color: selectedSize === tier.value ? 'white' : '#1B2A4A',
            flex: 1
          }}>
            {tier.label} — {tier.price}
          </span>
          <span style={{
            fontSize: '11px',
            color: selectedSize === tier.value ? 'rgba(255,255,255,0.6)' : '#9CA3AF'
          }}>
            {tier.cap}
          </span>
          {tier.value === recommended && (
            <span style={{
              fontSize: '10px', fontWeight: 600,
              background: '#C9A84C', color: '#1B2A4A',
              padding: '1px 7px', borderRadius: '10px'
            }}>
              Suggested
            </span>
          )}
        </label>
      ))}
    </div>
  )
}
```

---

## Part 4 — Invite cap enforcement

### Where it lives

`app/admin/page.tsx` — the invite tools section.

### Logic

Every time an invite is sent (bulk email, link shared, QR code scanned),
increment `lodges.invites_sent`. When it reaches `invite_cap`, block
further invites and show the upgrade prompt.

```typescript
// lib/invites.ts

export async function canSendInvite(lodgeId: string): Promise<{
  allowed: boolean
  remaining: number | null
  cap: number | null
}> {
  const { data: lodge } = await supabase
    .from('lodges')
    .select('invite_cap, invites_sent, tier')
    .eq('id', lodgeId)
    .single()

  if (!lodge) return { allowed: false, remaining: null, cap: null }

  // Unlimited tiers
  if (lodge.invite_cap === null) {
    return { allowed: true, remaining: null, cap: null }
  }

  const remaining = lodge.invite_cap - lodge.invites_sent
  return {
    allowed: remaining > 0,
    remaining,
    cap: lodge.invite_cap
  }
}

export async function recordInviteSent(lodgeId: string, count = 1) {
  await supabase.rpc('increment_invites_sent', {
    lodge_id: lodgeId,
    amount: count
  })
}
```

Add the Postgres function:
```sql
create or replace function increment_invites_sent(lodge_id uuid, amount int)
returns void as $$
  update lodges
  set invites_sent = invites_sent + amount
  where id = lodge_id;
$$ language sql;
```

### Admin panel — invite section UI states

**State 1: Invites available (plenty remaining)**
```
Invite members to your lodge

[Bulk email]  [Copy link]  [QR Code]

37 of 100 invites used
```

**State 2: Invites running low (under 20% remaining)**
```
Invite members to your lodge

[Bulk email]  [Copy link]  [QR Code]

⚠  85 of 100 invites used · 15 remaining

Reaching your limit? Upgrade to Large for unlimited invites.
[Upgrade — pay $300 more →]
```

**State 3: Invite cap reached**
```
⚠  Your lodge has reached its 100-member invite limit.

To invite more brothers, upgrade your plan. You'll only
be charged the difference from your original payment.

[Upgrade to Large — pay $300 more →]  ($799 - $499 = $300)

[Bulk email — disabled]  [Copy link — disabled]  [QR Code — disabled]
```

The invite link and QR code should also stop working at the database level —
when someone hits the join link and the lodge is at cap, show:

```
This lodge has reached its current member limit.

If you're a member of [Lodge Name], ask your lodge admin
to upgrade the lodge's plan to continue adding members.
```

---

## Part 5 — Upgrade flow

### Route: `app/admin/upgrade/page.tsx`

Simple page. Show current tier, available upgrades, difference pricing.

```
Your current plan: Standard ($499)
────────────────────────────────────────────────────────────

Upgrade to Large
  Unlimited member invites
  Lodge analytics dashboard
  Priority placement on the Network page
  Dedicated onboarding support

  You've already paid $499.
  Upgrade price: $300 (the difference only)

  [Upgrade now — $300 →]  → creates Stripe checkout for $300
```

### Stripe checkout for upgrades

In `app/api/create-checkout/route.ts`, add an upgrade mode:

```typescript
// Upgrade pricing — charge only the difference
const UPGRADE_PRICES = {
  standard_small_to_standard: 200,  // $299 → $499
  standard_small_to_large:    500,  // $299 → $799
  standard_to_large:          300,  // $499 → $799
}
```

Create a one-time Stripe price dynamically for the difference amount
(or pre-create these as Stripe products).

In the webhook, on `checkout.session.completed` for an upgrade:
```typescript
// Update lodge tier and reset invite cap
await supabase.from('lodges').update({
  tier: newTier,
  invite_cap: null,  // large = unlimited
  upgraded_at: new Date().toISOString(),
  upgrade_stripe_session_id: session.id,
}).eq('id', lodgeId)
```

---

## Files to create or modify

```
New:
  components/TierNudge.tsx              ← Tier suggestion on confirm screen
  lib/invites.ts                        ← Invite cap helpers
  app/admin/upgrade/page.tsx            ← Upgrade flow
  app/api/create-upgrade-checkout/route.ts  ← Stripe session for upgrades
  scripts/update-fl-member-counts.sql   ← Populated after scraping (see below)

Modified:
  app/join/confirm/page.tsx             ← Add TierNudge component
  app/api/create-checkout/route.ts      ← Set invite_cap on lodge creation
  app/api/webhooks/stripe/route.ts      ← Set invite_cap on activation
  app/join/[lodge-slug]/page.tsx        ← Cap check before showing invite tools
  app/admin/page.tsx                    ← Invite count display + cap UI states
```

---

## Scraping session — what to do when Claude in Chrome is ready

When the extension has permission to access lodges.glflamason.org:

1. Navigate to the lodge search page
2. Check network requests to find the API endpoint (likely a JSON API)
3. If there's a clean API: loop through lodge numbers 1–450, fetch each,
   extract member count, write to SQL update script
4. If DOM-only: search by district (FL has ~20 districts), extract the
   table rows from each district's results, write to SQL update script
5. Output: `scripts/update-fl-member-counts.sql` with one UPDATE per lodge

The scraping session can happen independently of the rest of this build.
The `TierNudge` component gracefully handles null `member_count` — it just
doesn't show. Build the enforcement first, populate the data when ready.

---

## Verification checklist

```
Schema:
  [ ] member_count column added to lodge_directory
  [ ] invite_cap and invites_sent columns added to lodges
  [ ] increment_invites_sent Postgres function created

Tier nudge:
  [ ] TierNudge shows when member_count is available and tier mismatch exists
  [ ] TierNudge does NOT show when member_count is null
  [ ] Clicking a different tier in the nudge updates the price on confirm screen
  [ ] "Suggested" badge appears on the recommended tier
  [ ] Stripe session uses the member's final selected tier (not the suggested one)

Invite cap:
  [ ] invite_cap set correctly per tier on lodge activation
  [ ] founding and charter lodges get null (unlimited)
  [ ] invites_sent increments correctly on each invite action
  [ ] Admin panel shows invite count and remaining
  [ ] Low-count warning shows under 20% remaining
  [ ] Invite tools disabled at cap — UI and database level
  [ ] Join link shows friendly cap message when lodge is full

Upgrade flow:
  [ ] Upgrade page shows correct difference pricing
  [ ] Stripe checkout created for difference amount only
  [ ] Webhook correctly updates tier and removes invite cap on upgrade
  [ ] Admin panel reflects new tier immediately after upgrade
```

---

*Member count & fee enforcement brief — addendum to lodge directory prereq.*
*Build TierNudge and invite cap before launch. Scrape member counts when*
*Claude in Chrome has permission to lodges.glflamason.org.*
