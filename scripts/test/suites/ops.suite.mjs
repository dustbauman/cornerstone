// Platform Ops Console (/ops) integration tests.
//
// Auth model: standalone HMAC cookie — no Supabase account required.
//
// What's covered:
//   Security (always runs):
//     - /ops without cookie → redirect to /ops/login
//     - /api/ops/* without cookie → 404
//     - /api/ops/auth with wrong secret → 401
//
//   Happy path (runs only when PLATFORM_ADMIN_SECRET is set in env):
//     - POST /api/ops/auth with correct secret → 200 + sets cookie
//     - GET /ops with valid cookie → 200
//     - PATCH /api/ops/lodges/[id] → 200, DB updated
//     - PATCH /api/ops/users/[id] → 200, DB updated
//     - DELETE /api/ops/users/[id] → 200, auth user gone
//     - DELETE /api/ops/auth → clears cookie
import {
  admin, apiFetch, createSuite, createUser, upsertProfile, createLodge, tag,
} from '../lib/harness.mjs'

const HAS_SECRET = !!process.env.PLATFORM_ADMIN_SECRET

// Obtain a valid ops cookie by posting the real secret to /api/ops/auth.
// Returns the Cookie header string ready to pass to apiFetch.
async function getOpsCookie() {
  const res = await apiFetch('/api/ops/auth', {
    method: 'POST',
    body: { secret: process.env.PLATFORM_ADMIN_SECRET },
  })
  if (res.status !== 200) throw new Error(`/api/ops/auth returned ${res.status}`)
  const setCookie = res.headers.get('set-cookie') ?? ''
  const match = setCookie.match(/ops_token=([^;]+)/)
  if (!match) throw new Error('No ops_token in Set-Cookie response')
  return `ops_token=${match[1]}`
}

export async function run() {
  const s = createSuite('Platform Ops Console')

  // -------------------------------------------------------------------------
  // Security: no cookie
  // -------------------------------------------------------------------------
  s.section('No cookie — page routes redirect to /ops/login')
  {
    const dashboard = await apiFetch('/ops')
    // middleware redirects → 302 (apiFetch uses redirect:'manual')
    s.ok(
      dashboard.status === 302 || dashboard.status === 307 || dashboard.status === 308,
      `/ops without cookie → redirect (got ${dashboard.status})`
    )

    const lodge = await apiFetch('/ops/lodges/00000000-0000-0000-0000-000000000000')
    s.ok(
      lodge.status === 302 || lodge.status === 307 || lodge.status === 308,
      `/ops/lodges/[id] without cookie → redirect (got ${lodge.status})`
    )
  }

  s.section('No cookie — API routes return 404')
  {
    const apiLodge = await apiFetch('/api/ops/lodges/00000000-0000-0000-0000-000000000000', {
      method: 'PATCH',
      body: { directory_id: null },
    })
    s.eq(apiLodge.status, 404, 'PATCH /api/ops/lodges/[id] without cookie → 404')

    const apiUser = await apiFetch('/api/ops/users/00000000-0000-0000-0000-000000000000', {
      method: 'PATCH',
      body: { verification_status: 'verified' },
    })
    s.eq(apiUser.status, 404, 'PATCH /api/ops/users/[id] without cookie → 404')

    const apiUserDel = await apiFetch('/api/ops/users/00000000-0000-0000-0000-000000000000', {
      method: 'DELETE',
    })
    s.eq(apiUserDel.status, 404, 'DELETE /api/ops/users/[id] without cookie → 404')
  }

  s.section('Wrong secret → 401')
  {
    const bad = await apiFetch('/api/ops/auth', {
      method: 'POST',
      body: { secret: 'definitely-wrong-' + Math.random() },
    })
    s.eq(bad.status, 401, 'POST /api/ops/auth with wrong secret → 401')
  }

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------
  if (!HAS_SECRET) {
    console.log('\n-- Happy-path skipped (PLATFORM_ADMIN_SECRET not set in env)')
    return s.summary()
  }

  s.section('Auth — correct secret issues cookie')
  let opsCookie
  try {
    opsCookie = await getOpsCookie()
    s.ok(true, 'POST /api/ops/auth → 200, ops_token cookie set')
  } catch (e) {
    s.ok(false, `Failed to get ops cookie: ${e.message}`)
    return s.summary()
  }

  s.section('Platform admin — /ops dashboard loads')
  {
    const res = await apiFetch('/ops', { cookie: opsCookie })
    s.eq(res.status, 200, '/ops with valid cookie → 200')
    s.ok(res.text?.includes('Operations Console'), '/ops body contains expected heading')
  }

  s.section('Platform admin — PATCH lodge directory_id')
  {
    const lodge = await createLodge({ status: 'active', directory_id: null })

    const res = await apiFetch(`/api/ops/lodges/${lodge.id}`, {
      method: 'PATCH',
      body: { directory_id: null },
      cookie: opsCookie,
    })
    s.eq(res.status, 200, 'PATCH /api/ops/lodges/[id] → 200')
    s.ok(res.json?.ok === true, 'response body { ok: true }')

    const { data } = await admin.from('lodges').select('directory_id').eq('id', lodge.id).single()
    s.ok(data?.directory_id === null, 'directory_id correct in DB')
  }

  s.section('Platform admin — PATCH user lodge + verification')
  {
    const targetLodge = await createLodge({ status: 'active' })
    const targetUser = await createUser()
    await upsertProfile(targetUser.id, {
      full_name: tag('OpsTarget'), email: targetUser.email,
      verification_status: 'pending', lodge_id: null,
    })

    const res = await apiFetch(`/api/ops/users/${targetUser.id}`, {
      method: 'PATCH',
      body: { lodge_id: targetLodge.id, verification_status: 'verified' },
      cookie: opsCookie,
    })
    s.eq(res.status, 200, 'PATCH /api/ops/users/[id] → 200')
    s.ok(res.json?.ok === true, 'response body { ok: true }')

    const { data } = await admin
      .from('profiles')
      .select('lodge_id, verification_status')
      .eq('id', targetUser.id)
      .single()
    s.ok(data?.lodge_id === targetLodge.id, 'lodge_id updated in DB')
    s.ok(data?.verification_status === 'verified', 'verification_status updated in DB')
  }

  s.section('Platform admin — DELETE user')
  {
    const doomed = await createUser()
    await upsertProfile(doomed.id, {
      full_name: tag('Doomed'), email: doomed.email, verification_status: 'pending',
    })

    const res = await apiFetch(`/api/ops/users/${doomed.id}`, {
      method: 'DELETE',
      cookie: opsCookie,
    })
    s.eq(res.status, 200, 'DELETE /api/ops/users/[id] → 200')

    const { data: authUser } = await admin.auth.admin.getUserById(doomed.id)
    s.ok(!authUser?.user, 'auth user gone from Supabase after DELETE')
  }

  s.section('Sign out — DELETE /api/ops/auth clears cookie')
  {
    const res = await apiFetch('/api/ops/auth', { method: 'DELETE', cookie: opsCookie })
    s.eq(res.status, 200, 'DELETE /api/ops/auth → 200')
    const setCookie = res.headers.get('set-cookie') ?? ''
    s.ok(setCookie.includes('Max-Age=0'), 'Set-Cookie clears the ops_token')
  }

  return s.summary()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { cleanupAll } = await import('../lib/harness.mjs')
  try { const r = await run(); process.exitCode = r.fail ? 1 : 0 }
  finally { await cleanupAll() }
}
