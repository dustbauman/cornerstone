/** Revenue model V3 — launch growth model. See docs/briefs/tyrian-pricing-v2.md */

export const FOUNDING_SLOTS_TOTAL = 10
export const FOUNDING_TIER_1_SLOTS = 5 // Founding: slots 1-5 -> DB tier `founding`
export const FOUNDING_TIER_2_SLOTS = 5 // Early: slots 6-10 -> DB tier `charter`
export const STANDARD_ANNUAL_PRICE_DOLLARS = 99
export const STANDARD_ANNUAL_PRICE_CENTS = 9900

export type FoundingProgramTier = 'pioneer' | 'charter'
export type LodgeTier = 'founding' | 'charter' | 'small' | 'standard' | 'large'

export const FOUNDING_PRICES_DOLLARS = {
  pioneer: 0,
  charter: 0,
} as const

export const FOUNDING_PRICES_CENTS = {
  pioneer: 0,
  charter: 0,
} as const

/** Standard annual fee; member-count tiers are no longer priced differently. */
export const STANDARD_PRICES_DOLLARS = {
  small: STANDARD_ANNUAL_PRICE_DOLLARS,
  standard: STANDARD_ANNUAL_PRICE_DOLLARS,
  large: STANDARD_ANNUAL_PRICE_DOLLARS,
} as const

export const FOUNDING_PROGRAM_LABELS: Record<FoundingProgramTier, string> = {
  pioneer: 'Founding',
  charter: 'Early',
}

export const FOUNDING_PROGRAM_CALLout: Record<FoundingProgramTier, string> = {
  pioneer: 'Founding Lodge — free for life',
  charter: 'Early Lodge — free signup, then $99/year',
}

/** Maps founding program tier to `lodges.tier` value. */
export const PROGRAM_TO_LODGE_TIER: Record<FoundingProgramTier, LodgeTier> = {
  pioneer: 'founding',
  charter: 'charter',
}

export function isFoundingProgramLodgeTier(tier: string | null | undefined): boolean {
  return tier === 'founding'
}

export function foundingProgramTierFromLodgeTier(
  tier: string | null | undefined
): FoundingProgramTier | null {
  if (tier === 'founding') return 'pioneer'
  return null
}
