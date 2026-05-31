# Tyrian — Request Board Respond Flow
## Standalone Build Brief

This brief covers the complete respond flow for the request board.
Read entirely before writing any code. This is a trust-critical feature
— every decision here directly affects the platform's core value proposition.

---

## The principle

Browsing is public. Responding is members-only.

A guest can see every open request and post their own.
Only a lodge-verified member can respond to a request.
Contact details are never exposed in the public card — only through
the respond flow after verification is confirmed.

This is not just a restriction. It is a feature. The copy on the
request board should say so explicitly:
*"Only lodge-verified members can respond to requests."*
That is a trust signal for the requester, not fine print.

---

## Schema additions

Run in Supabase SQL editor before writing any application code.

```sql
-- ─── REQUEST RESPONSES ─────────────────────────────────────────────────────
create table request_responses (
  id              uuid primary key default uuid_generate_v4(),
  request_id      uuid not null references requests(id) on delete cascade,
  responder_id    uuid not null references profiles(id) on delete cascade,
  message         text,
  status          text not null default 'sent'
                  check (status in ('sent', 'viewed', 'accepted', 'declined', 'completed')),
  responder_contact_revealed  boolean not null default false,
  requester_contact_revealed  boolean not null default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  -- A member can only respond once per request
  unique(request_id, responder_id)
);

-- RLS
alter table request_responses enable row level security;

-- Responder can see their own responses
create policy "responses_responder_read" on request_responses
  for select using (auth.uid() = responder_id);

-- Requester can see responses to their requests
-- (for member requesters — guest requesters access via token in email)
create policy "responses_requester_read" on request_responses
  for select using (
    request_id in (
      select id from requests where profile_id = auth.uid()
    )
  );

-- Only verified members can insert responses
create policy "responses_verified_insert" on request_responses
  for insert with check (
    auth.uid() = responder_id
    and auth.uid() in (
      select id from profiles where verification_status = 'verified'
    )
  );

-- Only the responder can update their own response
create policy "responses_responder_update" on request_responses
  for update using (auth.uid() = responder_id);

-- ─── REQUEST RESPONSE NOTIFICATIONS ─────────────────────────────────────────
-- Track which responses the requester has been emailed about
alter table requests
  add column if not exists requester_email      text,
  add column if not exists requester_notify_token text unique
    default encode(gen_random_bytes(32), 'hex');

-- The notify token is used in email links so the requester can view
-- their responses without needing a Tyrian account.

-- ─── AUTO-UPDATE TIMESTAMP ───────────────────────────────────────────────────
create trigger request_responses_updated_at
  before update on request_responses
  for each row execute function update_updated_at();

-- ─── INDEX ───────────────────────────────────────────────────────────────────
create index request_responses_request_idx on request_responses(request_id);
create index request_responses_responder_idx on request_responses(responder_id);
```

---

## The four states of the Respond button

The Respond button on every request card has four distinct states.
Each renders differently. Do not use a single disabled button for all
non-authenticated states — each state needs its own message.

### State 1 — Not logged in

```tsx
<button
  onClick={() => router.push('/login?redirect=/requests')}
  style={{ /* outlined, not filled */ }}
>
  Sign in to respond
</button>

// Below the button, small text:
<p>Only lodge-verified members can respond to requests.</p>
```

### State 2 — Logged in, verification pending

```tsx
<button disabled>
  Verification pending
</button>

<p>
  Your sponsor hasn't confirmed your membership yet.
  You can respond once you're verified.
</p>
```

### State 3 — Logged in, verified, already responded

```tsx
<button disabled style={{ background: '#E1F5EE', color: '#0F6E56' }}>
  ✓ You responded
</button>

<p style={{ color: '#0F6E56' }}>
  <a href="/dashboard/responses">View your response →</a>
</p>
```

### State 4 — Logged in, verified, not yet responded

```tsx
<button
  onClick={() => openRespondModal(request)}
  style={{ background: '#C9A84C', color: '#1B2A4A' }}
>
  Respond to this request
</button>
```

---

## The respond modal

Opens when a verified member clicks "Respond to this request."
This is an in-platform message — not a phone number reveal.

### Modal structure

```
Modal heading:
  "Respond to [Request Title]"

Requester info strip (read-only, shows them who they're responding to):
  [Name] · [Lodge Name #Number] · [City, State]
  Posted [time ago]

──────────────────────────────────────────────────────────

Your response:
  [Textarea — placeholder:]
  "Introduce yourself and let them know you can help.
   Your name and lodge will be included automatically."

  Character limit: 500
  Required: no (they can send without a message — 
            their identity is the message)

──────────────────────────────────────────────────────────

Your contact info (shown to requester after you respond):
  This is pulled from their verified profile.
  Read-only display — they can't edit it here.
  Shows what the requester will see:

  ┌──────────────────────────────────────────────────┐
  │ [Name]                                           │
  │ [Trade / Occupation]                             │
  │ [Lodge Name #Number] · [City, State]             │
  │ ✓ Lodge-Verified Member                          │
  │ [Phone — if on profile]                          │
  │ [Email — if on profile]                          │
  │                                                  │
  │ Missing contact info?                            │
  │ [Update your profile →]  (opens in new tab)      │
  └──────────────────────────────────────────────────┘

  Note below: "Your name, lodge, and contact details will
  be shared with the person who posted this request."

──────────────────────────────────────────────────────────

[Cancel]   [Send Response →]
```

### Validation

- Member must have at least a name and lodge on their profile
- If phone AND email are both missing from profile: show a warning
  but don't block — they can still respond, the requester will
  see their name and lodge and can find them in the directory

### On submit

1. Insert row into `request_responses`
2. Increment `requests.responses_count` by 1
3. Update request status to 'active' if it was 'open'
4. Send notification email to requester (see email spec below)
5. Close modal, show success state on the card:
   ```
   ✓ Response sent
   [Name] from [Lodge Name] will be notified.
   ```

---

## API route: submit response

### `app/api/requests/[requestId]/respond/route.ts`

```typescript
// POST /api/requests/[requestId]/respond
// Body: { message?: string }
// Auth: required — verified member only

export async function POST(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Verify the responder is a verified member ─────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, lodge_id, verification_status, trade_category, phone, email')
    .eq('id', user.id)
    .single()

  if (!profile || profile.verification_status !== 'verified') {
    return Response.json(
      { error: 'Only verified members can respond to requests' },
      { status: 403 }
    )
  }

  // ── Check the request exists and is open/active ───────────────────────────
  const { data: req } = await supabase
    .from('requests')
    .select('*, lodges(name, number)')
    .eq('id', params.requestId)
    .in('status', ['open', 'active'])
    .single()

  if (!req) {
    return Response.json(
      { error: 'Request not found or no longer accepting responses' },
      { status: 404 }
    )
  }

  // ── Check for duplicate response ──────────────────────────────────────────
  const { data: existing } = await supabase
    .from('request_responses')
    .select('id')
    .eq('request_id', params.requestId)
    .eq('responder_id', user.id)
    .single()

  if (existing) {
    return Response.json(
      { error: 'You have already responded to this request' },
      { status: 409 }
    )
  }

  const { message } = await request.json()

  // ── Insert the response ───────────────────────────────────────────────────
  const { error: insertError } = await supabase
    .from('request_responses')
    .insert({
      request_id:   params.requestId,
      responder_id: user.id,
      message:      message || null,
      status:       'sent',
    })

  if (insertError) {
    return Response.json({ error: 'Failed to submit response' }, { status: 500 })
  }

  // ── Update request status and count ──────────────────────────────────────
  await supabase
    .from('requests')
    .update({
      responses_count: req.responses_count + 1,
      status: req.status === 'open' ? 'active' : req.status,
    })
    .eq('id', params.requestId)

  // ── Get responder's lodge for the email ───────────────────────────────────
  const { data: lodge } = await supabase
    .from('lodges')
    .select('name, number')
    .eq('id', profile.lodge_id)
    .single()

  // ── Send notification email to requester ─────────────────────────────────
  await sendResponseNotification({
    requesterEmail:   req.requester_email || req.posted_by_email,
    requesterName:    req.posted_by_name,
    notifyToken:      req.requester_notify_token,
    requestTitle:     req.title,
    requestId:        req.id,
    responderName:    profile.full_name,
    responderTrade:   profile.trade_category,
    responderLodge:   lodge ? `${lodge.name} #${lodge.number}` : 'Verified Member',
    responderPhone:   profile.phone,
    responderEmail:   profile.email,
    message:          message || null,
  })

  return Response.json({ success: true })
}
```

---

## API route: view responses (requester — token-based, no auth required)

### `app/api/requests/[requestId]/responses/route.ts`

```typescript
// GET /api/requests/[requestId]/responses?token=[notify_token]
// No auth required — token from email link
// Returns responses for this request if token matches

export async function GET(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  // Option A: authenticated member viewing their own request
  const { data: { user } } = await supabase.auth.getUser()

  // Option B: guest requester using token from email
  let isAuthorized = false

  if (user) {
    const { data: req } = await supabase
      .from('requests')
      .select('profile_id')
      .eq('id', params.requestId)
      .single()
    isAuthorized = req?.profile_id === user.id
  }

  if (!isAuthorized && token) {
    const { data: req } = await supabase
      .from('requests')
      .select('requester_notify_token')
      .eq('id', params.requestId)
      .single()
    isAuthorized = req?.requester_notify_token === token
  }

  if (!isAuthorized) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: responses } = await supabase
    .from('request_responses')
    .select(`
      id, message, status, created_at,
      profiles (
        full_name, trade_category, phone, email, verification_status,
        lodges ( name, number, city, state )
      )
    `)
    .eq('request_id', params.requestId)
    .order('created_at', { ascending: true })

  return Response.json({ responses: responses || [] })
}
```

---

## Response notification email

### `emails/request-response.tsx`

**Subject:** `[Name] from [Lodge] responded to your Tyrian request`

```
Hi [RequesterName],

A verified Masonic professional has responded to your request on Tyrian.

──────────────────────────────────────────────────────────────────
Your request: "[Request Title]"
──────────────────────────────────────────────────────────────────

[Name]
[Trade / Occupation]
[Lodge Name #Number] · [City, State]
✓ Lodge-Verified Member

[If message]: "[message text]"

Contact [FirstName]:
[Phone number — if available]
[Email address — if available]

──────────────────────────────────────────────────────────────────

[View all responses to your request →]
Links to: /requests/[id]/responses?token=[notify_token]
This link works without signing in.

──────────────────────────────────────────────────────────────────

[If 0 other responses]:
  "[Name] is the first to respond. Reply soon — 
   great professionals get hired fast."

[If N other responses]:
  "[N] other verified members have also responded.
   View all responses →"

──────────────────────────────────────────────────────────────────

Are you a Freemason? Create a free account to post requests,
respond to others, and connect with your lodge network.
[Join Tyrian →]  → /login

Built on trust. Proven by the craft.
Tyrian · tyrian.work
```

---

## Response view page (for requesters)

### `app/requests/[id]/responses/page.tsx`

Accessible via:
- Authenticated members who posted the request: no token needed
- Guest requesters: `?token=[notify_token]` from email link

### Page structure

```
Back:  ← Back to request board

Header:
  "Responses to your request"
  "[Request Title]"
  [N] verified members responded

──────────────────────────────────────────────────────────────────

[For each response, a response card]:

  ✓ Lodge-Verified Member

  [Name]
  [Trade / Occupation]
  [Lodge Name #Number] · [City, State]

  [If message]:
    "[message text]"
    — sent [time ago]

  Contact:
    📞 [phone]   ✉ [email]

  [Mark as hired →]  ← updates request to 'filled', triggers review prompt

──────────────────────────────────────────────────────────────────

[Empty state]:
  No responses yet.
  We'll email you the moment a verified member responds.

──────────────────────────────────────────────────────────────────

[Bottom CTA — for guest requesters only]:
  Are you a Freemason? You can also respond to requests
  from other members — and list your own services.
  [Create a free account →]
```

---

## Dashboard: member's sent responses

### Add to `app/dashboard/page.tsx`

A "Your Responses" section showing what the logged-in member has
responded to, and the current status of each.

```
Section heading: Your responses

Response row:
  "[Request Title]"
  [Name] · [Lodge] · [City, State]
  Responded [time ago] · Status: [Sent / Viewed / Accepted / Completed]

  [If status = 'accepted']:
    ✓ They're interested. Reach out to close the job.
    [View their contact info →]
```

Status updates:
- 'sent' → 'viewed' when the requester opens the response view page
- 'accepted' → set manually if you build a two-way confirmation UX
  (optional for now — leave for a later sprint)
- 'completed' → triggers the 14-day review prompt

---

## Copy updates to the request board

### Request card — public view (not logged in)

Below each card's footer, replace the current stub button with:

```tsx
<div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f5f0e8' }}>
  <p style={{ fontSize: '12px', color: '#6B7280' }}>
    <span style={{ color: '#2D6A4F', fontWeight: 500 }}>
      ✓ Only lodge-verified members can respond.
    </span>
    {' '}
    <a href="/login" style={{ color: '#1B2A4A', textDecoration: 'underline' }}>
      Sign in to respond →
    </a>
  </p>
</div>
```

### Request board page header — add trust callout

Below the page subheadline, add a small trust strip:

```tsx
<div style={{
  display: 'flex', alignItems: 'center', gap: '8px',
  padding: '8px 14px',
  background: '#E1F5EE',
  borderRadius: '8px',
  marginBottom: '1.5rem'
}}>
  <span style={{ color: '#0F6E56', fontSize: '14px' }}>✓</span>
  <p style={{ fontSize: '13px', color: '#0F6E56', margin: 0 }}>
    Only lodge-verified members can respond to requests.
    Contact details are kept private until a member responds.
  </p>
</div>
```

### Post a Request modal — contact privacy note

Update the email field helper text (already drafted in Day 3 brief)
to explicitly state the privacy model:

```
Label:    "Where should verified members reach you?"
Helper:   "Your contact details are shared only with lodge-verified 
           members who respond through Tyrian — never publicly."
```

---

## Files to create or modify

```
New:
  app/api/requests/[requestId]/respond/route.ts     ← Submit response
  app/api/requests/[requestId]/responses/route.ts   ← View responses (token)
  app/requests/[id]/responses/page.tsx              ← Response view page
  emails/request-response.tsx                       ← Notification email
  components/RespondModal.tsx                       ← Respond modal component
  components/ResponseCard.tsx                       ← Individual response card

Modified:
  components/RequestCard.tsx    ← Four-state respond button
  app/requests/page.tsx         ← Trust callout strip, import RespondModal
  app/dashboard/page.tsx        ← Add "Your Responses" section
```

---

## Verification checklist

```
Respond button states:
  [ ] Not logged in → "Sign in to respond" button, trust note below
  [ ] Logged in, pending → "Verification pending" disabled button
  [ ] Logged in, verified, already responded → "✓ You responded" state
  [ ] Logged in, verified → "Respond to this request" active button

Respond modal:
  [ ] Opens correctly for verified members only
  [ ] Shows requester info strip (read-only)
  [ ] Shows member's own contact info preview
  [ ] Textarea optional — can submit without a message
  [ ] Warns if phone and email both missing from profile
  [ ] Submits correctly — inserts to request_responses
  [ ] Duplicate response returns 409, shows friendly message
  [ ] Success state shows on card after submit

API:
  [ ] 401 for unauthenticated requests
  [ ] 403 for non-verified members
  [ ] 404 for closed/filled requests
  [ ] 409 for duplicate responses
  [ ] responses_count increments correctly
  [ ] Request status changes open → active on first response
  [ ] Notification email sends within 60 seconds of response

Response notification email:
  [ ] Subject line includes responder name and lodge
  [ ] Responder's contact info shown if available
  [ ] Message included if provided
  [ ] "View all responses" link uses notify_token (not auth)
  [ ] Link works for guest requesters without an account

Response view page:
  [ ] Accessible via auth (member requesters)
  [ ] Accessible via token (guest requesters, from email link)
  [ ] 401 for requests with neither valid auth nor valid token
  [ ] Shows all responses with full responder details
  [ ] "Mark as hired" updates request to 'filled'
  [ ] Empty state shows correctly

Dashboard:
  [ ] "Your Responses" section shows member's sent responses
  [ ] Status label correct for each response

Copy:
  [ ] Trust callout strip on request board page
  [ ] "Sign in to respond" + trust note on public cards
  [ ] Contact privacy note on Post a Request modal email field
```

---

*Request board respond flow — standalone brief.*
*This is a trust-critical feature. Every piece of copy and every*
*access gate reinforces the same message: verified members only.*
