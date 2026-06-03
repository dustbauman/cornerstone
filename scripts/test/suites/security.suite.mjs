// Security posture: RLS/column lockdown (migration 015), SSRF guard on the
// website scanner, and IP rate-limiting on the public request board.
//
// RLS checks use the PUBLIC anon key — the exact key shipped in every browser —
// so they prove what an unauthenticated attacker can actually read via the
// Supabase REST API, independent of the app's service-role code path.
import {
  admin, anonClient, apiFetch, createSuite, createUser, upsertProfile,
  createLodge, createListing, mintCookie, tag, testEmail, uniq,
} from '../lib/harness.mjs'

// Read a single column via the anon key. Returns the raw error (or null).
async function anonRead(anon, table, column) {
  const { error } = await anon.from(table).select(column).limit(1)
  return error
}

// A column is genuinely locked by a grant revoke when the error is a column-level
// permission denial — NOT the "permission denied for table users" symptom, which
// means the table's RLS policy itself is broken (it queries auth.users) and masks
// every read regardless of column grants. We must not count that as "secure".
function isGenuineColumnLock(err) {
  if (!err) return false
  const msg = err.message || ''
  if (msg.includes('permission denied for table users')) return false
  return err.code === '42501' || /permission denied/i.test(msg)
}

async function anonColumnDenied(anon, table, column) {
  return isGenuineColumnLock(await anonRead(anon, table, column))
}

export async function run() {
  const s = createSuite('Security: RLS + SSRF + Rate-limit')
  const anon = anonClient()

  // Seed one row per table so there is real PII present to (fail to) read.
  const lodge = await createLodge({ status: 'active' })
  const pro = await createUser()
  await upsertProfile(pro.id, {
    full_name: tag('Vis'), email: pro.email, verification_status: 'verified',
    lodge_id: lodge.id, city: 'Tampa', state: 'FL',
  })
  await createListing(pro.id, { visibility: 'public', is_active: true })

  s.section('profiles — anon cannot read PII columns')
  {
    s.ok(await anonColumnDenied(anon, 'profiles', 'email'), 'email locked from anon')
    s.ok(await anonColumnDenied(anon, 'profiles', 'sponsor_name'), 'sponsor_name locked from anon')
    s.ok(await anonColumnDenied(anon, 'profiles', 'sponsor_contact'), 'sponsor_contact locked from anon')
    s.ok(await anonColumnDenied(anon, 'profiles', 'request_emails_unsubscribe_token'), 'unsubscribe_token locked from anon')
    // Non-sensitive display columns must still be readable (directory needs them).
    s.ok(!(await anonColumnDenied(anon, 'profiles', 'full_name')), 'full_name still readable by anon')
  }

  s.section('lodges — anon cannot read claim_code / payment PII')
  {
    s.ok(await anonColumnDenied(anon, 'lodges', 'claim_code'), 'claim_code locked from anon')
    s.ok(await anonColumnDenied(anon, 'lodges', 'paid_by_email'), 'paid_by_email locked from anon')
    s.ok(await anonColumnDenied(anon, 'lodges', 'stripe_session_id'), 'stripe_session_id locked from anon')
    s.ok(!(await anonColumnDenied(anon, 'lodges', 'name')), 'lodge name still readable by anon')
  }

  s.section('requests — anon cannot read requester contact / flow tokens')
  {
    // First confirm the requests table is readable at all by anon. If this trips
    // the "permission denied for table users" symptom, the RLS policy (migration
    // 008) is broken — that masks column tests and must be fixed before we can
    // even verify the column lockdown. Treat it as its own hard failure.
    const policyErr = await anonRead(anon, 'requests', 'id')
    const brokenPolicy = (policyErr?.message || '').includes('permission denied for table users')
    s.ok(!brokenPolicy, 'requests RLS policy does not error on auth.users (migration 008 applied)')

    s.ok(await anonColumnDenied(anon, 'requests', 'posted_by_email'), 'posted_by_email locked from anon')
    s.ok(await anonColumnDenied(anon, 'requests', 'confirmation_token'), 'confirmation_token locked from anon')
    s.ok(await anonColumnDenied(anon, 'requests', 'requester_notify_token'), 'requester_notify_token locked from anon')
  }

  s.section('claim_code locked from authenticated too (member cannot seize a lodge)')
  {
    const member = await createUser()
    await upsertProfile(member.id, {
      full_name: tag('Mem'), email: member.email, verification_status: 'verified', lodge_id: lodge.id,
    })
    // A client bound to the member's JWT (authenticated role) — not service role.
    const { data: signin } = await anon.auth.signInWithPassword({ email: member.email, password: member.password })
    const authed = anonClient()
    await authed.auth.setSession(signin.session)
    const { error } = await authed.from('lodges').select('claim_code').eq('id', lodge.id).limit(1)
    s.ok(isGenuineColumnLock(error), 'claim_code locked from authenticated role')
  }

  s.section('anon cannot INSERT into requests (policy dropped in 015)')
  {
    const { error } = await anon.from('requests').insert({
      title: tag('hax'), category: 'Plumbing', city: 'X', state: 'OK',
      posted_by_email: 'a@b.co', posted_by_name: 'x', status: 'open',
    })
    s.ok(!!error, 'direct anon insert rejected')
  }

  s.section('SSRF — website scanner blocks private/loopback targets')
  {
    // Unauthenticated callers are rejected before any fetch happens.
    const noauth = await apiFetch('/api/listing/scan-website', { method: 'POST', body: { url: 'http://example.com' } })
    s.eq(noauth.status, 401, 'scan-website requires auth -> 401')

    const user = await createUser()
    await upsertProfile(user.id, { full_name: tag('Scan'), email: user.email, verification_status: 'verified' })
    const cookie = await mintCookie(user.email, user.password)

    const targets = [
      'http://169.254.169.254/latest/meta-data/',  // cloud metadata
      'http://localhost/',
      'http://127.0.0.1/',
      'http://10.0.0.1/',
      'http://192.168.1.1/',
      'http://[::1]/',
    ]
    for (const url of targets) {
      const r = await apiFetch('/api/listing/scan-website', { method: 'POST', cookie, body: { url } })
      s.ok(r.status === 400, `SSRF target rejected: ${url} (got ${r.status})`)
    }
  }

  s.section('rate-limit — public request POST capped per IP')
  {
    // Fixed unique IP so we own the bucket. Over-long title returns 400 *after*
    // the IP limit check, so allowed requests 400 and never create rows; the
    // (max+1)th must flip to 429. Unique email per call dodges the 5/h email cap.
    const ip = `198.51.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}`
    const post = () => apiFetch('/api/requests', {
      method: 'POST', headers: { 'x-forwarded-for': ip },
      body: { title: 'T'.repeat(200), category: 'Plumbing', city: 'Tulsa', state: 'OK', email: testEmail('rl' + uniq()) },
    })
    let saw429 = false
    let firstTen400 = true
    for (let i = 0; i < 11; i++) {
      const r = await post()
      if (i < 10 && r.status !== 400) firstTen400 = false
      if (r.status === 429) saw429 = true
    }
    s.ok(firstTen400, 'first 10 within-limit posts return 400 (field cap, not 429)')
    s.ok(saw429, '11th post over IP cap returns 429')
  }

  return s.summary()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { cleanupAll } = await import('../lib/harness.mjs')
  try { const r = await run(); process.exitCode = r.fail ? 1 : 0 }
  finally { await cleanupAll() }
}
