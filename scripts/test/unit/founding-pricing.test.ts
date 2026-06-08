import { describe, it, expect } from 'vitest'
import {
  resolveFoundingOffer,
  type FoundingSlotCounts,
} from '@/lib/pricing/founding'
import {
  FOUNDING_TIER_1_SLOTS,
  FOUNDING_SLOTS_TOTAL,
  isFoundingProgramLodgeTier,
  foundingProgramTierFromLodgeTier,
} from '@/lib/pricing/constants'
import { INVITE_CAPS } from '@/lib/invites'

const counts = (pioneer: number, charter: number): FoundingSlotCounts => ({
  pioneerCount: pioneer,
  charterCount: charter,
  totalFoundingCount: pioneer + charter,
  pioneerRemaining: Math.max(0, FOUNDING_TIER_1_SLOTS - pioneer),
  charterRemaining: Math.max(0, 5 - charter),
  totalRemaining: Math.max(0, FOUNDING_SLOTS_TOTAL - pioneer - charter),
})

describe('resolveFoundingOffer', () => {
  it('offers pioneer while pioneer slots remain', () => {
    const offer = resolveFoundingOffer(counts(0, 0))
    expect(offer?.programTier).toBe('pioneer')
    expect(offer?.lodgeTier).toBe('founding')
    expect(offer?.priceDollars).toBe(0)
    expect(offer?.priceCents).toBe(0)
    expect(offer?.billingModel).toBe('lifetime_free')
  })

  it('rolls to early annual once all lifetime founding slots are taken', () => {
    const offer = resolveFoundingOffer(counts(FOUNDING_TIER_1_SLOTS, 0))
    expect(offer?.programTier).toBe('charter')
    expect(offer?.lodgeTier).toBe('charter')
    expect(offer?.priceDollars).toBe(0)
    expect(offer?.annualPriceDollars).toBe(99)
    expect(offer?.billingModel).toBe('annual')
  })

  it('returns null when the program is full', () => {
    expect(resolveFoundingOffer(counts(5, 5))).toBeNull()
  })

  it('still offers charter on the last open slot', () => {
    expect(resolveFoundingOffer(counts(5, 4))?.programTier).toBe('charter')
  })
})

describe('founding tier helpers', () => {
  it('identifies founding program lodge tiers', () => {
    expect(isFoundingProgramLodgeTier('founding')).toBe(true)
    expect(isFoundingProgramLodgeTier('charter')).toBe(false)
    expect(isFoundingProgramLodgeTier('standard')).toBe(false)
    expect(isFoundingProgramLodgeTier(null)).toBe(false)
  })

  it('maps lodge tier back to program tier', () => {
    expect(foundingProgramTierFromLodgeTier('founding')).toBe('pioneer')
    expect(foundingProgramTierFromLodgeTier('charter')).toBeNull()
    expect(foundingProgramTierFromLodgeTier('large')).toBeNull()
  })
})

describe('INVITE_CAPS', () => {
  it('grants unlimited invites to every lodge tier in the flat pricing model', () => {
    expect(INVITE_CAPS.founding).toBeNull()
    expect(INVITE_CAPS.charter).toBeNull()
    expect(INVITE_CAPS.large).toBeNull()
    expect(INVITE_CAPS.small).toBeNull()
    expect(INVITE_CAPS.standard).toBeNull()
  })
})
