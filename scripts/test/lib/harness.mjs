// Shared harness for Tyrian integration suites.
// Runs against the local dev server + live (clean) Supabase dev DB.
// Creates uniquely-tagged rows and cleans them up. No real emails are sent
// in assertions — we assert on DB state and HTTP responses instead.
//
// Run a suite:  node --env-file=.env.local scripts/test/suites/<name>.suite.mjs
import { createClient } from '@supabase/supabase-js'
import { createHmac, randomBytes } from 'crypto'

export const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('Missing Supabase env (URL / service / anon).')
  process.exit(1)
}

export const REF = new URL(SUPABASE_URL).hostname.split('.')[0]
export const COOKIE_KEY = `sb-${REF}-auth-token`

export const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Public anon client — mirrors what ships in every browser. Use to verify RLS /
// column grants actually hide PII from unauthenticated callers.
export function anonClient() {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------
export function createSuite(name) {
  let pass = 0
  let fail = 0
  const failures = []
  console.log(`\n${'='.repeat(60)}\n  ${name}\n${'='.repeat(60)}`)

  const ok = (cond, msg) => {
    if (cond) {
      pass++
      console.log(`  ✓ ${msg}`)
    } else {
      fail++
      failures.push(msg)
      console.log(`  ✗ ${msg}`)
    }
    return !!cond
  }
  const eq = (actual, expected, msg) =>
    ok(actual === expected, `${msg} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`)
  const section = (t) => console.log(`\n-- ${t}`)
  const summary = () => {
    console.log(`\n  ${name}: ${pass} passed, ${fail} failed`)
    return { pass, fail, failures }
  }
  return { ok, eq, section, summary }
}

// ---------------------------------------------------------------------------
// Uniqueness helpers
// ---------------------------------------------------------------------------
const RUN = Date.now().toString(36) + randomBytes(2).toString('hex')
export const tag = (s) => `__test_${RUN}_${s}`
export const testEmail = (s) => `tyrian.test+${RUN}.${s}@example.com`
export const uniq = () => randomBytes(6).toString('hex')

// ---------------------------------------------------------------------------
// Cleanup registry
// ---------------------------------------------------------------------------
const cleanups = []
export const onCleanup = (fn) => cleanups.push(fn)

const trackedUsers = new Set()
const trackedLodges = new Set()
const trackedRequests = new Set()

export function trackUser(id) { if (id) trackedUsers.add(id) }
export function trackLodge(id) { if (id) trackedLodges.add(id) }
export function trackRequest(id) { if (id) trackedRequests.add(id) }

export async function cleanupAll() {
  // Children first.
  for (const id of trackedRequests) {
    await admin.from('request_responses').delete().eq('request_id', id)
    await admin.from('requests').delete().eq('id', id)
  }
  for (const id of trackedUsers) {
    await admin.from('request_responses').delete().eq('responder_id', id)
    await admin.from('reviews').delete().eq('reviewer_id', id)
    await admin.from('listings').delete().eq('profile_id', id)
    await admin.from('sponsor_confirmations').delete().eq('profile_id', id)
    await admin.from('requests').delete().eq('profile_id', id)
    // Break circular FKs before deleting the profile: a lodge may point back at
    // this user via claim_code_claimed_by (e.g. after a primary-admin transfer).
    await admin.from('lodges').update({ claim_code_claimed_by: null }).eq('claim_code_claimed_by', id)
    await admin.from('profiles').delete().eq('id', id)
    try { await admin.auth.admin.deleteUser(id) } catch { /* may not exist */ }
  }
  for (const id of trackedLodges) {
    await admin.from('lodges').delete().eq('id', id)
  }
  for (const fn of cleanups.reverse()) {
    try { await fn() } catch (e) { console.error('cleanup error:', e.message) }
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
export async function createUser({ email, password = 'TestPassw0rd!' + uniq(), confirm = true, meta = {} } = {}) {
  const addr = email || testEmail('u' + uniq())
  const { data, error } = await admin.auth.admin.createUser({
    email: addr,
    password,
    email_confirm: confirm,
    user_metadata: meta,
  })
  if (error) throw new Error(`createUser failed: ${error.message}`)
  trackUser(data.user.id)
  return { id: data.user.id, email: addr, password }
}

export async function upsertProfile(id, fields = {}) {
  const { error } = await admin.from('profiles').upsert(
    { id, verification_status: 'verified', ...fields },
    { onConflict: 'id' }
  )
  if (error) throw new Error(`upsertProfile failed: ${error.message}`)
}

export async function createLodge(fields = {}) {
  const n = uniq()
  const base = {
    name: tag('Lodge ' + n),
    number: String(1000 + Math.floor(Math.random() * 8999)),
    state: 'FL',
    city: 'Tampa',
    status: 'active',
    tier: 'standard',
    invite_cap: 100,
    invites_sent: 0,
    slug: tag('lodge-' + n),
  }
  const { data, error } = await admin.from('lodges').insert({ ...base, ...fields }).select('*').single()
  if (error) throw new Error(`createLodge failed: ${error.message}`)
  trackLodge(data.id)
  return data
}

export async function createListing(profileId, fields = {}) {
  const base = {
    profile_id: profileId,
    business_name: tag('Biz ' + uniq()),
    trade_category: 'Plumbing',
    city: 'Tampa',
    state: 'FL',
    remote_eligible: false,
    visibility: 'public',
    is_active: true,
    views_count: 0,
    member_review_count: 0,
  }
  const { data, error } = await admin.from('listings').insert({ ...base, ...fields }).select('*').single()
  if (error) throw new Error(`createListing failed: ${error.message}`)
  return data
}

// A verified member who owns an active listing = an eligible "pro".
export async function createPro({ trade = 'Plumbing', city = 'Tampa', state = 'FL', lat = 27.95, lng = -82.46, lodgeId = null, optIn = true } = {}) {
  const user = await createUser()
  await upsertProfile(user.id, {
    full_name: tag('Pro'),
    email: user.email,
    verification_status: 'verified',
    request_emails_enabled: optIn,
    lodge_id: lodgeId,
    city, state, lat, lng,
  })
  const listing = await createListing(user.id, { trade_category: trade, city, state, lat, lng })
  return { ...user, listingId: listing.id }
}

// ---------------------------------------------------------------------------
// Session minting -> @supabase/ssr cookie
// ---------------------------------------------------------------------------
function toBase64Url(str) {
  return Buffer.from(str, 'utf8').toString('base64url')
}

// Mirrors @supabase/ssr createChunks: single cookie if <= 3180, else .0/.1...
// Encoded value is pure ASCII (base64url + "base64-" prefix), so we slice plainly.
function buildCookieHeader(session) {
  const encoded = 'base64-' + toBase64Url(JSON.stringify(session))
  const MAX = 3180
  if (encoded.length <= MAX) {
    return `${COOKIE_KEY}=${encoded}`
  }
  const parts = []
  let rest = encoded
  let i = 0
  while (rest.length > 0) {
    parts.push(`${COOKIE_KEY}.${i}=${rest.slice(0, MAX)}`)
    rest = rest.slice(MAX)
    i++
  }
  return parts.join('; ')
}

// Returns a Cookie header string carrying a valid logged-in session.
export async function mintCookie(email, password) {
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw new Error(`mintCookie failed: ${error?.message}`)
  return buildCookieHeader(data.session)
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------
export async function apiFetch(path, { method = 'GET', body, cookie, headers = {} } = {}) {
  const h = { ...headers }
  if (body !== undefined) h['Content-Type'] = 'application/json'
  if (cookie) h['Cookie'] = cookie
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: h,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  })
  let json = null
  const text = await res.text()
  try { json = text ? JSON.parse(text) : null } catch { /* non-JSON (html) */ }
  return { status: res.status, json, text, headers: res.headers }
}

// ---------------------------------------------------------------------------
// Stripe webhook signing (locally signed, no Stripe round-trip)
// ---------------------------------------------------------------------------
export function signedStripeEvent(eventObject) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET not set')
  const payload = JSON.stringify(eventObject)
  const ts = Math.floor(Date.now() / 1000)
  const sig = createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex')
  return { payload, header: `t=${ts},v1=${sig}` }
}

export async function postStripeWebhook(eventObject) {
  const { payload, header } = signedStripeEvent(eventObject)
  const res = await fetch(`${BASE}/api/webhooks/stripe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': header },
    body: payload,
  })
  let json = null
  const text = await res.text()
  try { json = text ? JSON.parse(text) : null } catch { /* */ }
  return { status: res.status, json, text }
}
