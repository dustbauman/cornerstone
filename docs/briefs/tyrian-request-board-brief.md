# Tyrian — Request Board Architecture
## Feature Brief v1.0

---

## Overview

The request board is not a global chronological feed. It is a personalized, context-aware board that surfaces the most relevant requests to each user based on their trade, location, and lodge. As the platform scales, the board should feel more useful — not more cluttered.

The guiding principle: **the platform does the filtering, not the user.**

---

## The four feed views

Every user sees the board through one of four views. "For You" is always the default. The others are accessible via tabs at the top of the page.

### 1. For You (default — logged-in members and providers)
Personalized feed ranked by a match score derived from the user's trade category, location, and lodge. A plumber in Tulsa sees plumbing requests within 25 miles first. No manual setup required — the platform infers everything from the member's profile.

**Who sees it:** Any logged-in member or provider.
**What it shows:** Requests ranked by match score, grouped by proximity band, with a remote services strip always pinned at the top.

### 2. Your Lodge (members only)
Requests posted exclusively by verified members of the user's own lodge. The most trusted, most personal view. A brother posting here knows exactly who will see it.

**Who sees it:** Logged-in members with a confirmed lodge affiliation.
**What it shows:** Lodge-filtered requests only, ranked by recency. No geographic constraint — lodge comes first.

### 3. Your Area (all users including public)
Geographic filter showing requests within an adjustable radius. Default is 50 miles. Any trade, any lodge. Public users who browse the board without an account land here.

**Who sees it:** All users including non-members.
**What it shows:** Requests within radius, all trades, filtered by status (open/active only by default).

### 4. All Requests (all users — manual filters)
The unfiltered global board with full manual filter controls. For providers willing to travel, remote-service professionals, or anyone who wants to browse the full network. Not the default — requires a deliberate tab click to access.

**Who sees it:** All users.
**What it shows:** Every open and active request on the platform, sortable and filterable manually.

---

## Remote services — always pinned above geographic results

Legal, financial planning, accounting, IT, consulting, and any service marked "remote eligible" are location-agnostic. These appear in a dedicated "Available Nationwide" strip pinned at the top of every view, above all geographic results. They are never mixed into the local results.

This ensures:
- A Mason attorney in Oklahoma is immediately visible to a member in Florida
- Remote professionals are never buried under local trade requests they cannot fill
- The board always has content regardless of local density

---

## The match score (For You feed only)

Each request is scored against the logged-in member's profile. Higher score = higher position in the feed. All scoring is client-side — no complex backend required for the demo or v1.

| Signal | Points |
|---|---|
| Trade category matches member's listed trade | +40 |
| Request within 25 miles | +30 |
| Same lodge as member | +20 |
| Zero responses so far | +15 |
| Posted within last 48 hours | +12 |
| Budget amount listed | +8 |
| Timeline marked ASAP | +8 |
| Posted by a verified member (vs. anonymous) | +5 |

**Match labels shown on cards:**
- 70+ points → "Strong match" (green pill)
- 40–69 points → "Possible match" (amber pill)
- Under 40 points → "Different trade" (gray pill, shown below section divider)

---

## Proximity bands and section dividers

Rather than a single radius toggle, the feed is visually divided into labeled sections that expand automatically when local results are sparse.

```
── Available nationwide ──────────────────────────
[Remote-eligible requests — legal, financial, IT, etc.]

── Near you · within 25 miles ───────────────────
[Matching trade requests, close proximity]

── In your area · within 50 miles ───────────────
[Matching trade requests, wider radius]
  → Auto-shown if fewer than 3 results in 25mi band

── Other needs nearby ────────────────────────────
[Different trade requests, within 50mi]
  → Deprioritized but visible — for referral awareness

── Across [State] ────────────────────────────────
[Statewide results — shown when local results thin]
```

Section headers change dynamically based on what's available. The user always knows why they're seeing what they're seeing.

---

## Request lifecycle and board hygiene

### Request states

| State | Description | Board visibility |
|---|---|---|
| Open | Posted, 0 responses | Shown — floated higher, urgency dot if 48hrs with no response |
| Active | 1+ responses, not yet filled | Shown — requester in conversations |
| Filled | Requester marked hired | Removed from main board, archived |
| Expired | 30 days with no activity | Auto-archived, renewal email sent |
| Withdrawn | Requester cancelled | Removed immediately |

### Cleanup rules
- Requests auto-archive after **30 days** of no activity
- At **25 days**, requester receives email: "Still looking? Renew your request in one click." One-click renewal resets the 30-day clock
- "Mark as Filled" button is always visible to the requester — one tap closes the request
- Filled and expired requests are hidden from the main board but accessible in a collapsed "Completed" section on the requester's profile
- Filled requests trigger a **review prompt 14 days later** to both parties — passive review generation with no manual asking required
- Members can **flag** spam or off-topic requests — 3 flags auto-hides the request pending admin review

---

## Request card anatomy

Each card displays the following in order:

```
[Trade category badge]                    [Time posted]

"[Request title]"

[Name] · [Lodge Name #Number] · [City, State]
[Lodge-Verified Member badge — if verified]    [Urgency note if 0 responses]

Budget: [$]     Timeline: [timeframe]

[Match pill]              [N responses · respond button]
```

**Urgency signal:** If a request has been open for 48+ hours with zero responses, show a small red dot labeled "No responses yet." This creates urgency for providers without feeling alarmist.

**Same lodge highlight:** If the requester is from the member's own lodge, add a "Same lodge" green badge next to the lodge name. Brotherhood proximity is the platform's strongest trust signal — surface it.

---

## What non-members see

Public users (no account) land on the "Your Area" tab by default. They can:
- Browse open requests near them
- See who is asking (first name + lodge — no full contact details)
- See the trade category and rough budget

They cannot:
- Respond to requests
- See contact information
- Post requests without providing an email

A soft prompt appears at the top of the board for non-logged-in users:
> "Are you a Freemason? **Sign in** to respond to requests and connect with members directly."

---

## Post a Request — friction rules

The post flow requires the minimum possible information. See onboarding brief for full flow detail.

**Required fields (4):**
1. What do you need? (text)
2. Trade category (select)
3. City + State (two fields)
4. First name

**Optional fields:**
- Lodge number (shown prominently — adds trust signal to the card)
- Budget
- Timeline
- Additional details

**Email collected last** — labeled "Where should providers reach you? We won't use this for anything else." Not a signup prompt. One purpose, stated clearly.

---

## Production implementation notes (for future reference)

- Match scoring runs client-side in v1. In production, move to a server-side ranked feed using PostGIS geographic queries in Supabase for accurate radius filtering
- Request expiry handled by a Supabase cron job or Vercel serverless function — runs nightly, updates status, sends expiry emails
- "Mark as filled" triggers a Supabase row update + queues a delayed review prompt email via Resend or similar
- Flag system: increment a `flag_count` column; at 3 flags set `status = 'flagged'` and notify lodge admin
- Remote-eligible flag stored as a boolean on the request record — filter is a simple WHERE clause
- Section dividers and proximity bands implemented client-side in v1 using Haversine formula or a simple bounding box calculation

---

*Brief version: 1.0 · Part of Tyrian platform documentation*
