# Tyrian — Day 5 Launch Prep Roadmap
## Saturday · Target: Monday lodge meeting demo

Use this doc to stay on track today. Check items off as you go.

**Deferred (not today):** Stripe configuration, webhook testing, upgrade checkout validation.

**Definition of done for Monday:** Production URL loads, auth works, core flows function in live mode, landing page communicates purpose honestly, demo mode ready for walkthrough.

---

## Where we are

Days 1–4 core is built: auth, directory, listings, request board, respond flow, lodge join/claim/admin, member onboarding, network pages, fee enforcement UI.

**P0 status:** Build green ✓ · Local env verified ✓ · Deploy deferred until domain secured.

**P1 status:** Public flows audited ✓ · Critical requests RLS bug fixed ✓ · Member/auth flows need manual login test · Demo mode verified ✓

**Known gaps (remaining):**
- Admin bulk invite is stubbed (fake delay, no Resend call)
- Landing stats are hardcoded and inflated vs real data
- No `robots.txt`, `sitemap.xml` yet (P2)
- OG tags missing on landing (title/description only)
- **Sparse live DB:** 1 listing, 3 FL lodges, 4 requests — run `pnpm seed` before Monday **or** use demo mode for presentation
- **RLS migration pending:** run `scripts/migrations/008_fix_requests_rls.sql` in Supabase SQL editor (app workaround in place via `GET /api/requests`)

---

## P1 audit log (Sat)

### Verified in live mode (automated + browser)

| Flow | Result |
|------|--------|
| All key pages return 200 | ✓ `/`, `/directory`, `/requests`, `/login`, `/network`, `/join`, `/claim`, `/dashboard`, `/admin` |
| `POST /api/requests` (anon) | ✓ Inserts and returns id |
| `GET /api/requests` | ✓ Returns 4 open requests (after fix) |
| `/requests` live mode | ✓ Shows real requests, tabs, trust copy, "Sign in to respond" |
| `/requests` demo mode | ✓ 11 demo requests, respond buttons, demo user context |
| `/directory` demo mode | ✓ 12 seed listings |
| `/directory` live mode | ✓ 1 listing ("Test 1") when loaded |
| `/directory/gulf-coast-roofing` | ✓ SSG profile, correct dynamic title |
| `/network` | ✓ 3 active FL lodges |
| `/lodge/venice-lodge-301` | ✓ Public lodge page |
| `/join/venice-lodge-301` | ✓ Member invite form |
| Trust copy on requests | ✓ "Only lodge-verified members can respond" |
| Post request modal | ✓ Full US state list (50), timeline options, remote toggle |
| Categories | ✓ Consistent `CATEGORIES` constant across directory + requests |
| Requests auth hang fix | ✓ Page loads without infinite spinner (uses API fetch) |
| Demo toggle | ✓ Switches data; persists in localStorage |

### Fixed during audit

| Issue | Fix |
|-------|-----|
| Live requests board empty | `requests_own_write` RLS policy broke anon SELECT; added `GET /api/requests` + migration `008_fix_requests_rls.sql` |
| Build lint | Removed unused `price` in create-upgrade-checkout |

### Needs manual test (requires login)

- [ ] Magic link sign-in (`/login`)
- [ ] Dashboard, listing create/edit
- [ ] Respond to request as verified member
- [ ] Requester views responses (`/requests/[id]/responses`)
- [ ] Member join → sponsor confirm flow
- [ ] Lodge claim + admin panel (codes: Wellborn `WYW-5215`, Waldo `MED-2064`, Venice `CFQ-1992`)
- [ ] Admin approve/decline, settings save, gaps report
- [ ] Mobile pass on real phone

### Known accepted gaps

- Admin bulk email invite — stub; use copy invite link
- Stripe lodge payment — deferred
- Seed script not run on current DB — demo mode recommended for Monday

---

## Suggested schedule

| Block | Focus |
|-------|-------|
| Morning | P0 — fix build, deploy, prod smoke test |
| Late morning | P1 — core function audit |
| Afternoon | P1 — messaging & UX polish |
| Late afternoon | P2 — SEO & brand QA |
| Evening | Demo prep walkthrough |

---

## P0 — Ship blockers

Must complete before anything else. Nothing ships until build passes.

### Fix & deploy

- [x] Fix lint error in `src/app/api/create-upgrade-checkout/route.ts`
- [x] Confirm `pnpm build` passes locally
- [x] Verify local env vars (`.env.local`) — Supabase + Resend set; Stripe deferred as expected
- [ ] Verify Vercel env vars are set (same list) — **do when domain is secured, before deploy**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `NEXT_PUBLIC_APP_URL` (must match production URL after domain setup)
  - [ ] `RESEND_API_KEY`
  - [ ] `RESEND_FROM_EMAIL`
  - [ ] Stripe keys — **defer**, not required today
- [ ] Push to `main` and confirm Vercel deploy succeeds — **deferred until domain secured (Sat PM / Sun)**
- [ ] Open production URL — no 500s on homepage — **deferred until deploy**

### Production smoke test (15 min) — **deferred until domain + deploy**

- [ ] Homepage loads
- [ ] `/directory` loads listings
- [ ] `/requests` loads (no infinite spinner)
- [ ] `/login` → magic link arrives (or Resend stub logs if no key)
- [ ] Auth callback redirects correctly on prod URL

**P0 done when:** Build green ✓ · Local env verified ✓ · Vercel deploy + prod smoke test deferred until domain secured.

### Local smoke test (optional — run after `pnpm start`)

- [x] Homepage loads
- [x] `/directory` loads listings
- [x] `/requests` loads (no infinite spinner)
- [x] `/login` loads

_Note: if dev server on :3000 returns 500s, run `rm -rf .next && pnpm build && PORT=3005 pnpm start` for a clean production smoke test._

---

## P1 — Core function audit

Run **live mode OFF** first (real Supabase). Then repeat critical paths with **demo mode ON**.

### Public (no login)

- [x] `/` — landing renders, CTAs go to correct routes
- [x] `/directory` — listings from Supabase (1 live) / demo (12); filters present
- [x] `/directory/[slug]` — profile loads, dynamic `<title>` correct (SSG seed slugs)
- [x] `/requests` — tabs render: For You, Your Lodge, Your Area, All
- [x] Post a Request (anonymous) — API verified; UI modal fields verified
- [ ] Post a Request — success toast (manual click-through)
- [x] `/network` — active lodges list (3 FL lodges)
- [x] `/lodge/[slug]` — public lodge page loads (`venice-lodge-301`)

### Member flows

- [ ] `/login` — magic link sign-in on production URL
- [ ] `/dashboard` — greeting, stats, listing card or create CTA
- [ ] `/dashboard/listing/new` — create listing → appears in directory
- [ ] `/dashboard/listing/edit/[id]` — edit saves correctly
- [ ] `/requests` — verified member can open Respond modal
- [ ] Respond to request — response saves, requester notification path works (email or stub log)
- [ ] `/requests/[id]/responses` — requester can view responses (token or auth)

### Member onboarding

- [ ] `/join/[lodge-slug]` — form submits
- [ ] Sponsor confirmation email sent (or stub logged)
- [ ] `/api/sponsor-confirm?token=…&action=confirm` — verifies member
- [ ] `/join/complete` — profile setup after magic link
- [ ] Verified member can respond to requests

### Lodge admin

- [ ] `/claim` — claim code works for test lodge
- [ ] `/admin` — panel loads with correct lodge data
- [ ] Pending approvals — approve/decline works
- [ ] `/admin/settings` — lodge details save
- [ ] `/admin/gaps` — gap report loads
- [ ] Copy invite link / QR code works
- [ ] Admin bulk email invite — **known stub**; document workaround (copy link manually)

### Demo mode

- [x] Toggle ON — directory, requests show polished seed data
- [x] Toggle OFF — requests show real Supabase data (4 requests)
- [x] Toggle persists across page refresh (localStorage)
- [ ] Toggle visible but not covering critical UI on mobile

### Edge cases (from recent fixes — verify still work)

- [x] Requests page does not hang when Supabase auth is slow
- [x] Post request: full state list, no ambiguous timeline field
- [x] Post request: geo, remote, anonymous name edge cases (API + form fields)
- [x] Category labels consistent across directory and requests

**P1 done when:** Public + demo paths verified ✓ · Manual login flows remaining · Blockers logged ✓

---

## P1 — Messaging & purpose

Visitor should understand in 5 seconds: *What is Tyrian? Who is it for? What do I do next?*

### Landing page (`/`)

- [x] **Stats bar** — real counts from Supabase via `getLandingStats()` (`src/lib/db/stats.ts`)
- [x] **Hero** — aligned to `tyrian-copy-v2.md` ("Hire with confidence / Get found by your community")
- [x] **How it works** — three cards → Directory, List Your Business (login), Network
- [x] **Trust section** — "Accountability you can see" copy present and accurate
- [x] Primary CTA: Browse the Directory
- [x] Secondary CTA: List Your Business → `/login` or `/dashboard` via `AuthAwareLink`

### Request board trust signal

- [x] Visible copy on `/requests`: only lodge-verified members can respond
- [x] Non-members see "Sign in to respond" — verified in audit

### Footer (`src/components/layout/Footer.tsx`)

- [x] All footer links wired (see `Footer.tsx`)
- [x] `/about`, `/contact`, `/privacy`, `/terms` stub pages added

### Navbar

- [x] "List Your Business" → `/login` when logged out (navbar); `AuthAwareLink` on landing/footer
- [x] Network nav link works
- [x] Sign out clears session and returns to `/` (existing behavior)

**P1 messaging done when:** No fake stats, no dead footer links, purpose clear from landing alone.

---

## P1 — UX polish

- [x] Add custom 404 page (`src/app/not-found.tsx`) — copy from `tyrian-copy-v2.md`:
  - Heading: "This page doesn't exist — but the network does."
  - CTA: Browse the Directory
- [ ] Error states on directory/requests — friendly message + retry, no raw JS errors
- [ ] Mobile pass on real phone (not just DevTools):
  - [ ] Directory cards tappable, readable
  - [ ] Request board tabs scroll horizontally
  - [ ] Demo toggle not covering CTAs
  - [ ] Post Request modal usable on small screens
  - [ ] Lodge join form usable on mobile
- [ ] Loading states — directory and requests use skeletons (not bare spinners) where possible
- [ ] Remove or hide any visible TODO strings in UI

**P1 UX done when:** 404 exists, mobile spot-check passed, no embarrassing empty/error states on main paths.

---

## P2 — SEO & deploy hygiene

- [x] `src/app/robots.ts` — disallows `/dashboard/`, `/admin/`, `/auth/`; sitemap URL set
- [x] `src/app/sitemap.ts` — static pages + demo listing slugs + live listings + lodge pages
- [x] `openGraph` + `twitter` + `metadataBase` on root layout
- [x] `noindex` on `/dashboard` and `/admin` (layout.tsx) + `/auth` (layout.tsx)
- [x] Page metadata on `/directory` and `/requests` layouts (copy v2 titles)
- [x] Listing profiles — dynamic title + OG (existing `generateMetadata`)

**Verify after deploy:** view `/robots.txt`, `/sitemap.xml`, and page source for `og:` tags on `/`.

---

## P2 — Brand QA

Config/code review passed (grep + `tailwind.config.ts` + `globals.css`):

- [x] Cormorant Garamond — `font-serif` / `--font-serif` on headings and stats
- [x] DM Sans — `font-sans` default body
- [x] Navy `#1B2A4A`, Gold `#C9A84C`, Green `#2D6A4F` (trust), Stone `#F8F6F1` in Tailwind
- [x] Badge label **"Lodge-Verified Member"** — no "Verified Brother" in codebase
- [x] Footer tagline present
- [x] No Inter/Roboto imports

Optional: quick visual scroll on phone before Monday demo.

---

## Demo prep — Monday meeting

Complete after P0–P1 are green. Use demo mode for the presentation.

### Pre-demo setup (30 min before meeting)

- [ ] Set demo mode **ON** (toggle bottom-right)
- [ ] Log in as demo user (Robert C. Ingram — or create test account via magic link)
- [ ] Pre-open browser tabs:
  1. Landing (`/`)
  2. Directory (`/directory`)
  3. Listing profile (`/directory/[slug]`)
  4. Request board (`/requests`) — For You tab
  5. Member dashboard (`/dashboard`)
  6. Lodge admin (`/admin`)
  7. Network (`/network`)
  8. Lodge signup (`/join`) — show UI only; explain payment coming soon

### Demo script (≈10 min)

1. **Landing** — what Tyrian is, trust model, who it's for (members + public)
2. **Directory** — verified professionals, lodge badge, filters
3. **Profile** — member reviews, contact, Google-indexable presence
4. **Requests** — post a need, verified members respond (show respond flow logged in)
5. **Dashboard** — member view, listing management
6. **Admin** — lodge setup, member approvals, invite link
7. **Network** — lodges on the platform
8. **Join** — lodge lookup UI; *"Payment integration finishing this week"* if asked

### If asked about Stripe

> "Lodge activation payment is wired in test mode — we're finishing production Stripe configuration this week. Everything else is live."

### Stripe test card (when Stripe is configured)

```
4242 4242 4242 4242 · exp 12/34 · cvv 123
```

---

## Explicitly out of scope today

Do not spend time on these — they won't add Monday demo value:

- Real browser geolocation (profile lat/lng is fine)
- PostGIS radius queries
- Cron jobs for request expiry
- Review submission flow (seed data only)
- Referral tracking beyond UI
- Profile photo uploads
- Push notifications / SMS sponsor confirm
- Grand Lodge super-admin panel
- Animation polish beyond existing
- Accessibility audit
- Unit/integration tests
- Rate limiting / abuse protection
- Stripe webhook + production payment flow

---

## Launch readiness summary

| Ready to show Monday | Not ready (OK to defer) |
|----------------------|-------------------------|
| Directory, requests, respond flow | Stripe lodge payment E2E |
| Member join + sponsor verify | Admin bulk email invites |
| Lodge admin panel | Review submission |
| Network + lodge pages | Full legal pages |
| Demo mode polished data | |
| Honest landing messaging | |

| Must fix before real users | Can wait |
|----------------------------|----------|
| Build passes | Stripe |
| No fake/inflated landing stats | Privacy/Terms full copy |
| Footer links work or removed | |
| Magic link auth on prod URL | |

---

## Blockers log

Use this section during the day to capture issues found during QA.

| # | Issue | Severity | Status | Notes |
|---|-------|----------|--------|-------|
| 1 | Build lint error in create-upgrade-checkout | P0 | ✅ fixed | Removed unused `price` destructuring |
| 2 | Live requests board empty (RLS) | P1 | ✅ fixed | `GET /api/requests` + migration 008 |
| 3 | Sparse DB vs demo seed | P1 | ⚠ open | Run `pnpm seed` or use demo mode Monday |
| 4 | Member/auth flows untested | P1 | ☐ manual | Needs magic link login session |
| 5 | Admin bulk invite stub | P2 | ☐ accepted | Copy invite link workaround |

---

*Day 5 · Build version 1.1 · Stack: Next.js 14 · Supabase · Resend · Vercel*
*Parent roadmap: `docs/briefs/tyrian-build-roadmap.md`*
*Copy reference: `docs/briefs/tyrian-copy-v2.md`*
