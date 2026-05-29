# Tyrian — Day 3 Build Brief (Revised)
## Lodge Signup + Stripe — Complete Implementation

> ⚠️ **PREREQUISITE:** The lodge directory must be seeded before building
> `app/join/page.tsx`. Complete `tyrian-lodge-directory-prereq.md` in full
> and verify its checklist passes before writing any code in this brief.
> The `LodgeSearch` component from that brief is used directly in this page.

This is a full replacement of the original Day 3 brief. It includes everything from the original plus critical edge case handling that must be built now, not patched later. Read the entire document before writing a single line of code.

---

## Goal

Lodge fee payment works end-to-end in Stripe test mode. Lodge unlocks. Claim code issued. Every real-world edge case is handled gracefully — duplicate lodges, wrong data entry, unclaimed codes, race conditions on founding slots.

**Day 3 is done when:**
- Stripe test checkout completes end-to-end
- Lodge cannot be created twice (duplicate prevention works)
- Confirmation screen shows before payment
- Founding tier is assigned server-side, not client-side
- Claim code email arrives via Resend
- Claim code expires after 30 days
- Admin can claim the lodge and land on the admin panel
- "Resend claim code" flow works for lost codes
- Lodge lookup on `/join` prevents duplicate payments

---

## Schema additions — run these before writing any app code

These additions are required on top of the schema from the main roadmap. Run them in the Supabase SQL editor now.

```sql
-- ─── UNIQUE CONSTRAINT — prevent duplicate lodges ──────────────
-- A lodge number + state combination must be unique.
-- This is the database-level guarantee that no lodge can be 
-- created twice, even under race conditions.
alter table lodges 
  add constraint lodges_unique_number_state unique (number, state);

-- ─── CLAIM CODE EXPIRY ─────────────────────────────────────────
alter table lodges 
  add column claim_code_expires_at timestamptz,
  add column claim_code_claimed_at timestamptz,
  add column claim_code_claimed_by uuid references profiles(id),
  add column reminder_7_sent_at timestamptz,
  add column reminder_25_sent_at timestamptz;

-- ─── PAYER INFO ────────────────────────────────────────────────
-- Already have paid_by_email but add name for resend claim flow
alter table lodges
  add column paid_by_name text;

-- ─── FOUNDING SLOT COUNTER ─────────────────────────────────────
-- Used server-side in webhook to assign founding tier.
-- Never trust the frontend for this.
-- No schema change needed — count from existing tier column.
-- But add an index for fast counting:
create index lodges_tier_idx on lodges(tier);
create index lodges_status_tier_idx on lodges(status, tier);
```

---

## Environment variables — confirm these exist in `.env.local`

```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=hello@tyrian.work
NEXT_PUBLIC_APP_URL=http://localhost:3000   # or Vercel URL
NEXT_PUBLIC_FOUNDING_LODGE_LIMIT=10         # total founding slots
```

---

## Stripe price IDs — create these in Stripe dashboard first

Before writing code, create five one-time prices in Stripe test mode:

| Name | Amount | Store as env var |
|---|---|---|
| Founding Lodge | $1.00 | `STRIPE_PRICE_FOUNDING` |
| Charter Lodge | $299.00 | `STRIPE_PRICE_CHARTER` |
| Standard Small (under 40) | $299.00 | `STRIPE_PRICE_STANDARD_SMALL` |
| Standard (40–100) | $499.00 | `STRIPE_PRICE_STANDARD` |
| Large Lodge (100+) | $799.00 | `STRIPE_PRICE_LARGE` |

Add all five as environment variables. Never hardcode price IDs in app code.

---

## Page 1: Lodge lookup + signup — `app/join/page.tsx`

This page has **two distinct states** — lookup first, form second. Do not render the signup form until the user has confirmed their lodge is not already on the platform.

### State 1: Lodge lookup (default on page load)

```
Header:
  H1: "Unlock Tyrian for your lodge"
  Sub: "First, let's check if your lodge is already on the platform."

Lookup form:
  Lodge number input  (text, e.g. "123")
  State select        (all 50 US states)
  [Check my lodge →]  button

Loading state: "Checking..." with a subtle spinner
```

**On submit — two outcomes:**

**Outcome A — Lodge found (status = 'active'):**
```
Card:
  ✓ [Lodge Name] #[Number] · [State] is already on Tyrian.

  Your lodge admin can send you an invite link, or ask them
  to add you from the lodge admin panel.

  Already have an invite link?  [Join your lodge →]  (/join/[lodge-slug])
  Questions?  [Contact support →]

  Do NOT show the signup form. Do NOT allow another payment.
```

**Outcome B — Lodge found (status = 'pending' — payment in progress):**
```
Card:
  ⚠  Someone from [Lodge Name] #[Number] started the signup 
  process recently. If that was you, check your email for 
  a receipt and claim code.

  If you need help, [contact support →]

  Do NOT allow another payment.
```

**Outcome C — Lodge not found:**
```
"Your lodge isn't on Tyrian yet. You can be the one to unlock it."
→ Reveal the signup form (State 2) with a smooth transition.
   Pre-fill lodge number and state from the lookup inputs.
```

**Outcome D — Lookup error / network failure:**
```
"Couldn't check right now. You can proceed with signup — 
we'll catch any duplicates before payment goes through."
→ Reveal the signup form anyway. The server-side duplicate 
  check in create-checkout is the real safety net.
```

---

### State 2: Signup form (only shown after lookup returns "not found")

```
Fields:
  Lodge name          (text, required)
  Lodge number        (text, pre-filled from lookup, required)
  State               (select, pre-filled from lookup, required)
  Lodge size          (radio or select):
    ○ Under 40 members    — $299
    ○ 40–100 members      — $499  ← default selected
    ○ 100+ members        — $799

Dynamic price display:
  "One-time platform fee: $499"
  Updates immediately when size selection changes.

Founding lodge callout (show only if founding slots remain):
  ┌─────────────────────────────────────────────────────┐
  │ ⭐ Founding Lodge pricing available                  │
  │ Only [N] of 10 founding slots remain. Founding      │
  │ lodges pay $1 and receive permanent recognition      │
  │ and locked-in pricing forever.                       │
  └─────────────────────────────────────────────────────┘
  Note: Do NOT show this if founding slots are full (N = 0).
  The $1 price will be applied automatically server-side
  if slots are available — do not show a separate price for it.
  Just show the callout, keep the regular price displayed.
  Server decides the actual tier.

Your name (text, required) — for claim code email personalization
Your email (email, required) — where the claim code gets sent

Membership confirmation checkbox (required to proceed):
  ☐ I confirm I am a current dues-paying member of 
    [lodge name] in good standing.

[Continue to Payment →] button
  → Disabled until all fields are filled and checkbox is checked
  → On click: navigate to /join/confirm with form data in state
    (do NOT submit to Stripe yet — confirmation screen comes next)
```

---

## Page 2: Confirmation screen — `app/join/confirm/page.tsx`

This screen sits between the form and Stripe checkout. It is not optional.

```
Header: "Confirm your lodge details"
Sub: "Please review before completing payment."

Summary card:
  ┌─────────────────────────────────────────────────────┐
  │ Lodge name:    Acacia Lodge                          │
  │ Lodge number:  #123                                  │
  │ State:         Oklahoma                              │
  │ Lodge size:    40–100 members                        │
  │ ─────────────────────────────────────────────────── │
  │ Platform fee:  $499 (one-time)                       │
  │ ─────────────────────────────────────────────────── │
  │ Claim code sent to: robert@email.com                 │
  └─────────────────────────────────────────────────────┘

Two buttons:
  [← Edit details]     → back to /join (pre-fill form with existing values)
  [Complete Payment →] → POST to /api/create-checkout, redirect to Stripe
```

If user navigates back from Stripe after starting checkout (browser back button), return them to this confirmation screen, not the form.

---

## API Route 1: Create checkout — `app/api/create-checkout/route.ts`

```typescript
// POST /api/create-checkout
// Body: { lodgeName, lodgeNumber, state, size, payerName, payerEmail }

export async function POST(request: Request) {
  const body = await request.json()
  const { lodgeName, lodgeNumber, state, size, payerName, payerEmail } = body

  // ── STEP 1: Validate inputs ─────────────────────────────────
  if (!lodgeName || !lodgeNumber || !state || !size || !payerEmail) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // ── STEP 2: Duplicate check (server-side safety net) ────────
  // Even though the frontend lookup should catch this, always
  // re-check server-side. Race conditions are real.
  const { data: existingLodge } = await supabase
    .from('lodges')
    .select('id, status, name')
    .eq('number', lodgeNumber)
    .eq('state', state)
    .single()

  if (existingLodge) {
    if (existingLodge.status === 'active') {
      return Response.json({ 
        error: 'LODGE_ALREADY_EXISTS',
        message: `${existingLodge.name} is already on Tyrian.`
      }, { status: 409 })
    }
    if (existingLodge.status === 'pending') {
      return Response.json({ 
        error: 'LODGE_PAYMENT_PENDING',
        message: 'A payment for this lodge is already in progress.'
      }, { status: 409 })
    }
  }

  // ── STEP 3: Create pending lodge record ─────────────────────
  const { data: lodge, error: lodgeError } = await supabase
    .from('lodges')
    .insert({
      name: lodgeName,
      number: lodgeNumber,
      state: state,
      city: '',           // filled in by admin during setup
      status: 'pending',
      tier: 'standard',   // will be updated in webhook
      paid_by_email: payerEmail,
      paid_by_name: payerName,
    })
    .select()
    .single()

  if (lodgeError) {
    // Handle unique constraint violation as a final safety net
    if (lodgeError.code === '23505') {
      return Response.json({ 
        error: 'LODGE_ALREADY_EXISTS',
        message: 'This lodge is already registered.'
      }, { status: 409 })
    }
    return Response.json({ error: 'Failed to create lodge' }, { status: 500 })
  }

  // ── STEP 4: Determine price ID ──────────────────────────────
  // NOTE: Founding tier is NOT assigned here — that happens in 
  // the webhook after payment confirms. We always charge the 
  // size-based price at checkout. If founding slots are available,
  // the webhook will override the tier and refund is not needed
  // because we charge $1 for founding anyway.
  // 
  // REVISED APPROACH: Check founding slots here to determine
  // which price to show. Use a database transaction to prevent
  // race conditions.
  
  const { count: foundingCount } = await supabase
    .from('lodges')
    .select('*', { count: 'exact', head: true })
    .eq('tier', 'founding')
    .eq('status', 'active')

  const foundingLimit = parseInt(process.env.NEXT_PUBLIC_FOUNDING_LODGE_LIMIT || '10')
  const isFoundingEligible = (foundingCount || 0) < foundingLimit

  // Price selection logic
  let priceId: string
  if (isFoundingEligible) {
    priceId = process.env.STRIPE_PRICE_FOUNDING!
  } else {
    const priceMap: Record<string, string> = {
      'small':    process.env.STRIPE_PRICE_STANDARD_SMALL!,
      'standard': process.env.STRIPE_PRICE_STANDARD!,
      'large':    process.env.STRIPE_PRICE_LARGE!,
    }
    priceId = priceMap[size] || process.env.STRIPE_PRICE_STANDARD!
  }

  // ── STEP 5: Create Stripe checkout session ──────────────────
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      lodge_id: lodge.id,
      lodge_name: lodgeName,
      lodge_number: lodgeNumber,
      lodge_state: state,
      lodge_size: size,
      payer_email: payerEmail,
      payer_name: payerName,
      is_founding_eligible: String(isFoundingEligible),
    },
    customer_email: payerEmail,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/join/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/join/confirm`,
    // Allow up to 2 hours to complete payment
    expires_at: Math.floor(Date.now() / 1000) + (2 * 60 * 60),
  })

  return Response.json({ url: session.url })
}
```

---

## API Route 2: Stripe webhook — `app/api/webhooks/stripe/route.ts`

```typescript
// POST /api/webhooks/stripe
// This is where lodge activation actually happens.
// NEVER trust the frontend for tier assignment — always do it here.

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  // ── STEP 1: Verify Stripe signature — DO NOT SKIP ───────────
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body, signature, process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // ── STEP 2: Handle checkout.session.completed ────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.CheckoutSession
    const meta = session.metadata!

    const lodgeId = meta.lodge_id
    const payerEmail = meta.payer_email
    const payerName = meta.payer_name

    // ── STEP 3: Assign tier — server-side, race-condition safe ─
    // Count current active founding lodges at the moment of 
    // payment confirmation. This is the authoritative count.
    const { count: foundingCount } = await supabase
      .from('lodges')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'founding')
      .eq('status', 'active')

    const foundingLimit = parseInt(process.env.NEXT_PUBLIC_FOUNDING_LODGE_LIMIT || '10')
    const tier = (foundingCount || 0) < foundingLimit ? 'founding' : 'charter'
    // Note: 'charter' here means early adopter pricing. After 30 lodges
    // total, the tier assignment logic should be updated to 'standard'.
    // For now, all paying lodges are either founding or charter.

    // ── STEP 4: Generate claim code ─────────────────────────────
    // Format: 3 uppercase letters + hyphen + 4 digits
    // e.g. "ACE-4471"
    // Generate until unique (collision is extremely unlikely but check anyway)
    let claimCode: string
    let codeIsUnique = false
    let attempts = 0

    while (!codeIsUnique && attempts < 10) {
      const letters = Array.from({ length: 3 }, () => 
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
      ).join('')
      const digits = String(Math.floor(1000 + Math.random() * 9000))
      claimCode = `${letters}-${digits}`

      const { data: existing } = await supabase
        .from('lodges')
        .select('id')
        .eq('claim_code', claimCode)
        .single()

      if (!existing) codeIsUnique = true
      attempts++
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // ── STEP 5: Activate lodge ───────────────────────────────────
    const { error: updateError } = await supabase
      .from('lodges')
      .update({
        status: 'active',
        tier: tier,
        paid_at: new Date().toISOString(),
        claim_code: claimCode!,
        claim_code_expires_at: expiresAt.toISOString(),
        stripe_session_id: session.id,
      })
      .eq('id', lodgeId)

    if (updateError) {
      console.error('Failed to activate lodge:', updateError)
      // Return 200 anyway — Stripe will retry on non-200 responses
      // Log this for manual review
      return Response.json({ received: true })
    }

    // ── STEP 6: Send claim code email ────────────────────────────
    // See email template below
    await sendLodgeClaimEmail({
      to: payerEmail,
      payerName: payerName,
      lodgeName: meta.lodge_name,
      lodgeNumber: meta.lodge_number,
      claimCode: claimCode!,
      tier: tier,
      expiresAt: expiresAt,
    })
  }

  // Always return 200 to Stripe
  return Response.json({ received: true })
}
```

---

## API Route 3: Lodge lookup — `app/api/lodge-lookup/route.ts`

```typescript
// GET /api/lodge-lookup?number=123&state=OK

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const number = searchParams.get('number')?.trim()
  const state = searchParams.get('state')?.trim()

  if (!number || !state) {
    return Response.json({ found: false })
  }

  const { data: lodge } = await supabase
    .from('lodges')
    .select('id, name, number, state, status')
    .eq('number', number)
    .eq('state', state)
    .single()

  if (!lodge) {
    return Response.json({ found: false })
  }

  return Response.json({ 
    found: true,
    status: lodge.status,
    name: lodge.name,
    number: lodge.number,
    state: lodge.state,
  })
}
```

---

## API Route 4: Resend claim code — `app/api/resend-claim/route.ts`

```typescript
// POST /api/resend-claim
// Body: { email }
// Finds any active lodge paid by this email and resends the claim code.

export async function POST(request: Request) {
  const { email } = await request.json()

  if (!email) {
    return Response.json({ error: 'Email required' }, { status: 400 })
  }

  const { data: lodge } = await supabase
    .from('lodges')
    .select('*')
    .eq('paid_by_email', email.toLowerCase())
    .eq('status', 'active')
    .is('claim_code_claimed_at', null)   // only unclaimed lodges
    .single()

  // Always return the same response whether or not we found a lodge.
  // This prevents email enumeration.
  if (lodge) {
    // Check if code is expired
    const isExpired = lodge.claim_code_expires_at && 
      new Date(lodge.claim_code_expires_at) < new Date()

    if (isExpired) {
      // Generate a new code and reset expiry
      const letters = Array.from({ length: 3 }, () =>
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
      ).join('')
      const digits = String(Math.floor(1000 + Math.random() * 9000))
      const newCode = `${letters}-${digits}`
      const newExpiry = new Date()
      newExpiry.setDate(newExpiry.getDate() + 30)

      await supabase
        .from('lodges')
        .update({ 
          claim_code: newCode,
          claim_code_expires_at: newExpiry.toISOString()
        })
        .eq('id', lodge.id)

      lodge.claim_code = newCode
      lodge.claim_code_expires_at = newExpiry.toISOString()
    }

    await sendLodgeClaimEmail({
      to: email,
      payerName: lodge.paid_by_name || 'Brother',
      lodgeName: lodge.name,
      lodgeNumber: lodge.number,
      claimCode: lodge.claim_code,
      tier: lodge.tier,
      expiresAt: new Date(lodge.claim_code_expires_at),
    })
  }

  return Response.json({ 
    message: 'If an active lodge is associated with this email, the claim code has been resent.'
  })
}
```

---

## Page 3: Success page — `app/join/success/page.tsx`

```
Header:
  ✓ [Lodge Name] #[Number] is now on Tyrian.

  [If founding tier]:
    ⭐ You're a Founding Lodge — one of the first 10 nationally.
    Your lodge will carry the Founding Lodge designation permanently.

Claim code display (prominent, copyable):
  ┌──────────────────────────────────┐
  │  Your lodge claim code           │
  │                                  │
  │    ACE-4471                      │  ← large, monospace font
  │                                  │
  │  [Copy to clipboard]             │
  │  Expires in 30 days              │
  └──────────────────────────────────┘

Instructions:
  "This code unlocks your lodge's admin access on Tyrian.
   Forward it to your Worshipful Master or Secretary, or
   claim admin yourself if that's you."

Two CTAs:
  [Claim Admin Access →]   → /claim
  [Share via email]        → mailto: with pre-filled subject/body

Footer note:
  "We've also sent this code to [payer email]. 
   Can't find the email? [Resend it →] links to /claim#resend"
```

---

## Page 4: Claim page — `app/claim/page.tsx`

Two sections on this page: the claim form and the resend form.

### Section A: Claim admin access

```
H1: "Claim your lodge admin access"
Sub: "Enter the claim code from your payment confirmation email."

Form:
  Claim code input  (text, e.g. "ACE-4471", auto-uppercase)
  [Claim Access →]  button

Validation:
  - Code not found: "That code doesn't match any lodge. 
    Double-check the code or resend it below."
  - Code expired: "This code has expired. Enter the email 
    used at payment below to receive a new one."
  - Code already claimed: "This lodge has already been claimed. 
    If you need admin access, contact your lodge admin or 
    [reach out to support →]."
  - Code valid: proceed with auth flow below

Auth flow:
  If logged in:
    → Update profiles.is_lodge_admin = true
    → Update profiles.lodge_id = lodge.id
    → Update lodges.claim_code_claimed_at = now()
    → Update lodges.claim_code_claimed_by = profile.id
    → Redirect to /admin with ?onboarding=true

  If not logged in:
    → Store claim code in sessionStorage
    → Redirect to /login with ?redirect=/claim&code=[code]
    → After magic link auth and return to /claim, 
      auto-apply stored code without re-entering

Success state:
  "You're now the admin for [Lodge Name] #[Number].
   Let's get your lodge set up."
  [Go to Lodge Admin →]  → /admin?onboarding=true
```

### Section B: Resend claim code (anchor: `#resend`)

```
Divider: "─── Lost your claim code? ───"

"Enter the email address you used when you paid the lodge fee.
 We'll resend the code if we find an active lodge."

Form:
  Email input
  [Resend Code →]  → POST /api/resend-claim

Success state (shown regardless of whether email was found):
  "If we have an active lodge for that email, the claim 
   code is on its way. Check your inbox and spam folder."
```

---

## Email templates

### 1. Lodge claim code email (`emails/lodge-claim-code.tsx`)

**Subject:** `Your lodge claim code for Tyrian — [LODGE-CODE]`

```
Hi [PayerName],

[Lodge Name] #[Number] is now on Tyrian.

[IF FOUNDING]:
You've secured one of 10 Founding Lodge designations. 
This status is permanent and will appear on your lodge page 
and every member's verified profile.

Your lodge admin claim code:

    [ACE-4471]

This code gives whoever uses it full admin access to your lodge 
on Tyrian. Forward it to your Worshipful Master or Secretary, 
or use it yourself if you're claiming admin.

[Claim Admin Access →]   (links to /claim?code=ACE-4471)

This code expires in 30 days ([expiry date]).

---
Not sure what to do next? Here's the short version:
1. Forward this code to your Worshipful Master or Secretary
2. They click "Claim Admin Access" above and sign in
3. They invite lodge members via email, link, or QR code

Questions? Reply to this email.

Built on trust. Proven by the craft.
Tyrian · tyrian.work
```

### 2. Claim code reminder — day 7 (`emails/claim-reminder-7.tsx`)

**Subject:** `Your Tyrian claim code expires in 23 days — [LODGE NAME]`

```
Hi [PayerName],

Just a reminder — [Lodge Name] #[Number] is on Tyrian but 
admin access hasn't been claimed yet.

Your claim code: [ACE-4471]
Expires: [expiry date]

[Claim Admin Access →]

Once admin is claimed, you can start inviting members and 
the lodge directory will go live.

[Resend or share the code →]   (links to /join/success or /claim)
```

### 3. Claim code reminder — day 25 (`emails/claim-reminder-25.tsx`)

**Subject:** `Your Tyrian claim code expires in 5 days — action needed`

```
Hi [PayerName],

Your lodge claim code for [Lodge Name] #[Number] expires 
in 5 days on [expiry date].

After that, you'll need to contact support to get a new one.

Your claim code: [ACE-4471]

[Claim Admin Access →]   [Resend the code →]
```

---

## Cron jobs — `app/api/cron/lodge-reminders/route.ts`

Wire as a Vercel Cron job running daily at 9am.

```typescript
// GET /api/cron/lodge-reminders
// Protected with CRON_SECRET header

export async function GET(request: Request) {
  // Verify this is called by Vercel Cron, not the public
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // ── Day 7 reminders ─────────────────────────────────────────
  const day7Threshold = new Date(now)
  day7Threshold.setDate(day7Threshold.getDate() - 7)

  const { data: day7Lodges } = await supabase
    .from('lodges')
    .select('*')
    .eq('status', 'active')
    .is('claim_code_claimed_at', null)
    .is('reminder_7_sent_at', null)
    .lt('paid_at', day7Threshold.toISOString())
    .gt('claim_code_expires_at', now.toISOString())  // not yet expired

  for (const lodge of day7Lodges || []) {
    await sendClaimReminder7(lodge)
    await supabase
      .from('lodges')
      .update({ reminder_7_sent_at: now.toISOString() })
      .eq('id', lodge.id)
  }

  // ── Day 25 reminders ─────────────────────────────────────────
  const day25Threshold = new Date(now)
  day25Threshold.setDate(day25Threshold.getDate() - 25)

  const { data: day25Lodges } = await supabase
    .from('lodges')
    .select('*')
    .eq('status', 'active')
    .is('claim_code_claimed_at', null)
    .is('reminder_25_sent_at', null)
    .lt('paid_at', day25Threshold.toISOString())
    .gt('claim_code_expires_at', now.toISOString())

  for (const lodge of day25Lodges || []) {
    await sendClaimReminder25(lodge)
    await supabase
      .from('lodges')
      .update({ reminder_25_sent_at: now.toISOString() })
      .eq('id', lodge.id)
  }

  return Response.json({ 
    day7Sent: day7Lodges?.length || 0,
    day25Sent: day25Lodges?.length || 0
  })
}
```

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/lodge-reminders",
    "schedule": "0 9 * * *"
  }]
}
```

Add `CRON_SECRET` to environment variables — a long random string.

---

## Files to create or modify — complete list for Day 3

```
New files:
  app/join/page.tsx                       ← Lookup + signup form
  app/join/confirm/page.tsx               ← Confirmation screen
  app/join/success/page.tsx               ← Post-payment success
  app/claim/page.tsx                      ← Claim + resend form
  app/api/create-checkout/route.ts        ← Stripe session creation
  app/api/webhooks/stripe/route.ts        ← Stripe webhook handler
  app/api/lodge-lookup/route.ts           ← Lodge lookup endpoint
  app/api/resend-claim/route.ts           ← Resend claim code
  app/api/cron/lodge-reminders/route.ts   ← Daily reminder cron
  emails/lodge-claim-code.tsx             ← Claim code email
  emails/claim-reminder-7.tsx             ← Day 7 reminder
  emails/claim-reminder-25.tsx            ← Day 25 reminder
  vercel.json                             ← Cron schedule

Modified files:
  app/admin/page.tsx                      ← Existing stub, wire to DB
                                            Add ?onboarding=true state
                                            showing setup checklist
```

---

## Verification checklist — Day 3 is done when all of these pass

```
Lodge lookup:
  [ ] Searching an existing lodge number + state shows "already on Tyrian"
  [ ] Searching a non-existent lodge shows "not found" + reveals form
  [ ] Lookup errors gracefully fall through to the form

Signup form:
  [ ] Lodge number + state pre-fill from lookup inputs
  [ ] Price updates immediately when size selection changes
  [ ] Founding callout only shows when slots remain
  [ ] Membership confirmation checkbox is required
  [ ] Continue button disabled until all fields + checkbox complete

Confirmation screen:
  [ ] Shows correct lodge summary before payment
  [ ] Edit button returns to form with all values pre-filled
  [ ] Complete Payment button creates Stripe session and redirects

Stripe + webhook:
  [ ] Test payment completes (card: 4242 4242 4242 4242)
  [ ] Stripe signature verification works (webhook doesn't 400)
  [ ] Lodge status updates to 'active' after payment
  [ ] Founding tier assigned server-side when slots available
  [ ] Duplicate lodge returns 409 before Stripe session is created
  [ ] Unique constraint catches race conditions at DB level

Claim code:
  [ ] Claim code email arrives via Resend within 60 seconds
  [ ] Claim code format is XXX-9999 (3 letters, hyphen, 4 digits)
  [ ] Claim code expires_at is 30 days from paid_at
  [ ] /claim page: valid code → lodge admin access granted
  [ ] /claim page: expired code → resend section highlighted
  [ ] /claim page: claimed code → "already claimed" message
  [ ] /claim page: unauthenticated → stores code, redirects to login, applies on return
  [ ] Resend form sends email without revealing whether lodge exists

Admin panel:
  [ ] After claiming, redirect to /admin?onboarding=true
  [ ] Setup checklist shows with correct completed steps
  [ ] Lodge name and number display correctly in admin header

Cron (test manually by calling the route directly):
  [ ] Day 7 reminder sends to lodges paid 7+ days ago, unclaimed
  [ ] Day 25 reminder sends to lodges paid 25+ days ago, unclaimed
  [ ] Neither reminder sends twice (sent_at columns prevent re-send)
```

---

*Day 3 revised brief — lodge signup with full edge case handling.*
*Do not start Day 4 until every item in the verification checklist passes.*
