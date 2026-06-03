// Co-admin / admin roles: promote, demote, transfer-primary, caps + gating.
import {
  admin, apiFetch, createSuite, createUser, upsertProfile, createLodge,
  mintCookie, tag,
} from '../lib/harness.mjs'

// Create a member in a lodge. Returns { id, email, password }.
async function addMember(lodgeId, { verified = true, primary = false, coAdmin = false } = {}) {
  const u = await createUser()
  await upsertProfile(u.id, {
    full_name: tag('M'), email: u.email, lodge_id: lodgeId,
    verification_status: verified ? 'verified' : 'pending',
    is_lodge_admin: primary, is_co_admin: coAdmin,
  })
  return u
}

const roles = (cookie, body) => apiFetch('/api/admin/roles', { method: 'POST', cookie, body })
const roleOf = async (id) => {
  const { data } = await admin.from('profiles').select('is_lodge_admin, is_co_admin').eq('id', id).single()
  return data
}

export async function run() {
  const s = createSuite('Co-admin / Admin Roles')

  s.section('gating')
  {
    const lodge = await createLodge()
    const primary = await addMember(lodge.id, { primary: true })
    const member = await addMember(lodge.id)
    const target = await addMember(lodge.id)

    const anon = await roles(undefined, { memberId: target.id, action: 'promote_co_admin' })
    s.eq(anon.status, 401, 'unauthenticated -> 401')

    const memberCookie = await mintCookie(member.email, member.password)
    const forbidden = await roles(memberCookie, { memberId: target.id, action: 'promote_co_admin' })
    s.eq(forbidden.status, 403, 'non-admin member -> 403')

    const primaryCookie = await mintCookie(primary.email, primary.password)
    const bad = await roles(primaryCookie, { memberId: target.id, action: 'not_a_real_action' })
    s.eq(bad.status, 400, 'invalid action -> 400')

    // Cross-lodge target
    const otherLodge = await createLodge()
    const outsider = await addMember(otherLodge.id)
    const cross = await roles(primaryCookie, { memberId: outsider.id, action: 'promote_co_admin' })
    s.eq(cross.status, 404, 'cross-lodge target -> 404')
  }

  s.section('promote co-admin')
  {
    const lodge = await createLodge()
    const primary = await addMember(lodge.id, { primary: true })
    const primaryCookie = await mintCookie(primary.email, primary.password)

    const pending = await addMember(lodge.id, { verified: false })
    const np = await roles(primaryCookie, { memberId: pending.id, action: 'promote_co_admin' })
    s.eq(np.json?.error, 'NOT_VERIFIED', 'cannot promote unverified member')

    const a = await addMember(lodge.id)
    const ok1 = await roles(primaryCookie, { memberId: a.id, action: 'promote_co_admin' })
    s.eq(ok1.status, 200, 'promote first co-admin succeeds')
    s.eq((await roleOf(a.id)).is_co_admin, true, 'first member is co-admin')

    const dup = await roles(primaryCookie, { memberId: a.id, action: 'promote_co_admin' })
    s.eq(dup.json?.error, 'ALREADY_ADMIN', 'cannot promote existing admin again')

    const b = await addMember(lodge.id)
    const ok2 = await roles(primaryCookie, { memberId: b.id, action: 'promote_co_admin' })
    s.eq(ok2.status, 200, 'promote second co-admin succeeds (cap=2)')

    const c = await addMember(lodge.id)
    const capped = await roles(primaryCookie, { memberId: c.id, action: 'promote_co_admin' })
    s.eq(capped.json?.error, 'CO_ADMIN_CAP', 'third co-admin exceeds cap -> rejected')
  }

  s.section('demote co-admin')
  {
    const lodge = await createLodge()
    const primary = await addMember(lodge.id, { primary: true })
    const primaryCookie = await mintCookie(primary.email, primary.password)
    const co1 = await addMember(lodge.id, { coAdmin: true })
    const co2 = await addMember(lodge.id, { coAdmin: true })

    // Co-admin cannot demote another co-admin
    const co1Cookie = await mintCookie(co1.email, co1.password)
    const notPrimary = await roles(co1Cookie, { memberId: co2.id, action: 'demote_co_admin' })
    s.eq(notPrimary.status, 403, 'co-admin cannot demote another co-admin')

    // Co-admin CAN self-demote
    const selfDemote = await roles(co1Cookie, { memberId: co1.id, action: 'demote_co_admin' })
    s.eq(selfDemote.status, 200, 'co-admin can self-demote')
    s.ok(selfDemote.json?.demotedSelf === true, 'demotedSelf flag set')
    s.eq((await roleOf(co1.id)).is_co_admin, false, 'self-demoted member no longer co-admin')

    // Primary can demote a co-admin
    const primaryDemote = await roles(primaryCookie, { memberId: co2.id, action: 'demote_co_admin' })
    s.eq(primaryDemote.status, 200, 'primary can demote co-admin')
    s.eq((await roleOf(co2.id)).is_co_admin, false, 'co2 demoted')
  }

  s.section('transfer primary')
  {
    const lodge = await createLodge()
    const primary = await addMember(lodge.id, { primary: true })
    const primaryCookie = await mintCookie(primary.email, primary.password)

    const self = await roles(primaryCookie, { memberId: primary.id, action: 'transfer_primary' })
    s.eq(self.json?.error, 'CANNOT_TRANSFER_TO_SELF', 'cannot transfer to self')

    const pending = await addMember(lodge.id, { verified: false })
    const npT = await roles(primaryCookie, { memberId: pending.id, action: 'transfer_primary' })
    s.eq(npT.json?.error, 'NOT_VERIFIED', 'cannot transfer to unverified member')

    const heir = await addMember(lodge.id)
    const ok = await roles(primaryCookie, { memberId: heir.id, action: 'transfer_primary', keepAsCoAdmin: true })
    s.eq(ok.status, 200, 'transfer to verified member succeeds')

    const heirRole = await roleOf(heir.id)
    s.eq(heirRole.is_lodge_admin, true, 'heir is now primary admin')
    s.eq(heirRole.is_co_admin, false, 'heir is not also co-admin')

    const oldRole = await roleOf(primary.id)
    s.eq(oldRole.is_lodge_admin, false, 'old primary stepped down')
    s.eq(oldRole.is_co_admin, true, 'old primary kept as co-admin (keepAsCoAdmin)')

    const { data: lg } = await admin.from('lodges').select('claim_code_claimed_by').eq('id', lodge.id).single()
    s.eq(lg.claim_code_claimed_by, heir.id, 'lodge ownership moved to heir')
  }

  return s.summary()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { cleanupAll } = await import('../lib/harness.mjs')
  try { const r = await run(); process.exitCode = r.fail ? 1 : 0 }
  finally { await cleanupAll() }
}
