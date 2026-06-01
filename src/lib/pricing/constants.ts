/** Revenue model V2 — founding program (Phase 1). See docs/briefs/tyrian-pricing-v2.md */

export const FOUNDING_SLOTS_TOTAL = 10
export const FOUNDING_TIER_1_SLOTS = 5 // Pioneer: slots 1–5 → DB tier `founding`
export const FOUNDING_TIER_2_SLOTS = 5 // Charter: slots 6–10 → DB tier `charter`

export type FoundingProgramTier = 'pioneer' | 'charter'
export type LodgeTier = 'founding' | 'charter' | 'small' | 'standard' | 'large'

export const FOUNDING_PRICES_DOLLARS = {
  pioneer: 99,
  charter: 299,
} as const

export const FOUNDING_PRICES_CENTS = {
  pioneer: 9900,
  charter: 29900,
} as const

/** Standard one-time fees until Phase 2 (annual subscriptions). */
export const STANDARD_PRICES_DOLLARS = {
  small: 299,
  standard: 499,
  large: 799,
} as const

export const FOUNDING_PROGRAM_LABELS: Record<FoundingProgramTier, string> = {
  pioneer: 'Pioneer',
  charter: 'Charter',
}

export const FOUNDING_PROGRAM_CALLout: Record<FoundingProgramTier, string> = {
  pioneer: 'Pioneer — $99 once, lifetime access',
  charter: 'Charter — $299 once, lifetime access',
}

/** Maps founding program tier to `lodges.tier` value. */
export const PROGRAM_TO_LODGE_TIER: Record<FoundingProgramTier, LodgeTier> = {
  pioneer: 'founding',
  charter: 'charter',
}

export function isFoundingProgramLodgeTier(tier: string | null | undefined): boolean {
  return tier === 'founding' || tier === 'charter'
}

export function foundingProgramTierFromLodgeTier(
  tier: string | null | undefined
): FoundingProgramTier | null {
  if (tier === 'founding') return 'pioneer'
  if (tier === 'charter') return 'charter'
  return null
}
