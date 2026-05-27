# Tyrian — Full Site Copy v2
## SEO-Optimized · Brand-True · Ready for Implementation

### Implementation notes
- Replace ALL existing copy with what's written here — do not merge or blend with old copy
- "Lodge-Verified Member" replaces "Verified Brother" everywhere as the badge label
- `[DYNAMIC]` fields are populated from listing data
- Authenticated pages (/dashboard, /admin) retain warmer tone intentionally — see those sections
- Do not add copy not listed here without flagging it

---

## Page 1: Landing Page `/`

### SEO meta
```
Title tag:    Tyrian — The Verified Business Network for Freemasons
Meta desc:    Tyrian connects lodge-verified Freemason professionals with members and
              the public across the US. Browse trusted contractors, attorneys, and
              service providers — every listing backed by a real community.
OG title:     Tyrian · Verified Masonic Professionals
OG desc:      Find or list lodge-verified businesses. The professional network
              built on Freemasonry's foundation of trust.
```

### Navbar
```
Logo wordmark:   TYRIAN
Nav links:       Directory    Requests    Sign In    List Your Business [CTA button]
```

### Hero section
```
Eyebrow:    The professional network for Freemasons

H1:         Hire with confidence.
            Get found by your community.

Subhead:    Every professional on Tyrian is lodge-verified and accountable to
            their community. Browse trusted service providers across the US —
            or list your business and start receiving referrals today.

CTA primary:    Browse the Directory
CTA secondary:  List Your Business
```

### Stats bar (below hero)
```
[Stat 1]  Verified Professionals
[Stat 2]  Lodges Represented
[Stat 3]  States Covered
[Stat 4]  Service Categories

Subtext below stats:
"Growing across Florida, Oklahoma, and beyond."
```

### How it works
```
Section heading:   How Tyrian works

Step 1
Icon:     Shield / verification
Title:    Get verified
Body:     Apply through your lodge. A sponsor confirms your membership and
          standing — the same standard of trust Freemasonry has upheld for
          centuries.

Step 2
Icon:     List / storefront
Title:    List your business
Body:     Create your professional profile in minutes. Your lodge affiliation,
          trade, location, and services — all in one place, visible to members
          and the public.

Step 3
Icon:     Handshake / connect
Title:    Get found and referred
Body:     Members search for verified professionals. The public finds you through
          Google. Every connection made on Tyrian is backed by real accountability
          — not just an algorithm.
```

### Category strip
```
Section heading:   Browse by profession

Categories (in order):
Roofing · Electrical · Plumbing · Legal · HVAC · Financial Planning ·
General Contractor · Technology · Home Inspection · Automotive ·
Landscaping · Painting

Link below:   View all categories →
```

### Trust / why Tyrian section
```
Section heading:   Accountability you can see

Left column — body copy:
Freemasonry has built one of the most trusted fraternal networks in
history. Tyrian puts that network to work — connecting lodge-verified
professionals with people who value accountability over algorithms.

Every listing on Tyrian is tied to a real person, a real lodge, and a
real community of peers. When you hire through Tyrian, you're not
relying on anonymous reviews. You're tapping into a network where
reputation has always mattered.

Right column — three proof points:

[Point 1]
Label:   Lodge-verified listings
Body:    Every professional is confirmed by a lodge sponsor before
         they can list. No anonymous profiles.

[Point 2]
Label:   Member-reviewed
Body:    Reviews come from verified members who have actually hired
         the professional — not the general public.

[Point 3]
Label:   Publicly searchable
Body:    Tyrian profiles are indexed and findable on Google — giving
         listed professionals a second business presence on the open web.
```

### Service request callout banner
```
Heading:    Can't find what you need?
Body:       Post a service request to the network. Verified professionals
            in your area will respond directly — no middleman, no fees.
CTA:        Post a Request →
```

### For members section (two-column)
```
Section heading:   Built for members. Open to all.

Column 1 — For Freemasons
Heading:    Grow your business within the network
Body:       List your business, receive referrals from fellow lodge members,
            and build a verified professional reputation that compounds over
            time. Your lodge affiliation is your credential — put it to work.
CTA:        List Your Business →

Column 2 — For the public
Heading:    Hire professionals you can trust
Body:       Every business on Tyrian has been vetted through a real community
            vetting process — not a credit card charge. Browse freely, contact
            directly, hire confidently.
CTA:        Browse the Directory →
```

### Footer
```
Logo:   TYRIAN
Tagline:   A professional network built on trust.

Column 1 — Platform
Directory
Service Requests
List Your Business
Sign In

Column 2 — Community
About Tyrian
For Lodges
Lodge Admin
Join the Network

Column 3 — Legal
Privacy Policy
Terms of Use
Contact

Bottom bar:
© 2025 Tyrian. All rights reserved. · Built on a foundation of trust.
```

---

## Page 2: Business Directory `/directory`

### SEO meta
```
Title tag:    Directory — Verified Masonic Professionals | Tyrian
Meta desc:    Browse lodge-verified Freemason contractors, attorneys, financial
              advisors, and service providers across the US. Every listing on
              Tyrian is backed by a real community.
```

### Page header
```
H1:        Find a Verified Masonic Professional
Subhead:   Every listing is lodge-verified. Every professional is accountable
           to their community.
```

### Search bar
```
Placeholder:   Search by trade, name, or profession...
Button label:  Search
```

### Filter sidebar labels
```
Section heading:   Filter results

Filter 1:   Profession / Trade
            [dropdown — All Professions]

Filter 2:   State
            [dropdown — All States]

Filter 3:   Lodge
            [dropdown — All Lodges]

Filter 4:   Availability
            [toggle — Available for remote work]

Clear link:   Clear all filters
```

### Results header
```
Showing [N] verified professionals
[sorted by: Relevance ▾]
```

### Listing card anatomy
```
[Lodge-Verified Member badge — top left]       [Trade category badge — top right]

[Business Name]
[Owner full name]
[Lodge Name #Number · City, State]

[Star rating]  [N] member reviews

Services: [tag] [tag] [tag]

[Contact] button        [View Profile →] link
```

### Verified badge label (used everywhere cards appear)
```
✓  Lodge-Verified Member
```

### Banner linking to requests page
```
Can't find the right professional?
Post a service request and let the network come to you. →
```

### Empty state (no results)
```
Heading:   No verified professionals found in this area yet.
Body:      The network is growing. Post a service request and
           we'll notify matching professionals when they join.
CTA:       Post a Service Request →
```

---

## Page 3: Business Profile `/directory/[slug]`

### SEO meta (dynamic)
```
Title tag:    [Business Name] · Verified Masonic [Trade] in [City], [State] | Tyrian
Meta desc:    [Business Name] is a lodge-verified [Trade] serving [City], [State].
              View their profile, read member reviews, and connect on Tyrian —
              the professional network for Freemasons.
```

### Profile page structure

**Breadcrumb**
```
Directory  ›  [Trade Category]  ›  [Business Name]
```

**Profile header**
```
[Business Name]
[Owner Full Name]

[Lodge-Verified Member badge]   [Trade category badge]

[Lodge Name #Number · City, State]
Member since [Year]
```

**Verification statement** (below header, prominent)
```
Lodge-verified member in good standing.
Confirmed by a lodge sponsor and accountable to their Masonic community.
```

**About section**
```
H2:   About [Business Name]
[Description paragraph — pulled from member profile]
```

**Services offered**
```
H2:   Services
[List of services as tags/pills]
```

**Contact section**
```
H2:   Get in touch

[Phone number or "Contact via Tyrian"]
[Email or contact form]
[Website link if listed]
[Service area: City, State + radius]

[Contact button: "Contact [First Name] →"]

Note below button:
Tyrian members are verified professionals accountable to their lodge community.
```

**Referral note**
```
Label:   Referred by a member?
Body:    If a Tyrian member sent you here, mention their name when
         you reach out. Referrals are tracked and credited within
         the network.
```

**Member reviews section**
```
H2:   Member reviews

Review card:
[Star rating]
"[Review text]"
— [Reviewer first name + last initial] · [Lodge Name] · [Date]

Badge on each review:   ✓ Verified member review

Empty state:
No member reviews yet. Members who have hired [First Name]
can leave a verified review from their dashboard.
```

**Related listings sidebar**
```
H3:   Other verified professionals in [State]

[3 listing cards — same trade or same state]

Link:   View all professionals in [State] →
```

---

## Page 4: Service Request Board `/requests`

### SEO meta
```
Title tag:    Service Requests — Find a Verified Masonic Professional | Tyrian
Meta desc:    Post a service request on Tyrian and connect with lodge-verified
              Freemason professionals in your area. Free to browse. Members respond directly.
```

### Page header
```
H1:       Post a Request. Let the Network Respond.
Subhead:  Browse open service requests or post your own. Verified Masonic
          professionals on Tyrian respond directly — no bidding wars, no fees.
```

### Sidebar — post a request CTA
```
Card heading:    Need a service?
Card body:       Describe what you need and where you are. Verified professionals
                 in your area will see your request and reach out directly.
CTA button:      Post a Request
```

### Sidebar — filter labels
```
Filter heading:   Filter requests

Profession:       [dropdown — All Professions]
State:            [dropdown — All States]
Status:           [radio — Open / Filled / All]
Posted:           [dropdown — Last 7 days / Last 30 days / All time]
```

### Request card anatomy
```
[Trade category badge]                    [Time posted — e.g. "2 days ago"]

"[Request title — what they need]"

[Full Name] · [Lodge Name #Number] · [City, State]
[Lodge-Verified Member badge — small]

Budget: [amount]     Timeline: [timeframe]

[N responses]        [Respond to this request →]  (members only)

Non-member prompt:   Sign in to respond →
```

### Post a Request modal
```
Modal heading:   Post a service request

Field 1:
Label:        What do you need?
Placeholder:  e.g. "Licensed electrician for panel upgrade"

Field 2:
Label:        Profession / trade category
Placeholder:  [Select a category]

Field 3 (two columns):
Label:        City               State
Placeholder:  Your city          [Select state]

Field 4:
Label:        Budget (optional)
Placeholder:  e.g. "$1,500" or "Flexible"

Field 5:
Label:        Timeline
Options:      ASAP / Within 1 week / Within 1 month / Flexible

Field 6:
Label:        Additional details
Placeholder:  Any other information that would help professionals
              understand your request...

Submit button:   Post to the Network

Privacy note below button:
Your request is visible to verified Tyrian members.
Your contact details are only shared when you choose to respond.

Success toast:
✓  Your request has been posted. Verified professionals in your
   area have been notified.
```

---

## Page 5: Member Dashboard `/dashboard`
*Authenticated — warmer tone intentional. Not indexed by Google.*

### SEO meta
```
No index tag:   <meta name="robots" content="noindex">
```

### Page header
```
Greeting:      Welcome back, [First Name].
Lodge line:    [Lodge Name #Number] · [City, State]
```

### Stats row (4 metric cards)
```
Card 1:   Profile Views
          [N]  this month

Card 2:   Referrals Received
          [N]  total

Card 3:   Member Reviews
          [N]  on your profile

Card 4:   Profile Completion
          [N]%
          [Progress bar]
          [Complete your profile →] if under 100%
```

### Your listing card
```
Section heading:   Your listing

[Business Name]
[Trade category badge]   [Lodge-Verified Member badge]
[City, State]

[Status: Active / Pending / Inactive]

[Edit Listing] button     [Preview Public Profile →] link
```

### Recent inquiries
```
Section heading:   Recent inquiries

Inquiry card:
[Name or "Anonymous visitor"]
[Date · Source: Direct search / Referral]
[Message preview if available]
[Reply →] link

Empty state:
No inquiries yet. Make sure your profile is complete and your
contact preferences are set.
```

### Refer a member
```
Section heading:   Grow the network

Body:   Know a fellow lodge member with a business? Invite them to
        list on Tyrian. When they join, you'll be credited as their
        referral source.

Your referral link:   tyrian.work/join?ref=[member-id]
[Copy link] button

Stat below:   You've referred [N] members to the network.
```

### Visibility toggle
```
Section heading:   Listing visibility

Option 1 (default):
●  Public listing
   Your profile is visible to members and the general public.
   Discoverable on Google.

Option 2:
○  Members only
   Your profile is visible to verified Tyrian members only.
   Not indexed publicly.

Note:   Changes take effect immediately.
```

---

## Page 6: Lodge Admin Panel `/admin`
*Authenticated — lodge leader tone. Not indexed by Google.*

### SEO meta
```
No index tag:   <meta name="robots" content="noindex">
```

### Page header
```
Lodge name:    [Lodge Name #Number]
Location:      [City, State]
Role:          Lodge Administrator

Subhead:       Manage your lodge's presence on Tyrian.
```

### Stats row
```
Card 1:   Active Listings
          [N]  members listed

Card 2:   Total Members
          [N]  in your lodge

Card 3:   Referrals This Month
          [N]  connections made

Card 4:   Profile Completion
          [N]%  average across lodge
```

### Coverage gap entry card
```
Card heading:   ⚠  Coverage gaps in your area
Card body:      Your lodge has [N] uncovered trade categories in
                the [City] area. Members with open requests are
                waiting for a match.
CTA:            View Gap Report →
```

### Member table
```
Section heading:   Lodge members

Table columns:
Name  |  Trade / Profession  |  Listing status  |  Verified  |  Actions

Listing status options:
[Active]      — green badge
[Pending]     — amber badge
[Not listed]  — gray badge

Verified toggle:
[✓ Verified]  — confirmed
[Pending]     — awaiting confirmation

Actions:
[View profile]   [Send invite]   [Remove]
```

### Pending approvals queue
```
Section heading:   Pending verification requests

Pending card:
[Name]
Applied [date] · Sponsor: [Sponsor name]
Lodge number provided: [#]
[Approve] button    [Request more info] button    [Decline] button

Empty state:
No pending verification requests.
```

---

## Lodge Gap Dashboard `/admin/gaps`
*Sub-page of admin. Not indexed.*

### Page header
```
Back link:   ← Back to Lodge Admin

H1:          Coverage Gap Report
Lodge:       [Lodge Name #Number] · [City, State]

Subhead:     Here's what your service area is missing. Every gap
             is an opportunity to strengthen the network for your members.
```

### Summary stats row
```
Card 1:   Trades covered
          [N]

Card 2:   Trades with gaps
          [N]
          [amber — needs attention]

Card 3:   Members who could fill gaps
          [N]
          [members not yet listed]

Card 4:   Unanswered requests this month
          [N]
          [requests with 0 responses]
```

### Uncovered trades panel
```
Section heading:   Uncovered trades in your area ([N] mi radius)

Gap row anatomy:

[Trade name]
[N] open service requests waiting   [amber badge if >0]
[No open requests yet]              [gray badge if 0]

[Invite a member to list →]   [Expand search radius →]

Divider between rows.
```

### Members who could fill gaps panel
```
Section heading:   Members who could fill these gaps

Member card:
[Full Name]
Member since [year] · [Occupation / trade from profile]
Not yet listed on Tyrian

[Send listing invite →] button
```

### Invite modal
```
Modal heading:   Send a listing invite to [First Name]?

Preview message:
"[First Name] — your lodge has open requests for a [trade]
in the [City] area with no one to fill them. Listing your
business on Tyrian takes minutes and puts you directly in
front of members who need your services.

Join here: tyrian.work/join?ref=[lodge-id]"

[Send Invite] button    [Cancel] link

Success toast:
✓  Invite sent to [First Name].
```

### Unanswered requests section
```
Section heading:   Unanswered requests in your area

[3-4 request cards pulled from /requests seed data
 matching lodge's city/state with 0 responses]

Link below:   View all open requests →
```

---

## Global UI strings (used across all pages)

### Verified badge (all variants)
```
Full:     ✓  Lodge-Verified Member
Short:    ✓  Verified
Tooltip:  This professional has been confirmed by a lodge sponsor
          and is an active member in good standing.
```

### Trade category badges
```
Roofing · Electrical · Plumbing · Legal · HVAC · Financial Planning ·
General Contractor · Technology · Home Inspection · Automotive ·
Landscaping · Painting · [Other]
```

### Generic CTA button labels
```
Primary actions:
Browse the Directory
List Your Business
Post a Request
Contact [Name]
View Profile

Secondary actions:
Learn how it works
View all professionals in [State]
View gap report
Send listing invite
Copy referral link

Auth actions:
Sign In
Create Account
Sign Out
```

### 404 / error page
```
Heading:   This page doesn't exist — but the network does.
Body:      Head back to the directory to find verified Masonic
           professionals near you.
CTA:       Browse the Directory →
```

### Loading / empty states
```
Directory loading:     Finding verified professionals...
Requests loading:      Loading open requests...
Profile loading:       Loading profile...
Generic empty:         Nothing here yet. Check back soon.
```

---

*Copy version: 2.0 — SEO-optimized, brand-true*
*Placeholder name in use: Tyrian | Domain: tyrian.work*
*Final brand name and logo TBD — all instances of "Tyrian" are placeholder*
