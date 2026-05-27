# Tyrian — Full Build Roadmap
## Weekend Sprint: Wednesday → Monday Morning
### For Claude Code · Solo build · Target: Vercel preview live before Monday lodge meeting

---

## Critical read before writing a single line of code

This document is the single source of truth for the Tyrian build. Every decision in here has been made deliberately. Do not improvise on schema design, brand implementation, or feature scope. When in doubt, do less and do it right rather than more and do it broken.

**The three rules that override everything else:**
1. **Schema first.** Do not write application code until the full Supabase schema is in place and confirmed. A wrong schema causes rewrites. A correct schema makes everything else fast.
2. **Brand is non-negotiable.** Cormorant Garamond for all headings and the wordmark. DM Sans for everything else. Navy `#1B2A4A`, Gold `#C9A84C`, Green `#2D6A4F`, Limestone `#F8F6F1`. No exceptions, no drift, not even for speed.
3. **Demo toggle is infrastructure, not a feature.** It needs to be wired before any page is built, because every page needs to respect it.

---

## Environment setup checklist (do this first, before any code)

### Required accounts and keys
Create these before starting. Store all values in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server-side only, never expose to client

# Stripe (TEST MODE keys only for now)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=              # generated after creating webhook endpoint

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000   # update to Vercel URL on deploy
NEXT_PUBLIC_DEMO_MODE_DEFAULT=false         # toggle default

# Email (Resend)
RESEND_API_KEY=                     # sign up at resend.com, free tier
RESEND_FROM_EMAIL=hello@tyrian.work # configure domain in Resend dashboard
```

### Vercel project setup
- Create Vercel project linked to the GitHub repo before starting
- Add all env variables to Vercel dashboard immediately (Settings → Environment Variables)
- This way `vercel --prod` works from day one without surprises

---

## The Supabase schema — build this before anything else

Run these SQL statements in the Supabase SQL editor in order. Do not modify table or column names — the application code throughout this document references these exact names.

```sql
-- ─── EXTENSIONS ────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists postgis;  -- for radius proximity queries

-- ─── LODGES ────────────────────────────────────────────────────
create table lodges (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  number          text not null,
  state           text not null,
  city            text not null,
  status          text not null default 'pending'
                  check (status in ('pending','active','suspended')),
  tier            text not null default 'standard'
                  check (tier in ('founding','charter','standard','large')),
  claim_code      text unique,
  paid_at         timestamptz,
  paid_by_email   text,
  stripe_session_id text,
  meeting_address text,
  website         text,
  welcome_message text,
  created_at      timestamptz default now()
);

-- ─── PROFILES ──────────────────────────────────────────────────
-- Extends Supabase auth.users. Created automatically on first login.
create table profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text,
  email             text,
  lodge_id          uuid references lodges(id),
  trade_category    text,
  occupation        text,  -- for non-business members
  city              text,
  state             text,
  lat               float,
  lng               float,
  sponsor_name      text,
  sponsor_contact   text,  -- email or phone
  verification_status text not null default 'pending'
                    check (verification_status in ('pending','verified','rejected','flagged')),
  is_lodge_admin    boolean not null default false,
  is_co_admin       boolean not null default false,
  visibility        text not null default 'public'
                    check (visibility in ('public','members_only')),
  referral_code     text unique default substring(md5(random()::text), 1, 8),
  referred_by       uuid references profiles(id),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ─── LISTINGS ──────────────────────────────────────────────────
create table listings (
  id                uuid primary key default uuid_generate_v4(),
  profile_id        uuid not null references profiles(id) on delete cascade,
  business_name     text not null,
  description       text,
  trade_category    text not null,
  city              text not null,
  state             text not null,
  lat               float,
  lng               float,
  phone             text,
  email             text,
  website           text,
  google_business_url text,
  google_rating     float,
  google_rating_count int,
  services          text[],  -- array of service strings
  travel_radius_miles int default 25,
  remote_eligible   boolean not null default false,
  visibility        text not null default 'public'
                    check (visibility in ('public','members_only')),
  is_active         boolean not null default true,
  views_count       int not null default 0,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ─── REQUESTS ──────────────────────────────────────────────────
create table requests (
  id                uuid primary key default uuid_generate_v4(),
  posted_by_name    text not null,
  posted_by_email   text not null,
  profile_id        uuid references profiles(id),  -- null if non-member post
  lodge_id          uuid references lodges(id),    -- null if non-member post
  lodge_display     text,   -- "Acacia Lodge #123" — denormalized for display
  category          text not null,
  title             text not null,
  details           text,
  city              text not null,
  state             text not null,
  lat               float,
  lng               float,
  budget            text,
  timeline          text check (timeline in ('ASAP','Within 1 week','Within 1 month','Flexible')),
  status            text not null default 'open'
                    check (status in ('open','active','filled','expired','withdrawn','flagged')),
  remote_eligible   boolean not null default false,
  is_verified_member boolean not null default false,
  responses_count   int not null default 0,
  flag_count        int not null default 0,
  expires_at        timestamptz default (now() + interval '30 days'),
  filled_at         timestamptz,
  created_at        timestamptz default now()
);

-- ─── REVIEWS ───────────────────────────────────────────────────
create table reviews (
  id                uuid primary key default uuid_generate_v4(),
  listing_id        uuid not null references listings(id) on delete cascade,
  reviewer_id       uuid not null references profiles(id),
  rating            int not null check (rating between 1 and 5),
  body              text,
  request_id        uuid references requests(id),
  created_at        timestamptz default now(),
  unique(listing_id, reviewer_id)  -- one review per member per listing
);

-- ─── REFERRALS ─────────────────────────────────────────────────
create table referrals (
  id                uuid primary key default uuid_generate_v4(),
  referrer_id       uuid not null references profiles(id),
  referred_profile_id uuid references profiles(id),
  listing_id        uuid references listings(id),
  created_at        timestamptz default now()
);

-- ─── SPONSOR CONFIRMATIONS ─────────────────────────────────────
create table sponsor_confirmations (
  id                uuid primary key default uuid_generate_v4(),
  profile_id        uuid not null references profiles(id) on delete cascade,
  sponsor_name      text not null,
  sponsor_contact   text not null,
  token             text unique default uuid_generate_v4()::text,
  status            text not null default 'pending'
                    check (status in ('pending','confirmed','denied','expired')),
  reminded_at       timestamptz,
  responded_at      timestamptz,
  created_at        timestamptz default now()
);

-- ─── ROW LEVEL SECURITY ────────────────────────────────────────
-- Enable RLS on all tables
alter table lodges                  enable row level security;
alter table profiles                enable row level security;
alter table listings                enable row level security;
alter table requests                enable row level security;
alter table reviews                 enable row level security;
alter table referrals               enable row level security;
alter table sponsor_confirmations   enable row level security;

-- Lodges: anyone can read active lodges
create policy "lodges_public_read" on lodges
  for select using (status = 'active');

-- Profiles: members can read verified public profiles
create policy "profiles_public_read" on profiles
  for select using (
    verification_status = 'verified' and visibility = 'public'
  );
create policy "profiles_own_read" on profiles
  for select using (auth.uid() = id);
create policy "profiles_own_write" on profiles
  for all using (auth.uid() = id);

-- Listings: public can read active public listings
create policy "listings_public_read" on listings
  for select using (is_active = true and visibility = 'public');
create policy "listings_member_read" on listings
  for select using (
    is_active = true and visibility = 'members_only'
    and auth.uid() in (select id from profiles where verification_status = 'verified')
  );
create policy "listings_own_write" on listings
  for all using (auth.uid() = profile_id);

-- Requests: public can read open/active requests
create policy "requests_public_read" on requests
  for select using (status in ('open','active'));
create policy "requests_own_write" on requests
  for all using (
    auth.uid() = profile_id
    or posted_by_email = (select email from auth.users where id = auth.uid())
  );
create policy "requests_insert_anon" on requests
  for insert with check (true);  -- anyone can post a request

-- Reviews: public can read reviews
create policy "reviews_public_read" on reviews
  for select using (true);
create policy "reviews_own_write" on reviews
  for all using (auth.uid() = reviewer_id);

-- ─── HELPFUL INDEXES ───────────────────────────────────────────
create index listings_trade_idx on listings(trade_category);
create index listings_state_idx on listings(state);
create index listings_active_idx on listings(is_active);
create index requests_status_idx on requests(status);
create index requests_category_idx on requests(category);
create index requests_state_idx on requests(state);
create index requests_expires_idx on requests(expires_at);
create index profiles_lodge_idx on profiles(lodge_id);
create index profiles_verification_idx on profiles(verification_status);

-- ─── AUTO-UPDATE TIMESTAMPS ────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

create trigger listings_updated_at
  before update on listings
  for each row execute function update_updated_at();
```

---

## Demo toggle — wire this before any page is built

This is the UI switch that lets you flip between real Supabase data and polished seed data during the demo. It must be implemented as a context provider that wraps the entire app.

### How it works
- A floating toggle button appears in the bottom-right corner of every page
- When Demo Mode is ON: all data fetches return from a local `demoData` object instead of Supabase
- When Demo Mode is OFF: all data fetches hit real Supabase tables
- State persists in localStorage so it survives page refreshes
- Toggle is clearly labeled so it's never accidentally left on in production

### Implementation

**`lib/demo-context.tsx`**
```tsx
'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const DemoContext = createContext({ isDemoMode: false, toggleDemo: () => {} })

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('tyrian_demo_mode')
    if (stored === 'true') setIsDemoMode(true)
  }, [])

  const toggleDemo = () => {
    setIsDemoMode(prev => {
      const next = !prev
      localStorage.setItem('tyrian_demo_mode', String(next))
      return next
    })
  }

  return (
    <DemoContext.Provider value={{ isDemoMode, toggleDemo }}>
      {children}
      <DemoToggle isDemoMode={isDemoMode} onToggle={toggleDemo} />
    </DemoContext.Provider>
  )
}

export const useDemoMode = () => useContext(DemoContext)

function DemoToggle({ isDemoMode, onToggle }: { isDemoMode: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        position: 'fixed', bottom: '1.5rem', right: '1.5rem',
        zIndex: 9999,
        display: 'flex', alignItems: 'center', gap: '8px',
        background: isDemoMode ? '#C9A84C' : '#1B2A4A',
        color: isDemoMode ? '#1B2A4A' : '#C9A84C',
        border: 'none', borderRadius: '24px',
        padding: '8px 16px', cursor: 'pointer',
        fontSize: '12px', fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500, letterSpacing: '0.05em',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        transition: 'all 0.2s'
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: isDemoMode ? '#1B2A4A' : '#C9A84C'
      }} />
      {isDemoMode ? 'DEMO MODE' : 'LIVE MODE'}
    </button>
  )
}
```

Wrap the root layout with `<DemoProvider>` in `app/layout.tsx`.

### Demo data file
**`data/demo.ts`** — use the 12 existing seed listings plus the 11 requests already built. Expand to include:
- 3 demo lodges (Acacia #123 Tulsa OK, Gulf Coast #441 Tampa FL, Suncoast #217 Sarasota FL)
- 12 listings (existing seed data)
- 11 requests (existing request seed data)
- 1 demo logged-in member (Robert C. Ingram, Plumbing, Acacia Lodge #123)
- 3 demo reviews per featured listing

---

## Build order — day by day

Follow this order exactly. Do not jump ahead. Each day's work is a stable foundation for the next.

---

### Day 1 — Foundation & Auth
**Goal: Supabase connected, magic link auth working, user can sign up and land on a dashboard.**

#### Tasks in order:
1. Create Supabase project, run full schema SQL above
2. Install dependencies:
   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   npm install stripe @stripe/stripe-js
   npm install resend
   npm install @types/node
   ```
3. Create `lib/supabase/client.ts` (browser client) and `lib/supabase/server.ts` (server client using cookies)
4. Create `lib/supabase/middleware.ts` — refresh sessions on every request
5. Update `middleware.ts` at project root to call the Supabase middleware
6. Implement `DemoProvider` and `DemoToggle` (see above) — wrap `app/layout.tsx`
7. Build auth pages:
   - `/login` — email input, "Send Magic Link" button, success state showing "Check your email"
   - `/auth/callback` — handles the magic link token exchange, redirects to `/dashboard`
   - `/auth/confirm` — sponsor confirmation page (token in URL param)
8. Create Supabase trigger: auto-create a `profiles` row when a new `auth.users` row is created:
   ```sql
   create or replace function handle_new_user()
   returns trigger as $$
   begin
     insert into profiles (id, email)
     values (new.id, new.email);
     return new;
   end;
   $$ language plpgsql security definer;

   create trigger on_auth_user_created
     after insert on auth.users
     for each row execute function handle_new_user();
   ```
9. Protected route middleware — redirect unauthenticated users to `/login` for `/dashboard` and `/admin` routes only
10. Basic `/dashboard` shell — shows "Welcome back" with logged-in user's email. Pulls from real Supabase profile. Demo mode shows mock user (Robert Ingram).

**Day 1 done when:** Magic link email arrives, clicking it logs you in, you land on `/dashboard` and see your email. Demo toggle visible bottom-right on every page.

---

### Day 2 — Real Directory + Listings
**Goal: Directory and profile pages pull from Supabase. Member can create a listing.**

#### Tasks in order:
1. Seed the database with demo data via a seed script `scripts/seed.ts`:
   ```bash
   npx ts-node scripts/seed.ts
   ```
   Seed script inserts: 3 lodges, 12 listings with full data, 11 requests, demo profiles. These become the "real data" visible when Demo Mode is OFF. When Demo Mode is ON, the same data shows from `data/demo.ts` without any DB calls.

2. Update `/directory/page.tsx`:
   - Replace hardcoded array with Supabase query: `listings` joined to `profiles` joined to `lodges`
   - Only fetch `is_active = true AND visibility = 'public'`
   - Client-side filter still works for category/state/search
   - Demo mode: return `demoData.listings` instead of Supabase query
   - Loading skeleton while data fetches (use existing card structure with pulsing gray placeholder)

3. Update `/directory/[slug]/page.tsx`:
   - Slug is the listing `id` (UUID) — or generate a URL-safe slug from business name + city
   - Fetch listing + profile + lodge + reviews from Supabase
   - Dynamic meta tags: `<title>[Business] · Verified Masonic [Trade] in [City], [State] | Tyrian</title>`
   - Dynamic meta description using the formula from the copy brief
   - `generateStaticParams` for Next.js static generation of public profiles
   - Demo mode: match by slug from `demoData.listings`

4. Build `app/dashboard/listing/new/page.tsx` — create listing form:
   - Step 1: Google Business Profile URL (optional) — paste URL, show "Importing..." state, then pre-fill fields (stub the actual fetch for now — just show the UI)
   - Step 2: Business name, trade category, city, state, description, services (tag input)
   - Step 3: Phone, email, website, travel radius, remote eligible toggle, visibility toggle
   - Submit: `insert into listings` with `profile_id = auth.uid()`
   - On success: redirect to the new listing's public profile page

5. Build `app/dashboard/listing/edit/[id]/page.tsx` — same form, pre-filled, uses `update`

6. Update member dashboard (`/dashboard`):
   - Pull real listing if exists, else show "Create your listing" CTA
   - Stats: listing views (from `listings.views_count`), referrals (count from `referrals` table)
   - Recent activity: stub for now

**Day 2 done when:** Real listings show in directory from Supabase. Clicking a profile shows real data with correct meta tags. A logged-in member can create a listing that appears in the directory.

---

### Day 3 — Lodge Signup + Stripe
**Goal: Lodge fee payment works end-to-end in Stripe test mode. Lodge unlocks. Claim code issued.**

#### Tasks in order:

1. Build `app/join/page.tsx` — lodge signup landing page:
   - Three fields: Lodge Name, Lodge Number, State (select)
   - Lodge size selector (under 40 / 40–100 / 100+) — determines price tier
   - Price displayed dynamically based on size selection
   - "Founding Lodge" callout if founding slots remain (hardcode 10 - count of active lodges)
   - "Continue to Payment" button → creates Stripe Checkout session

2. Build `app/api/create-checkout/route.ts`:
   ```ts
   // Server action: create Stripe checkout session
   // 1. Insert lodge record with status = 'pending'
   // 2. Create Stripe checkout session with lodge data in metadata
   // 3. Return session URL
   // Price IDs: create these in Stripe dashboard as one-time prices
   //   founding: $1.00
   //   charter:  $299.00
   //   standard_small: $299.00
   //   standard:       $499.00
   //   large:          $799.00
   ```

3. Build `app/api/webhooks/stripe/route.ts`:
   ```ts
   // Stripe webhook handler
   // Event: checkout.session.completed
   // 1. Verify Stripe signature (IMPORTANT — do not skip)
   // 2. Extract lodge data from session metadata
   // 3. Update lodge: status = 'active', paid_at = now(), generate claim_code
   // 4. Send claim code email via Resend to payer's email
   // Claim code format: 3 uppercase letters + 4 digits e.g. "ACE-4471"
   ```

4. Configure Stripe webhook in Stripe dashboard:
   - Endpoint: `https://[vercel-preview-url]/api/webhooks/stripe`
   - Event: `checkout.session.completed`
   - Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET` env var

5. Build `app/join/success/page.tsx` — post-payment success:
   - "Your lodge is unlocked" confirmation
   - Display the claim code prominently
   - Clear instructions: "Forward this to your Worshipful Master or claim admin yourself"
   - "Claim Admin Access →" button linking to `/claim`

6. Build `app/claim/page.tsx` — admin claim flow:
   - Single input: lodge claim code
   - On submit: verify code against `lodges.claim_code`, mark as claimed
   - If authenticated: set `profiles.is_lodge_admin = true`, `profiles.lodge_id = lodge.id`
   - If not authenticated: store claim code in session, redirect to `/login`, complete claim after magic link auth
   - On success: redirect to `/admin` with setup checklist

7. Build `app/admin/page.tsx` — lodge admin panel:
   - Show setup checklist (see onboarding brief) if newly claimed
   - Member table: all profiles with `lodge_id = admin's lodge_id`
   - Pending approvals queue
   - Stats row (active listings, verified members, etc.)
   - Invite tools: bulk email form, copyable lodge link, QR code download (use a QR library: `npm install qrcode`)

**Day 3 done when:** Stripe test checkout completes, lodge activates, claim code email arrives via Resend, admin claims the lodge, admin panel loads with correct lodge data.

---

### Day 4 — Request Board + Member Onboarding
**Goal: Real request posting to DB. Member join flow via lodge invite link. Sponsor confirmation email.**

#### Tasks in order:

1. Update `/requests/page.tsx`:
   - Replace all hardcoded data with Supabase queries
   - For You tab: fetch all requests, run Haversine scoring client-side against logged-in user's lat/lng (from profile) or mock user's coordinates in demo mode
   - Your Lodge tab: `where lodge_id = user's lodge_id`
   - Your Area tab: fetch all, filter client-side by 50mi radius
   - All Requests: full unfiltered query with client-side filters
   - Demo mode: return from `demoData.requests`
   - Post a Request modal: `insert into requests` on submit. If logged-in member: attach `profile_id`, `lodge_id`, set `is_verified_member = true`

2. Build `app/join/[lodge-slug]/page.tsx` — member join via invite link:
   - Lodge pre-identified from URL slug (e.g. `acacia-lodge-123`)
   - Show lodge name and admin's welcome message
   - Form: full name, email, sponsor name, sponsor contact (email or phone)
   - On submit: create magic link auth, insert profile with `verification_status = 'pending'`, insert `sponsor_confirmations` row, send sponsor confirmation email/SMS via Resend
   - Success state: "You're in — check your email. Verification usually takes under 24 hours."

3. Build `app/api/sponsor-confirm/route.ts`:
   - Handles `?token=[token]&action=[confirm|deny]` from sponsor's email
   - No login required — token-based
   - On confirm: update `profiles.verification_status = 'verified'`, send verified welcome email to member
   - On deny: update to 'rejected', notify lodge admin
   - On token not found or expired: show friendly error page

4. Build sponsor confirmation email template (`emails/sponsor-confirm.tsx`):
   - Branded in Tyrian navy and gold
   - Clear "Yes, I sponsored them" and "No, I didn't" buttons
   - Both are links to the API route with the token and action in URL

5. Build member verified welcome email (`emails/member-verified.tsx`):
   - "You're verified, Brother [Name]"
   - Their public profile link (if they have a listing)
   - 3 open requests in their area matching their trade (query at send time)
   - "List your business →" CTA

6. Build `app/join/complete/page.tsx` — post-magic-link-click for new members:
   - After clicking magic link from join flow (different from login flow)
   - Show member profile setup form: trade category, city/state, occupation
   - Immediate "List your business?" prompt — skip or go to listing creation

**Day 4 done when:** A new member can click an invite link, fill out the form, click their magic link, sponsor gets a confirmation email, sponsor clicks confirm, member gets a verified welcome email with nearby requests.

---

### Day 5 — Polish, Deploy, Demo Prep
**Goal: Deployed to Vercel, demo toggle working, everything presentable for Monday.**

#### Tasks in order:

1. **Deploy to Vercel:**
   - Push to GitHub main branch
   - Verify all env variables are set in Vercel dashboard
   - Test magic link auth on the deployed URL (update `NEXT_PUBLIC_APP_URL` to Vercel URL)
   - Test Stripe webhook pointing to Vercel URL
   - Test full lodge signup flow end-to-end on Vercel

2. **Demo mode QA pass:**
   - Toggle demo mode ON — verify every page shows polished seed data
   - Toggle demo mode OFF — verify every page shows real Supabase data (seeded)
   - Verify demo toggle persists across page refreshes
   - Verify demo toggle is visible but not intrusive

3. **Brand QA pass — check every page:**
   - [ ] Cormorant Garamond on all H1, H2, H3, business names, stats
   - [ ] DM Sans on all body, labels, buttons, badges, nav, forms
   - [ ] Navy `#1B2A4A` primary surfaces correct
   - [ ] Gold `#C9A84C` CTAs, accents, verified badge accent correct
   - [ ] Green `#2D6A4F` verified badges correct
   - [ ] Limestone `#F8F6F1` backgrounds correct
   - [ ] "Lodge-Verified Member" badge appears on all listing cards
   - [ ] No leftover placeholder text or "TODO" strings visible

4. **Mobile QA pass:**
   - Test on a real phone (not just browser DevTools)
   - Directory cards readable and tappable
   - Request board tabs scroll horizontally on small screens
   - Demo toggle not covering content
   - Lodge signup form usable on mobile

5. **Loading states:**
   - Every data-fetching page has a skeleton loader (not a spinner — skeleton cards matching the real layout)
   - Error states: friendly message + retry option, never a raw JS error

6. **SEO:**
   - All listing profile pages have correct dynamic `<title>` and `<meta name="description">`
   - Landing page has correct OG tags
   - `robots.txt`: disallow `/dashboard`, `/admin`, `/auth`
   - `sitemap.xml`: generated from all active public listings

7. **Demo walkthrough prep:**
   - Set demo mode ON
   - Log in as demo user (Robert Ingram — create this test account with magic link)
   - Have the following browser tabs open and ready before the meeting:
     1. Landing page (/ )
     2. Directory (/directory)
     3. A listing profile (/directory/[slug])
     4. Request board (/requests) — For You tab
     5. Member dashboard (/dashboard)
     6. Lodge admin panel (/admin)
     7. Lodge signup (/join) — to show the payment flow
   - Have Stripe test card ready: `4242 4242 4242 4242` exp `12/34` cvv `123`

---

## What NOT to do this weekend

These are the things most likely to eat time without adding demo value. Explicitly out of scope until after Monday:

- Real geolocation from browser (use profile lat/lng only)
- PostGIS radius queries (Haversine client-side is fine for demo)
- Cron jobs for request expiry (manual status only for now)
- Review submission flow (show reviews from seed data only)
- Referral tracking beyond the UI
- Profile photo uploads (placeholder avatar is fine)
- Push notifications
- SMS sponsor confirmation (email only for now)
- Grand Lodge admin super-panel
- Any animation or transition work beyond what's already in the app
- Accessibility audit
- Unit or integration tests
- Rate limiting or abuse protection

---

## File structure additions (new files this sprint)

```
app/
├── api/
│   ├── create-checkout/route.ts
│   ├── webhooks/stripe/route.ts
│   └── sponsor-confirm/route.ts
├── auth/
│   ├── callback/route.ts
│   └── confirm/page.tsx
├── claim/page.tsx
├── join/
│   ├── page.tsx                    # Lodge signup
│   ├── success/page.tsx            # Post-payment
│   ├── complete/page.tsx           # Post-magic-link for new members
│   └── [lodge-slug]/page.tsx       # Member invite landing
├── login/page.tsx
├── admin/
│   ├── page.tsx                    # Lodge admin panel (update existing)
│   └── gaps/page.tsx               # Gap dashboard (existing, wire to DB)
└── dashboard/
    ├── page.tsx                    # Member dashboard (update existing)
    └── listing/
        ├── new/page.tsx
        └── edit/[id]/page.tsx

lib/
├── supabase/
│   ├── client.ts
│   ├── server.ts
│   └── middleware.ts
├── stripe.ts                       # Stripe client init
├── resend.ts                       # Resend client init
├── demo-context.tsx                # Demo mode provider
├── scoring.ts                      # Haversine + match score (existing, keep)
└── types.ts                        # Supabase generated types

data/
└── demo.ts                         # Full demo dataset (expand existing)

emails/
├── sponsor-confirm.tsx             # React Email template
├── member-verified.tsx
├── lodge-claim-code.tsx
└── listing-live.tsx

scripts/
└── seed.ts                         # Supabase seed script

middleware.ts                       # Root middleware (Supabase session refresh)
```

---

## Brand reference — keep this open while building

**Fonts:**
- Headings, wordmark, business names, stats, tagline: `font-family: 'Cormorant Garamond', serif`
- Everything else: `font-family: 'DM Sans', sans-serif`
- Never use system fonts, Inter, Roboto, or any other font. Only these two.

**Colors:**
```
--navy:    #1B2A4A   Primary brand, headers, navbar
--gold:    #C9A84C   CTAs, accents, verified badge stroke, demo toggle active
--green:   #2D6A4F   Verified badge fill, success states
--stone:   #F8F6F1   Page background
--white:   #FFFFFF   Card surfaces
--charcoal:#1A1A1A   Body text
--muted:   #6B7280   Secondary text, metadata
--border:  #E5E0D5   Card borders, dividers
```

**Verified badge — exact implementation:**
```tsx
<span style={{
  display: 'inline-flex', alignItems: 'center', gap: 4,
  background: '#E1F5EE', color: '#0F6E56',
  fontSize: 11, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
  padding: '2px 8px', borderRadius: 20,
  letterSpacing: '0.06em', textTransform: 'uppercase'
}}>
  ✓ Lodge-Verified Member
</span>
```

**Tagline** (italic Cormorant, used in footer and landing page):
*"Built on trust. Proven by the craft."*

---

## Stripe test cards (keep these handy)

```
Success:        4242 4242 4242 4242   exp: any future date   cvv: any 3 digits
Decline:        4000 0000 0000 0002
Requires auth:  4000 0025 0000 3155
```

---

## End of day checkpoints

**End of Day 1:** Magic link auth works. Demo toggle visible. Dashboard shows logged-in user.
**End of Day 2:** Real directory loads from Supabase. Profile pages have dynamic SEO meta. Member can create a listing.
**End of Day 3:** Stripe test payment works. Lodge activates. Claim code email arrives. Admin panel loads.
**End of Day 4:** Invite link flow works. Sponsor email arrives. Sponsor confirm works. Member gets verified.
**End of Day 5:** Deployed on Vercel. Demo mode polished. Brand QA passed. Mobile tested. Ready for Monday.

---

*Build version: 1.0 · Target: Vercel preview URL live before Monday lodge meeting*
*Brand: Tyrian · Stack: Next.js 14 · Supabase · Stripe · Resend · Vercel*
*Do not drift from the brand. Do not modify the schema once set. Ship clean.*
