// Push-to-pro selection correctness. We call notifyMatchingPros directly and
// assert the RETURN VALUE (count of recipients) — email delivery is stubbed via
// the vitest setup (RESEND_API_KEY=''), so the count equals who *would* be sent.
//
// IMPORTANT: notifyMatchingPros loads the ENTIRE active-listing base and scores
// in JS — for a located (non-remote) request, *proximity alone* qualifies a pro
// regardless of trade. So to assert exact counts we must isolate each test in
// open ocean, far from seed data, other tests, and continental pros. Each test
// gets its own random far-flung coordinate; clusters are hundreds of miles apart.
import { describe, it, expect, afterAll } from 'vitest'
import { notifyMatchingPros, type NotifyRequest } from '@/lib/db/match-pros'
import {
  admin, createPro, cleanupAll, uniq,
} from '../lib/harness.mjs'

afterAll(async () => { await cleanupAll() })

// A unique, far-from-everything coordinate (southern oceans). Random spacing
// makes two independent spots effectively certain to be >1000mi apart.
function isolatedSpot() {
  return { lat: -10 - Math.random() * 55, lng: -180 + Math.random() * 360 }
}

function reqFor(spot: { lat: number; lng: number }, extra: Partial<NotifyRequest> = {}): NotifyRequest {
  return {
    id: '00000000-0000-0000-0000-000000000000', // not inserted; only used in email payload
    profile_id: null,
    category: 'Cat-' + uniq(),
    title: 'Need help ' + uniq(),
    city: 'Nowhere',
    state: 'FL',
    lat: spot.lat,
    lng: spot.lng,
    budget: '$500',
    timeline: 'ASAP',
    details: null,
    remote_eligible: false,
    ...extra,
  }
}

describe('notifyMatchingPros selection', () => {
  it('notifies a single isolated local pro', async () => {
    const spot = isolatedSpot()
    const cat = 'Cat-' + uniq()
    await createPro({ trade: cat, lat: spot.lat, lng: spot.lng })
    const sent = await notifyMatchingPros(admin, reqFor(spot, { category: cat }))
    expect(sent).toBe(1)
  })

  it('excludes a pro who has opted out of request emails', async () => {
    const spot = isolatedSpot()
    const cat = 'Cat-' + uniq()
    await createPro({ trade: cat, optIn: false, lat: spot.lat, lng: spot.lng })
    const sent = await notifyMatchingPros(admin, reqFor(spot, { category: cat }))
    expect(sent).toBe(0)
  })

  it('excludes a far pro with no trade match', async () => {
    const proSpot = isolatedSpot()
    const reqSpot = isolatedSpot() // independent -> far away
    await createPro({ trade: 'Cat-' + uniq(), lat: proSpot.lat, lng: proSpot.lng })
    const sent = await notifyMatchingPros(admin, reqFor(reqSpot))
    expect(sent).toBe(0)
  })

  it('reaches a trade match within the wider 100mi trade radius but past 50mi', async () => {
    const spot = isolatedSpot()
    const cat = 'Cat-' + uniq()
    // ~65mi north (1 deg lat ~= 69mi): outside default 50mi, inside 100mi trade radius.
    await createPro({ trade: cat, lat: spot.lat + 0.94, lng: spot.lng })
    const sent = await notifyMatchingPros(admin, reqFor(spot, { category: cat }))
    expect(sent).toBe(1)
  })

  it('does NOT reach a same-trade pro past the 100mi trade radius', async () => {
    const spot = isolatedSpot()
    const cat = 'Cat-' + uniq()
    // ~138mi north: outside the 100mi trade radius entirely.
    await createPro({ trade: cat, lat: spot.lat + 2.0, lng: spot.lng })
    const sent = await notifyMatchingPros(admin, reqFor(spot, { category: cat }))
    expect(sent).toBe(0)
  })

  it('does not notify the requester about their own request', async () => {
    const spot = isolatedSpot()
    const cat = 'Cat-' + uniq()
    const pro = await createPro({ trade: cat, lat: spot.lat, lng: spot.lng })
    const sent = await notifyMatchingPros(admin, reqFor(spot, { category: cat, profile_id: pro.id }))
    expect(sent).toBe(0)
  })

  it('reaches a far trade match for remote-eligible requests', async () => {
    const proSpot = isolatedSpot()
    const reqSpot = isolatedSpot() // far away — irrelevant when remote
    const cat = 'Cat-' + uniq()
    await createPro({ trade: cat, lat: proSpot.lat, lng: proSpot.lng })
    const sent = await notifyMatchingPros(admin, reqFor(reqSpot, { category: cat, remote_eligible: true }))
    expect(sent).toBe(1)
  })
})
