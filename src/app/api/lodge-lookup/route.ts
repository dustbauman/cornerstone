import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import {
  FOUNDING_SLOTS_TOTAL,
  getFoundingSlotCounts,
  resolveFoundingOffer,
} from '@/lib/pricing'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const number = searchParams.get('number')?.trim()
  const state = searchParams.get('state')?.trim()

  if (searchParams.has('_founding')) {
    const counts = await getFoundingSlotCounts(supabase)
    const offer = resolveFoundingOffer(counts)
    return Response.json({
      pioneerCount: counts.pioneerCount,
      charterCount: counts.charterCount,
      foundingCount: counts.totalFoundingCount,
      pioneerRemaining: counts.pioneerRemaining,
      charterRemaining: counts.charterRemaining,
      totalRemaining: counts.totalRemaining,
      limit: FOUNDING_SLOTS_TOTAL,
      offer: offer
        ? {
            programTier: offer.programTier,
            priceDollars: offer.priceDollars,
            label: offer.label,
            callout: offer.callout,
          }
        : null,
    })
  }

  if (!number || !state) {
    return Response.json({ found: false })
  }

  const { data: lodge } = await supabase
    .from('lodges')
    .select('id, name, number, state, status, slug')
    .eq('number', number)
    .eq('state', state)
    .maybeSingle()

  if (!lodge) {
    return Response.json({ found: false })
  }

  return Response.json({
    found: true,
    status: lodge.status,
    name: lodge.name,
    number: lodge.number,
    state: lodge.state,
    slug: lodge.slug ?? lodge.id,
  })
}
