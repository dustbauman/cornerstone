// Signup / membership: member-join validation + sponsor-confirm lifecycle.
import {
  admin, apiFetch, createLodge, createUser, upsertProfile,
  createSuite, trackUser, tag, testEmail, BASE,
} from '../lib/harness.mjs'

export async function run() {
  const s = createSuite('Signup / Membership')
  const lodge = await createLodge()

  const join = (body) => apiFetch('/api/member-join', { method: 'POST', body })

  s.section('member-join validation')
  {
    const r = await join({ lodgeSlug: lodge.slug, fullName: 'X' })
    s.eq(r.status, 400, 'missing fields rejected')
  }
  {
    const r = await join({
      lodgeSlug: 'does-not-exist-xyz', fullName: 'A B',
      email: testEmail('nf'), sponsorName: 'S', sponsorContact: 's@example.com',
    })
    s.eq(r.status, 404, 'unknown lodge -> 404')
    s.eq(r.json?.error, 'LODGE_NOT_FOUND', 'LODGE_NOT_FOUND code')
  }
  {
    const r = await join({
      lodgeSlug: lodge.slug, fullName: 'A B',
      email: 'not-an-email', sponsorName: 'S', sponsorContact: 's@example.com',
    })
    s.eq(r.status, 400, 'invalid email -> 400')
    s.eq(r.json?.error, 'INVALID_EMAIL', 'INVALID_EMAIL code')
  }
  {
    const r = await join({
      lodgeSlug: lodge.slug, fullName: 'A B',
      email: testEmail('np'), sponsorName: 'S', sponsorContact: '555-1212',
    })
    s.eq(r.json?.error, 'SPONSOR_EMAIL_REQUIRED', 'sponsor contact must be email')
  }

  s.section('member-join capacity cap')
  {
    const fullLodge = await createLodge({ invite_cap: 1 })
    const filler = await createUser()
    await upsertProfile(filler.id, {
      full_name: tag('Filler'), email: filler.email,
      lodge_id: fullLodge.id, verification_status: 'verified',
    })
    const r = await join({
      lodgeSlug: fullLodge.slug, fullName: 'Over Capacity',
      email: testEmail('cap'), sponsorName: 'S', sponsorContact: 'sp@example.com',
    })
    s.eq(r.status, 403, 'at-capacity lodge -> 403')
    s.eq(r.json?.error, 'LODGE_AT_CAPACITY', 'LODGE_AT_CAPACITY code')
  }

  s.section('member-join happy path')
  const applicantEmail = testEmail('apply')
  {
    const r = await join({
      lodgeSlug: lodge.slug, fullName: tag('Applicant'),
      email: applicantEmail, sponsorName: 'Sponsor Bro', sponsorContact: testEmail('sponsor'),
    })
    s.eq(r.status, 200, 'valid join -> 200')
    s.ok(r.json?.success === true, 'success:true')

    const { data: profile } = await admin
      .from('profiles').select('id, verification_status, lodge_id, sponsor_name')
      .eq('email', applicantEmail).maybeSingle()
    trackUser(profile?.id)
    s.ok(!!profile, 'profile row created')
    s.eq(profile?.verification_status, 'pending', 'applicant is pending')
    s.eq(profile?.lodge_id, lodge.id, 'profile linked to lodge')

    const { data: conf } = await admin
      .from('sponsor_confirmations').select('token, status')
      .eq('profile_id', profile?.id).maybeSingle()
    s.ok(!!conf?.token, 'sponsor_confirmation token created')
    s.eq(conf?.status, 'pending', 'sponsor confirmation pending')
  }

  s.section('member-join duplicate verified -> 409')
  {
    const existing = await createUser()
    await upsertProfile(existing.id, {
      full_name: tag('Existing'), email: existing.email,
      lodge_id: lodge.id, verification_status: 'verified',
    })
    const r = await join({
      lodgeSlug: lodge.slug, fullName: 'Existing',
      email: existing.email, sponsorName: 'S', sponsorContact: 'sp@example.com',
    })
    s.eq(r.status, 409, 'already-verified email -> 409')
    s.eq(r.json?.error, 'ALREADY_MEMBER', 'ALREADY_MEMBER code')
  }

  s.section('sponsor-confirm lifecycle')
  // Build a fresh applicant + confirmation we control directly.
  const makeConfirm = async (status = 'pending', ageMs = 0) => {
    const u = await createUser()
    await upsertProfile(u.id, {
      full_name: tag('Conf'), email: u.email,
      lodge_id: lodge.id, verification_status: 'pending',
    })
    const created = new Date(Date.now() - ageMs).toISOString()
    const { data } = await admin.from('sponsor_confirmations').insert({
      profile_id: u.id, sponsor_name: 'S', sponsor_contact: 'sp@example.com',
      status, created_at: created,
    }).select('token').single()
    return { user: u, token: data.token }
  }

  {
    const r = await apiFetch('/api/sponsor-confirm?token=bad&action=confirm')
    s.ok(r.text.includes('not found') || r.text.includes('invalid'), 'bad token -> not found page')
  }
  {
    const r = await apiFetch('/api/sponsor-confirm?token=onlytoken')
    s.ok(r.text.includes('Invalid link'), 'missing action -> invalid link page')
  }
  {
    const c = await makeConfirm()
    const r = await apiFetch(`/api/sponsor-confirm?token=${c.token}&action=confirm`)
    s.ok(r.text.includes('Membership confirmed'), 'confirm -> confirmed page')
    const { data: p } = await admin.from('profiles').select('verification_status').eq('id', c.user.id).single()
    s.eq(p.verification_status, 'verified', 'profile now verified')
    const r2 = await apiFetch(`/api/sponsor-confirm?token=${c.token}&action=confirm`)
    s.ok(r2.text.includes('already'), 'second confirm -> already responded')
  }
  {
    const c = await makeConfirm()
    const r = await apiFetch(`/api/sponsor-confirm?token=${c.token}&action=deny`)
    s.ok(r.text.includes('declined') || r.text.includes('Response recorded'), 'deny -> recorded page')
    const { data: p } = await admin.from('profiles').select('verification_status').eq('id', c.user.id).single()
    s.eq(p.verification_status, 'rejected', 'denied profile is rejected')
  }
  {
    const eightDays = 8 * 24 * 60 * 60 * 1000
    const c = await makeConfirm('pending', eightDays)
    const r = await apiFetch(`/api/sponsor-confirm?token=${c.token}&action=confirm`)
    s.ok(r.text.includes('expired'), 'expired (>7d) -> expired page')
    const { data: p } = await admin.from('profiles').select('verification_status').eq('id', c.user.id).single()
    s.eq(p.verification_status, 'pending', 'expired confirm does NOT verify')
  }

  return s.summary()
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { cleanupAll } = await import('../lib/harness.mjs')
  try { const r = await run(); process.exitCode = r.fail ? 1 : 0 }
  finally { await cleanupAll() }
}
