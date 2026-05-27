# Cornerstone — Claude Code Build Brief

## What we're building

A demo web app called **Cornerstone** — a verified business directory and referral network exclusively for Freemasons. Think Angie's List, but membership-gated to lodge brothers only. The public can browse and contact businesses; only verified Masons can be listed.

This is a **demo/prototype** to present to a potential co-founder with strong lodge connections across FL, OK, and beyond. It needs to look and feel like a real product, not a mockup.

---

## Core concept

- Brothers list their businesses on the platform
- The public can browse and contact those businesses (no account needed)
- Only verified lodge members can create a listing
- Verification = sponsor vouches + optional admin cross-check (no Grand Lodge API exists — it's a manual/human process)
- Lodges pay a one-time platform fee; all their members get access

---

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR for public pages, SPA feel for dashboard |
| Styling | Tailwind CSS | Custom Masonic color palette (see below) |
| Backend / DB | Supabase | Postgres + Auth + Storage |
| Auth | Supabase Auth | Magic link email login |
| Hosting | Vercel | Zero-config Next.js deploy |
| Payments | Stripe | Not needed for demo — stub it out |
| Maps | Mapbox GL JS | "Find a brother near me" — use a free token or stub |

---

## Design direction

**Feel:** Somewhere between heritage and modern. Not a dark themed "secret society" aesthetic — think clean, trustworthy, professional with subtle nods to Masonic craft symbolism (compass, square, plumb, cornerstone).

**Color palette:**
- Primary: deep navy `#1B2A4A`
- Accent / CTA: warm gold `#C9A84C`
- Background: off-white `#F8F6F1`
- Text: near-black `#1A1A1A`
- Surface: white `#FFFFFF`
- Muted: `#6B7280`
- Trust badge accent: `#2D6A4F` (deep green)

**Typography:**
- Headings: serif (e.g. Playfair Display or similar Google Font)
- Body: clean sans-serif (Inter or similar)

**Key UI elements:**
- "Verified Mason" trust badge on every listing (green shield checkmark)
- Lodge name displayed on profiles (e.g. "Acacia Lodge #123 · Tulsa, OK")
- Subtle square-and-compass icon in logo/wordmark area (placeholder is fine)
- Card-based business listings

---

## Pages to build (in priority order)

### 1. Public landing page `/`
The marketing/pitch page. Must include:
- Hero section: headline, subheadline, CTA buttons ("Browse Businesses" + "List Your Business")
- How it works: 3-step explainer (Get verified → List your business → Get found)
- Featured categories strip (Plumbing, Legal, Roofing, Financial, HVAC, Electrical, etc.)
- Trust/social proof section ("Built by brothers, for brothers" + stats placeholders)
- Footer with placeholder nav links

### 2. Business directory `/directory`
Browse page. Must include:
- Search bar (by trade/keyword)
- Filter sidebar: Category, State, Lodge (stubs are fine)
- Grid of business listing cards showing:
  - Business name
  - Owner name
  - Trade/category badge
  - Location (City, State)
  - Lodge name + number
  - Verified Mason badge
  - Star rating (stub — hardcoded for demo)
  - "Contact" button
- Use realistic seed data (at least 12 listings across FL and OK — see seed data below)

### 3. Business profile page `/directory/[slug]`
Individual listing page. Must include:
- Business name + owner name
- Verified Mason badge (prominent)
- Lodge affiliation
- Trade category
- Location
- About/description paragraph
- Services offered (list)
- Contact section (phone, email, website — stubbed)
- "Referred by a brother?" referral note (UI stub)
- Related listings sidebar ("Other brothers in [state]")

### 4. Member dashboard `/dashboard` (authenticated stub)
Show what a logged-in brother sees. Can be mostly static for demo:
- Welcome header ("Welcome back, Brother [Name]")
- Stats row: Listing Views, Referrals Received, Profile Completion
- Their listing card (edit button — stub)
- Recent leads/inquiries (fake data)
- "Invite a brother" referral link UI

### 5. Lodge admin panel `/admin` (static stub)
Impressive to show to lodge contacts. Can be fully static:
- Lodge name header ("Acacia Lodge #123 — Lodge Admin")
- Member list table (name, trade, listing status, verified toggle)
- Pending approval queue (2-3 fake pending members)
- Lodge stats (total members, active listings, total referrals)

---

## Seed data (use this for the demo)

```json
[
  { "name": "Gulf Coast Roofing", "owner": "James R. Thornton", "trade": "Roofing", "lodge": "Gulf Coast Lodge #441", "location": "Tampa, FL", "rating": 4.9 },
  { "name": "Thornton Electric", "owner": "Marcus D. Wells", "trade": "Electrical", "lodge": "Suncoast Lodge #217", "location": "Sarasota, FL", "rating": 4.8 },
  { "name": "Keystone Legal Group", "owner": "David A. Hartley", "trade": "Legal", "lodge": "Keystone Lodge #88", "location": "Orlando, FL", "rating": 5.0 },
  { "name": "Plumb Line Plumbing", "owner": "Robert C. Ingram", "trade": "Plumbing", "lodge": "Acacia Lodge #123", "location": "Tulsa, OK", "rating": 4.7 },
  { "name": "Level Ground Landscaping", "owner": "Thomas H. Brewster", "trade": "Landscaping", "lodge": "Prairie Lodge #56", "location": "Oklahoma City, OK", "rating": 4.6 },
  { "name": "Square Deal Auto", "owner": "William F. Mason", "trade": "Automotive", "lodge": "Heartland Lodge #302", "location": "Edmond, OK", "rating": 4.8 },
  { "name": "Craftsman HVAC Services", "owner": "Charles E. Monroe", "trade": "HVAC", "lodge": "Gulf Coast Lodge #441", "location": "St. Petersburg, FL", "rating": 4.9 },
  { "name": "Compass Financial Planning", "owner": "George L. Whitfield", "trade": "Financial", "lodge": "Suncoast Lodge #217", "location": "Naples, FL", "rating": 5.0 },
  { "name": "Brotherhood Built Construction", "owner": "Henry A. Price", "trade": "General Contractor", "lodge": "Acacia Lodge #123", "location": "Tulsa, OK", "rating": 4.7 },
  { "name": "True North IT Solutions", "owner": "Samuel P. Grant", "trade": "Technology", "lodge": "Prairie Lodge #56", "location": "Norman, OK", "rating": 4.8 },
  { "name": "Ashlar Home Inspections", "owner": "Frank J. Dexter", "trade": "Home Inspection", "lodge": "Keystone Lodge #88", "location": "Jacksonville, FL", "rating": 4.9 },
  { "name": "Plumb Perfect Painting", "owner": "Arthur N. Webb", "trade": "Painting", "lodge": "Heartland Lodge #302", "location": "Pensacola, FL", "rating": 4.6 }
]
```

---

## Key features / details to get right

- **Verified Mason badge** — should appear on every listing card and profile. Green shield with checkmark. This is the trust centerpiece of the brand; make it visually prominent.
- **Lodge affiliation** — always shown. Format: `Lodge Name #Number · City, ST`
- **Public vs. members-only visibility** — add a subtle "Public listing" or "Brothers only" toggle/badge on the dashboard. Don't need to wire it up, just show it exists.
- **"Refer a Brother" flow** — stub it, but make it visible. A shareable link concept on the dashboard.
- **No account required to browse** — directory and profiles are fully public-facing.
- **Mobile-first** — the demographic skews older; keep UI large, clear, and simple.

---

## What to stub / not wire up for demo

These do NOT need to work — just look real:

- Stripe payment flow (lodge fee)
- Real auth / Supabase connection (use mock session state)
- Real search / filtering (hardcode the 12 listings, filter client-side by category/state)
- Contact form (show the UI, no backend needed)
- Map (can use a static image or embedded iframe stub)
- Grand Lodge verification (just show "Verification pending" / "Verified" states)

---

## Folder structure suggestion

```
cornerstone/
├── app/
│   ├── page.tsx                  # Landing page
│   ├── directory/
│   │   ├── page.tsx              # Directory browse
│   │   └── [slug]/page.tsx       # Business profile
│   ├── dashboard/page.tsx        # Member dashboard
│   └── admin/page.tsx            # Lodge admin panel
├── components/
│   ├── VerifiedBadge.tsx
│   ├── ListingCard.tsx
│   ├── CategoryBadge.tsx
│   ├── Navbar.tsx
│   └── Footer.tsx
├── data/
│   └── listings.ts               # Seed data
├── lib/
│   └── types.ts
└── public/
    └── (logo placeholder, icons)
```

---

## Definition of done for the demo

- [ ] Landing page loads and looks polished
- [ ] Directory page shows all 12 listings, filterable by category client-side
- [ ] Clicking a listing opens a full profile page
- [ ] Dashboard page shows stubbed member view
- [ ] Admin page shows stubbed lodge management view
- [ ] Fully responsive / mobile-friendly
- [ ] Consistent Masonic color palette throughout
- [ ] Verified Mason badge visible on all listings
- [ ] Deployable to Vercel in one command

---

*Placeholder name: Cornerstone. Logo: use a simple square-and-compass SVG or text wordmark for now. Final name and branding TBD.*
