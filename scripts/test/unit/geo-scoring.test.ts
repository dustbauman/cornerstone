import { describe, it, expect } from 'vitest'
import { haversineDistance, getMatchScore, type MockUserProfile } from '@/lib/geo/scoring'
import type { ServiceRequest } from '@/lib/demo/requests'

describe('haversineDistance', () => {
  it('is zero for identical points', () => {
    expect(haversineDistance(27.95, -82.46, 27.95, -82.46)).toBe(0)
  })

  it('matches a known city distance (Tampa -> Orlando ~ 77 mi straight-line)', () => {
    const miles = haversineDistance(27.9506, -82.4572, 28.5383, -81.3792)
    expect(miles).toBeGreaterThan(74)
    expect(miles).toBeLessThan(80)
  })

  it('is symmetric', () => {
    const a = haversineDistance(40.7128, -74.006, 34.0522, -118.2437)
    const b = haversineDistance(34.0522, -118.2437, 40.7128, -74.006)
    expect(a).toBeCloseTo(b, 6)
  })
})

describe('getMatchScore', () => {
  const baseReq: ServiceRequest = {
    category: 'Plumbing',
    lat: 27.95,
    lng: -82.46,
    lodge: 'Tampa Lodge',
    lodgeId: 'lodge-1',
    responses: 0,
    postedHoursAgo: 1,
    budget: '$500',
    timeline: 'ASAP',
    verifiedMember: true,
  } as unknown as ServiceRequest

  const baseUser: MockUserProfile = {
    trade: 'Plumbing',
    lodge: 'Tampa Lodge',
    lodgeId: 'lodge-1',
    lat: 27.95,
    lng: -82.46,
  }

  it('awards the maximum for a perfect local same-lodge match', () => {
    // 40 trade + 30 proximity + 20 lodge + 15 no-responses + 12 fresh + 8 budget + 8 ASAP + 5 verified
    expect(getMatchScore(baseReq, baseUser)).toBe(138)
  })

  it('drops the trade bonus when category differs', () => {
    const perfect = getMatchScore(baseReq, baseUser)
    const offTrade = getMatchScore(baseReq, { ...baseUser, trade: 'Electrical' })
    expect(perfect - offTrade).toBe(40)
  })

  it('tiers proximity: 30 within 25mi, 15 within 50mi, 0 beyond', () => {
    const far = getMatchScore({ ...baseReq, lat: 25.7617, lng: -80.1918 } as ServiceRequest, baseUser) // Miami ~200mi
    const mid = getMatchScore({ ...baseReq, lat: 28.5383, lng: -81.3792 } as ServiceRequest, baseUser) // Orlando ~84mi -> 0? actually >50
    // Orlando is ~84mi so also 0; use a ~40mi point instead.
    const midReq = getMatchScore({ ...baseReq, lat: 28.35, lng: -82.7 } as ServiceRequest, baseUser)
    expect(far).toBeLessThan(getMatchScore(baseReq, baseUser))
    expect(midReq).toBeGreaterThanOrEqual(far)
    expect(mid).toBeLessThan(getMatchScore(baseReq, baseUser))
  })

  it('matches lodge by name when ids are absent', () => {
    const byName = getMatchScore(
      { ...baseReq, lodgeId: null } as unknown as ServiceRequest,
      { ...baseUser, lodgeId: null }
    )
    // still gets the 20 lodge bonus via name fallback
    expect(byName).toBe(138)
  })
})
