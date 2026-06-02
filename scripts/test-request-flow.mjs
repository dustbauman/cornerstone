// End-to-end test of the guest-verify + push-to-pro flow against the local dev server.
// Run: node --env-file=.env.local scripts/test-request-flow.mjs
import { createClient } from '@supabase/supabase-js'

const BASE = 'http://localhost:3000'
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

const TEST_EMAIL = 'bauman.designs+tyrian-guesttest@gmail.com'
const MARKER = `__E2E test ${Date.now()}`
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`) } else { fail++; console.log(`  ✗ ${m}`) } }

async function getBoard() {
  const r = await fetch(`${BASE}/api/requests`)
  const j = await r.json()
  return j.requests ?? []
}

console.log('1. Baseline board')
const before = await getBoard()
console.log(`   board has ${before.length} request(s)`)

console.log('\n2. Guest posts a request')
const postRes = await fetch(`${BASE}/api/requests`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: MARKER, category: 'Plumbing', city: 'Tulsa', state: 'OK',
    email: TEST_EMAIL, name: 'E2E Guest', budget: '~$500', timeline: 'ASAP',
    details: 'Automated end-to-end test request.', remoteEligible: false,
  }),
})
const posted = await postRes.json()
ok(postRes.ok, `POST returned ${postRes.status}`)
ok(posted.pending === true, 'response says pending:true (guest not auto-live)')
ok(!!posted.id, `got request id ${posted.id}`)
const id = posted.id

console.log('\n3. Pending request must be hidden from the board')
const boardWhilePending = await getBoard()
ok(!boardWhilePending.some((r) => r.id === id), 'request NOT visible on board before confirm')

console.log('\n4. DB state before confirm')
const { data: pre } = await admin
  .from('requests')
  .select('confirmed_at, confirmation_token, pros_notified_at')
  .eq('id', id).single()
ok(pre?.confirmed_at == null, 'confirmed_at is null')
ok(!!pre?.confirmation_token, 'confirmation_token is set')
ok(pre?.pros_notified_at == null, 'pros_notified_at is null')

console.log('\n5. Confirm via the token')
const confirmRes = await fetch(`${BASE}/api/requests/confirm`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: pre.confirmation_token }),
})
const confirmed = await confirmRes.json()
ok(confirmRes.ok && confirmed.success, `confirm returned ${confirmRes.status} success`)

console.log('\n6. DB state after confirm')
const { data: post } = await admin
  .from('requests')
  .select('confirmed_at, confirmation_token, pros_notified_at')
  .eq('id', id).single()
ok(post?.confirmed_at != null, 'confirmed_at now set')
ok(post?.confirmation_token == null, 'confirmation_token cleared')
ok(post?.pros_notified_at != null, 'pros_notified_at set (push fired)')

console.log('\n7. Request is now live on the board')
const boardAfter = await getBoard()
ok(boardAfter.some((r) => r.id === id), 'request IS visible on board after confirm')

console.log('\n8. Re-confirm must NOT re-broadcast (dedupe)')
const notifiedAt = post.pros_notified_at
const reconfirm = await fetch(`${BASE}/api/requests/confirm`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: pre.confirmation_token }),
})
ok(reconfirm.status === 404, 'second confirm with same token rejected (token cleared)')
const { data: post2 } = await admin
  .from('requests').select('pros_notified_at').eq('id', id).single()
ok(post2?.pros_notified_at === notifiedAt || post2 == null, 'pros_notified_at unchanged on re-confirm')

console.log('\n9. Cleanup')
const { error: delErr } = await admin.from('requests').delete().eq('id', id)
ok(!delErr, 'test request deleted')

console.log(`\n==== ${pass} passed, ${fail} failed ====`)
process.exit(fail ? 1 : 0)
