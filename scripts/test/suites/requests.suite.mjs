// Request board: guest verify lifecycle, member posts, field caps, respond flow,
// email opt-out. Push-to-pro *selection* correctness is covered in the vitest
// match-pros integration test (where the send count is observable).
import {
  admin, apiFetch, createSuite, createUser, upsertProfile, createPro, createLodge,
  mintCookie, trackRequest, tag, testEmail, uniq,
} from '../lib/harness.mjs'

// Unique source IP per call so the 10/h IP rate-limit never trips functional tests.
const fromIp = () => ({ 'x-forwarded-for': `203.0.${Math.floor(Math.random()*254)}.${Math.floor(Math.random()*254)}` })

async function getBoard() {
  const r = await apiFetch('/api/requests')
  return r.json?.requests ?? []
}

export async function run() {
  const s = createSuite('Request Board')

  s.section('guest post validation + caps')
  {
    const r = await apiFetch('/api/requests', { method: 'POST', headers: fromIp(), body: { title: 'x' } })
    s.eq(r.status, 400, 'missing required fields -> 400')
  }
  {
    const r = await apiFetch('/api/requests', {
      method: 'POST', headers: fromIp(),
      body: { title: 'T', category: 'Plumbing', city: 'Tulsa', state: 'OK', email: 'bad' },
    })
    s.eq(r.status, 400, 'invalid email -> 400')
  }
  {
    const r = await apiFetch('/api/requests', {
      method: 'POST', headers: fromIp(),
      body: { title: 'T'.repeat(200), category: 'Plumbing', city: 'Tulsa', state: 'OK', email: testEmail('cap') },
    })
    s.eq(r.status, 400, 'over-long title -> 400 (field cap)')
  }

  s.section('guest verify lifecycle + push dedupe')
  {
    const marker = tag('guest ' + uniq())
    const post = await apiFetch('/api/requests', {
      method: 'POST', headers: fromIp(),
      body: { title: marker, category: 'Plumbing', city: 'Tulsa', state: 'OK', email: testEmail('g' + uniq()) },
    })
    s.eq(post.status, 200, 'guest post accepted')
    s.ok(post.json?.pending === true, 'guest post is pending (not auto-live)')
    const id = post.json?.id
    trackRequest(id)

    const boardPending = await getBoard()
    s.ok(!boardPending.some(r => r.id === id), 'pending guest post hidden from board')

    const { data: pre } = await admin.from('requests')
      .select('confirmation_token, confirmed_at, pros_notified_at').eq('id', id).single()
    s.ok(!!pre.confirmation_token, 'confirmation_token set')
    s.ok(pre.confirmed_at == null, 'confirmed_at null pre-confirm')

    const conf = await apiFetch('/api/requests/confirm', { method: 'POST', body: { token: pre.confirmation_token } })
    s.ok(conf.status === 200 && conf.json?.success, 'confirm succeeds')

    const { data: post2 } = await admin.from('requests')
      .select('confirmation_token, confirmed_at, pros_notified_at').eq('id', id).single()
    s.ok(post2.confirmed_at != null, 'confirmed_at set after confirm')
    s.ok(post2.confirmation_token == null, 'token cleared after confirm')
    s.ok(post2.pros_notified_at != null, 'pros_notified_at set (push fired)')

    const boardLive = await getBoard()
    s.ok(boardLive.some(r => r.id === id), 'confirmed guest post now visible')

    const reconfirm = await apiFetch('/api/requests/confirm', { method: 'POST', body: { token: pre.confirmation_token } })
    s.eq(reconfirm.status, 404, 're-confirm with cleared token -> 404 (dedupe)')
  }

  s.section('member post is live immediately')
  {
    const member = await createUser()
    await upsertProfile(member.id, {
      full_name: tag('Member'), email: member.email, verification_status: 'verified',
      lodge_id: null, city: 'Tampa', state: 'FL', lat: 27.95, lng: -82.46,
    })
    const cookie = await mintCookie(member.email, member.password)
    const r = await apiFetch('/api/requests', {
      method: 'POST', cookie, headers: fromIp(),
      body: { title: tag('member ' + uniq()), category: 'Electrical', city: 'Tampa', state: 'FL', email: member.email },
    })
    s.eq(r.status, 200, 'member post accepted')
    s.ok(r.json?.pending === false, 'member post is live (pending:false)')
    const id = r.json?.id
    trackRequest(id)
    const { data: row } = await admin.from('requests')
      .select('confirmed_at, is_verified_member, pros_notified_at, profile_id').eq('id', id).single()
    s.ok(row.confirmed_at != null, 'member post confirmed_at set immediately')
    s.eq(row.is_verified_member, true, 'is_verified_member flag set')
    s.eq(row.profile_id, member.id, 'profile_id attributed')
    s.ok(row.pros_notified_at != null, 'pros_notified_at set on member post')

    const board = await getBoard()
    s.ok(board.some(r => r.id === id), 'member post visible on board immediately')
  }

  s.section('respond flow')
  {
    // Requester (member) posts; responder (verified pro w/ lodge) responds.
    const lg = await createLodge()
    const requester = await createUser()
    await upsertProfile(requester.id, {
      full_name: tag('Req'), email: requester.email, verification_status: 'verified', lodge_id: lg.id,
    })
    const reqCookie = await mintCookie(requester.email, requester.password)
    const postRes = await apiFetch('/api/requests', {
      method: 'POST', cookie: reqCookie, headers: fromIp(),
      body: { title: tag('respond ' + uniq()), category: 'Plumbing', city: 'Tampa', state: 'FL', email: requester.email },
    })
    const reqId = postRes.json?.id
    trackRequest(reqId)

    // Responder is a verified member with a name + lodge (required by the route).
    const responder = await createPro({ trade: 'Plumbing', lodgeId: lg.id })
    await admin.from('profiles').update({ full_name: tag('Resp'), lodge_id: lg.id }).eq('id', responder.id)
    const respCookie = await mintCookie(responder.email, responder.password)

    const respond = await apiFetch(`/api/requests/${reqId}/respond`, {
      method: 'POST', cookie: respCookie, body: { message: 'I can help with this.' },
    })
    s.eq(respond.status, 200, 'verified member can respond')

    const { data: r1 } = await admin.from('requests').select('responses_count, status').eq('id', reqId).single()
    s.ok(r1.responses_count >= 1, 'responses_count incremented')
    s.eq(r1.status, 'active', 'request moved open -> active on first response')

    const dup = await apiFetch(`/api/requests/${reqId}/respond`, { method: 'POST', cookie: respCookie, body: { message: 'again' } })
    s.eq(dup.status, 409, 'duplicate response -> 409')

    // Requester cannot respond to own request
    const own = await apiFetch(`/api/requests/${reqId}/respond`, { method: 'POST', cookie: reqCookie, body: { message: 'mine' } })
    s.eq(own.status, 403, 'cannot respond to own request -> 403')

    // Unverified member cannot respond
    const pendingUser = await createUser()
    await upsertProfile(pendingUser.id, { full_name: tag('Pend'), email: pendingUser.email, verification_status: 'pending', lodge_id: lg.id })
    const pendCookie = await mintCookie(pendingUser.email, pendingUser.password)
    const pendResp = await apiFetch(`/api/requests/${reqId}/respond`, { method: 'POST', cookie: pendCookie, body: { message: 'hi' } })
    s.eq(pendResp.status, 403, 'unverified member cannot respond -> 403')

    // Unauthenticated cannot respond
    const anon = await apiFetch(`/api/requests/${reqId}/respond`, { method: 'POST', body: { message: 'hi' } })
    s.eq(anon.status, 401, 'unauthenticated respond -> 401')

    // Owner marks filled
    const filled = await apiFetch(`/api/requests/${reqId}/mark-filled`, { method: 'POST', cookie: reqCookie })
    s.ok(filled.status === 200, 'owner can mark request filled')
    const { data: rf } = await admin.from('requests').select('status').eq('id', reqId).single()
    s.eq(rf.status, 'filled', 'request status is filled')
  }

  s.section('email opt-out / unsubscribe')
  {
    const pro = await createPro({ trade: 'Roofing' })
    const { data: p } = await admin.from('profiles')
      .select('request_emails_unsubscribe_token, request_emails_enabled').eq('id', pro.id).single()
    s.eq(p.request_emails_enabled, true, 'pro opted in by default')
    const r = await apiFetch(`/api/me/request-emails/unsubscribe?token=${p.request_emails_unsubscribe_token}`)
    s.ok(r.text.includes('Unsubscribed'), 'unsubscribe link shows confirmation')
    const { data: p2 } = await admin.from('profiles').select('request_emails_enabled').eq('id', pro.id).single()
    s.eq(p2.request_emails_enabled, false, 'opt-out persisted')

    const bad = await apiFetch('/api/me/request-emails/unsubscribe?token=00000000-0000-0000-0000-000000000000')
    s.eq(bad.status, 404, 'bad unsubscribe token -> 404')
  }

  return s.summary()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { cleanupAll } = await import('../lib/harness.mjs')
  try { const r = await run(); process.exitCode = r.fail ? 1 : 0 }
  finally { await cleanupAll() }
}
