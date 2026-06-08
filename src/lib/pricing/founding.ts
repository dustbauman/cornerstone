import type { SupabaseClient } from '@supabase/supabase-js'
import {
  FOUNDING_PRICES_CENTS,
  FOUNDING_PRICES_DOLLARS,
  FOUNDING_PROGRAM_CALLout,
  FOUNDING_PROGRAM_LABELS,
  FOUNDING_SLOTS_TOTAL,
  FOUNDING_TIER_1_SLOTS,
  FOUNDING_TIER_2_SLOTS,
  type FoundingProgramTier,
  PROGRAM_TO_LODGE_TIER,
  STANDARD_ANNUAL_PRICE_CENTS,
  STANDARD_ANNUAL_PRICE_DOLLARS,
  type LodgeTier,
} from './constants'

export type FoundingSlotCounts = {
  pioneerCount: number
  charterCount: number
  totalFoundingCount: number
  pioneerRemaining: number
  charterRemaining: number
  totalRemaining: number
}

export type FoundingOffer = {
  programTier: FoundingProgramTier
  lodgeTier: LodgeTier
  priceDollars: number
  priceCents: number
  annualPriceDollars: number
  annualPriceCents: number
  billingModel: 'lifetime_free' | 'annual'
  label: string
  callout: string
}

/** Active lodges in the launch program (first five lifetime-free, next five early annual). */
export async function getFoundingSlotCounts(
  supabase: SupabaseClient
): Promise<FoundingSlotCounts> {
  const [pioneerRes, charterRes] = await Promise.all([
    supabase
      .from('lodges')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'founding')
      .eq('status', 'active'),
    supabase
      .from('lodges')
      .select('*', { count: 'exact', head: true })
      .eq('tier', 'charter')
      .eq('status', 'active'),
  ])

  const pioneerCount = pioneerRes.count ?? 0
  const charterCount = charterRes.count ?? 0
  const totalFoundingCount = pioneerCount + charterCount

  return {
    pioneerCount,
    charterCount,
    totalFoundingCount,
    pioneerRemaining: Math.max(0, FOUNDING_TIER_1_SLOTS - pioneerCount),
    charterRemaining: Math.max(0, FOUNDING_TIER_2_SLOTS - charterCount),
    totalRemaining: Math.max(0, FOUNDING_SLOTS_TOTAL - totalFoundingCount),
  }
}

/** Next founding offer from current slot counts, or null when program is full. */
export function resolveFoundingOffer(counts: FoundingSlotCounts): FoundingOffer | null {
  if (counts.pioneerCount < FOUNDING_TIER_1_SLOTS) {
    return buildOffer('pioneer')
  }
  if (counts.totalFoundingCount < FOUNDING_SLOTS_TOTAL) {
    return buildOffer('charter')
  }
  return null
}

function buildOffer(programTier: FoundingProgramTier): FoundingOffer {
  const lodgeTier = PROGRAM_TO_LODGE_TIER[programTier]
  return {
    programTier,
    lodgeTier,
    priceDollars: FOUNDING_PRICES_DOLLARS[programTier],
    priceCents: FOUNDING_PRICES_CENTS[programTier],
    annualPriceDollars: programTier === 'charter' ? STANDARD_ANNUAL_PRICE_DOLLARS : 0,
    annualPriceCents: programTier === 'charter' ? STANDARD_ANNUAL_PRICE_CENTS : 0,
    billingModel: programTier === 'pioneer' ? 'lifetime_free' : 'annual',
    label: FOUNDING_PROGRAM_LABELS[programTier],
    callout: FOUNDING_PROGRAM_CALLout[programTier],
  }
}

/** Stripe Price ID for a paid founding offer (server-only). */
export function getStripePriceIdForFoundingOffer(offer: FoundingOffer): string | undefined {
  if (offer.programTier === 'pioneer') {
    return undefined
  }
  return getStripePriceIdForStandardAnnual()
}

/** Stripe Price ID for the flat $99/year lodge subscription (server-only). */
export function getStripePriceIdForStandardAnnual(): string | undefined {
  return (
    process.env.STRIPE_PRICE_LODGE_ANNUAL ||
    process.env.STRIPE_PRICE_STANDARD_ANNUAL ||
    process.env.STRIPE_PRICE_STANDARD
  )
}

export async function getFoundingOffer(
  supabase: SupabaseClient
): Promise<{ counts: FoundingSlotCounts; offer: FoundingOffer | null }> {
  const counts = await getFoundingSlotCounts(supabase)
  return { counts, offer: resolveFoundingOffer(counts) }
}
