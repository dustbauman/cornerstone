# Cornerstone — Phase 2 Build Brief
## Service Request Board + Lodge Gap Dashboard

This brief adds two high-impact screens to the existing Cornerstone demo. These features transform the app from a passive directory into an active network connector. Match the existing design system exactly — same color palette, components, and layout patterns already established in the project.

---

## Context (what's already built)

- `/` — Landing page
- `/directory` — Business listing browse with search/filter
- `/directory/[slug]` — Individual business profile
- `/dashboard` — Member dashboard (stubbed)
- `/admin` — Lodge admin panel (stubbed)

**Do not modify existing pages.** Add new pages/components and integrate navigation links into the existing navbar and relevant existing pages.

---

## What to build

### Page 1: Service Request Board `/requests`

A bulletin board where brothers can post service needs and providers can respond. Think Craigslist meets a job board — but gated to the brotherhood and trust-verified.

#### Layout

Two-column layout on desktop, single column on mobile:
- **Left/main (70%):** Feed of open service requests (cards)
- **Right/sidebar (30%):** Post a request CTA + filter controls

#### Request card — what each card shows

```
[Trade category badge]         [Time posted — e.g. "2 days ago"]
"Need a licensed electrician for panel upgrade in Tampa, FL"
Posted by: Brother D. Harrison · Suncoast Lodge #217 · Tampa, FL
Budget: ~$1,500     Timeline: Within 2 weeks
[Verified Mason badge — small]
[2 brothers responded]  [Respond as a Brother →] button
```

- Cards should feel like a community board — not sterile, not corporate
- "Respond" button is only shown to logged-in members (for non-logged-in users, show "Sign in to respond")
- Show a "Responses" count on each card

#### Filters (sidebar)

- Trade category (dropdown — same categories as directory)
- State (FL, OK, All)
- Status: Open / Filled / All
- Posted: Last 7 days / Last 30 days / All time

#### Post a Request (sidebar CTA)

Prominent card with:
- Headline: "Need a service?"
- Subtext: "Post your request and let the brotherhood come to you."
- Button: "Post a Request" → opens a modal

#### Post a Request modal

Simple form:
- Service needed (text input)
- Trade category (select)
- City, State (two inputs)
- Budget range (optional, text input)
- Timeline (select: ASAP / Within 1 week / Within 1 month / Flexible)
- Details (textarea)
- Submit button: "Post to the Network"

For demo: form submits, shows a success toast "Your request has been posted to the brotherhood", and a new card appears at the top of the feed. No backend needed — manage state in React.

#### Seed data — 8 open requests

```js
[
  {
    id: 1,
    title: "Need a licensed electrician for panel upgrade",
    category: "Electrical",
    postedBy: "Brother D. Harrison",
    lodge: "Suncoast Lodge #217",
    location: "Tampa, FL",
    budget: "~$1,500",
    timeline: "Within 2 weeks",
    responses: 2,
    posted: "2 days ago",
    status: "open"
  },
  {
    id: 2,
    title: "Looking for a Mason attorney — estate planning",
    category: "Legal",
    postedBy: "Brother R. Calloway",
    lodge: "Gulf Coast Lodge #441",
    location: "Naples, FL",
    budget: "Flexible",
    timeline: "Within 1 month",
    responses: 1,
    posted: "4 days ago",
    status: "open"
  },
  {
    id: 3,
    title: "Roof inspection needed before home sale",
    category: "Roofing",
    postedBy: "Brother T. Simmons",
    lodge: "Acacia Lodge #123",
    location: "Tulsa, OK",
    budget: "~$300",
    timeline: "ASAP",
    responses: 3,
    posted: "1 day ago",
    status: "open"
  },
  {
    id: 4,
    title: "Small business bookkeeping — ongoing monthly",
    category: "Financial",
    postedBy: "Brother P. Nguyen",
    lodge: "Prairie Lodge #56",
    location: "Oklahoma City, OK",
    budget: "$200–400/mo",
    timeline: "Flexible",
    responses: 0,
    posted: "6 days ago",
    status: "open"
  },
  {
    id: 5,
    title: "HVAC system replacement — 2,200 sq ft home",
    category: "HVAC",
    postedBy: "Brother L. Graves",
    lodge: "Heartland Lodge #302",
    location: "Edmond, OK",
    budget: "~$6,000",
    timeline: "Within 1 month",
    responses: 1,
    posted: "3 days ago",
    status: "open"
  },
  {
    id: 6,
    title: "Website redesign for my contracting business",
    category: "Technology",
    postedBy: "Brother C. Monroe",
    lodge: "Gulf Coast Lodge #441",
    location: "St. Petersburg, FL",
    budget: "~$2,000",
    timeline: "Within 1 month",
    responses: 4,
    posted: "5 days ago",
    status: "open"
  },
  {
    id: 7,
    title: "Looking for a Mason general contractor — kitchen remodel",
    category: "General Contractor",
    postedBy: "Brother A. Fleming",
    lodge: "Keystone Lodge #88",
    location: "Orlando, FL",
    budget: "~$25,000",
    timeline: "Within 2 weeks",
    responses: 2,
    posted: "1 day ago",
    status: "open"
  },
  {
    id: 8,
    title: "Auto repair — transmission issue, daily driver",
    category: "Automotive",
    postedBy: "Brother H. Price",
    lodge: "Acacia Lodge #123",
    location: "Tulsa, OK",
    budget: "Market rate",
    timeline: "ASAP",
    responses: 0,
    posted: "12 hours ago",
    status: "open"
  }
]
```

#### Navigation integration

- Add "Requests" link to the main navbar between "Directory" and "Dashboard"
- On the `/directory` page, add a subtle banner above the listings:
  > "Can't find what you need? **Post a service request** and let the brotherhood come to you. →"
  Link it to `/requests`

---

### Page 2: Lodge Gap Dashboard `/admin/gaps`

This is a sub-page of the lodge admin panel. It shows the Worshipful Master or lodge admin exactly which trades are **missing** in their service area — and gives them a one-click way to invite brothers who fill those gaps.

This is the platform's self-growth engine. Make it feel like an **actionable intelligence dashboard**, not a report.

#### Entry point

On the existing `/admin` page, add a prominent card/section:

```
🗺️  Coverage Gaps in Your Area
Your lodge has 4 uncovered trade categories in the Tampa Bay area.
[View Gap Report →]
```

Link to `/admin/gaps`.

#### `/admin/gaps` page layout

**Header section:**
```
Acacia Lodge #123 — Tulsa, OK
Coverage Gap Report
"Here's what your service area is missing. Invite a brother to fill the gap."
```

**Summary stats row (4 cards):**
- Trades Covered: 5
- Trades with Gaps: 7
- Brothers Who Could Fill Gaps: 3 (members not yet listed)
- Requests Unanswered This Month: 4

**Main content — two panels side by side (desktop) / stacked (mobile):**

**Panel A: Uncovered Trades**

A list of trade categories with NO active listing in the lodge's service area (50mi radius). For each:

```
⚠️  Electrical
No Mason electricians within 50 miles
[2 open service requests waiting]
[Invite a brother to list →]  [Expand search radius →]
```

Seed 6–7 gap items:
- Electrical — "2 open requests waiting"
- Legal / Attorney — "1 open request waiting"
- Home Inspection — "No open requests yet"
- Landscaping — "1 open request waiting"
- Painting — "No open requests yet"
- Financial Planning — "3 open requests waiting"
- Pest Control — "No open requests yet"

**Panel B: Brothers Who Could Fill Gaps**

Members who are listed in the platform but haven't created a business listing yet, AND whose known occupation matches a gap category. (Stub data — 3 entries.)

```
Brother James E. Collins
Member since 2019 · Electrician (from profile)
Not yet listed on Cornerstone
[Send invite to list →]
```

Seed 3 entries:
- James E. Collins — Electrician — "Not yet listed"
- Patricia M. Okafor — Attorney — "Not yet listed"
- Daniel W. Ford — Landscaper — "Not yet listed"

**Invite flow (stub):**
Clicking "Send invite to list →" shows a simple modal:
```
Send listing invite to Brother Collins?

A message will be sent on your behalf:
"Brother Collins — your lodge needs a Mason electrician in the Tulsa area.
Cornerstone makes it easy to list your business and start receiving referrals
from brothers in your network. Join us: [link]"

[Send Invite]  [Cancel]
```
On confirm: show success toast "Invite sent to Brother Collins." No backend needed.

**Bottom section: Recent Unanswered Requests**

Pull 3–4 cards from the service request seed data that match the lodge's area (Tulsa/OK) with 0 responses. Label them "Unanswered in your area." This creates urgency — lodge admin sees real unmet need.

---

## Design notes

- **Maintain the existing design system exactly** — navy `#1B2A4A`, gold `#C9A84C`, off-white `#F8F6F1`, Verified Mason badge style, card patterns, etc.
- Trade category badges: use consistent colored pill badges (same as directory page)
- Gap items with open requests should feel **urgent** — use the amber badge style
- Gap items with no requests should feel **informational** — use the muted/blue badge style
- "Brothers who could fill gaps" section should feel warm and human, not like a data table
- The overall tone of the gap dashboard: empowering, not alarming. "Here's your opportunity" not "here's what's broken."
- Mobile-first on both pages — large touch targets, clear hierarchy

---

## State management notes (all client-side, no backend)

- Service request board: manage requests array in React state. New posts prepend to array. Filter by category/state/status using client-side array filters.
- Post request modal: controlled form, clears on submit, shows toast notification
- Invite modal: simple open/close state, success toast on confirm
- Active nav link: highlight "Requests" when on `/requests`, highlight "Admin" when on `/admin/*`

---

## Summary of new files

```
app/
├── requests/
│   └── page.tsx                  # Service request board
└── admin/
    └── gaps/
        └── page.tsx              # Lodge gap dashboard

components/
├── RequestCard.tsx               # Individual request card
├── PostRequestModal.tsx          # Post a request form modal
├── GapItem.tsx                   # Uncovered trade row
├── InviteModal.tsx               # Send invite to brother modal
└── ToastNotification.tsx         # Success toast (reusable)

data/
└── requests.ts                   # Seed request data
```

---

## Definition of done

- [ ] `/requests` page loads with 8 seed requests in card layout
- [ ] Filters work client-side (category, state, status)
- [ ] "Post a Request" modal opens, submits, shows toast, new card appears
- [ ] `/admin/gaps` page loads with gap analysis for Acacia Lodge #123
- [ ] 6–7 uncovered trade rows displayed with open request counts
- [ ] 3 "brothers who could fill gaps" entries shown
- [ ] Invite modal opens, confirms, shows success toast
- [ ] Unanswered requests section populated from seed data
- [ ] Gap dashboard entry card added to existing `/admin` page
- [ ] "Requests" link added to navbar
- [ ] Directory page banner linking to requests page added
- [ ] Fully responsive on mobile
- [ ] Design consistent with existing Cornerstone design system

---

*This is Phase 2 of the Cornerstone demo. Build on top of the existing codebase without modifying existing pages except for the navbar and the two integration points noted above.*
