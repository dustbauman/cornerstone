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
  label: string
  callout: string
}

/** Active lodges in the founding program (Pioneer + Charter). */
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
    label: FOUNDING_PROGRAM_LABELS[programTier],
    callout: FOUNDING_PROGRAM_CALLout[programTier],
  }
}

/** Stripe Price ID for a founding offer (server-only). */
export function getStripePriceIdForFoundingOffer(offer: FoundingOffer): string | undefined {
  if (offer.programTier === 'pioneer') {
    return (
      process.env.STRIPE_PRICE_PIONEER ||
      process.env.STRIPE_PRICE_FOUNDING // legacy $1 price ID — replace in Stripe
    )
  }
  return process.env.STRIPE_PRICE_CHARTER
}

export async function getFoundingOffer(
  supabase: SupabaseClient
): Promise<{ counts: FoundingSlotCounts; offer: FoundingOffer | null }> {
  const counts = await getFoundingSlotCounts(supabase)
  return { counts, offer: resolveFoundingOffer(counts) }
}
