import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRouteUser } from '@/lib/supabase/route-auth'
import type { ReviewEligibility } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { listingId: string } }
) {
  const user = await getRouteUser(request)
  const listingId = params.listingId

  if (!user) {
    return Response.json({
      canReview: false,
      reason: 'sign_in',
    } satisfies ReviewEligibility)
  }

  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, verification_status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.verification_status !== 'verified') {
    return Response.json({
      canReview: false,
      reason: 'not_verified',
    } satisfies ReviewEligibility)
  }

  const admin = createAdminClient()

  const { data: listing } = await admin
    .from('listings')
    .select('id, business_name, profile_id, is_active, profiles:profile_id ( full_name )')
    .eq('id', listingId)
    .maybeSingle()

  if (!listing?.is_active) {
    return Response.json({
      canReview: false,
      reason: 'not_found',
    } satisfies ReviewEligibility)
  }

  if (listing.profile_id === user.id) {
    return Response.json({
      canReview: false,
      reason: 'own_listing',
    } satisfies ReviewEligibility)
  }

  const { data: existing } = await admin
    .from('reviews')
    .select('id')
    .eq('listing_id', listingId)
    .eq('reviewer_id', user.id)
    .maybeSingle()

  if (existing) {
    return Response.json({
      canReview: false,
      reason: 'already_reviewed',
    } satisfies ReviewEligibility)
  }

  const profileRow = listing.profiles as unknown
  const ownerProfile =
    profileRow &&
    typeof profileRow === 'object' &&
    !Array.isArray(profileRow) &&
    'full_name' in profileRow
      ? (profileRow as { full_name: string | null })
      : null

  const { searchParams } = new URL(request.url)
  const requestId = searchParams.get('requestId')

  let linkedRequestId: string | undefined
  let requestTitle: string | undefined
  if (requestId) {
    const { data: reqRow } = await admin
      .from('requests')
      .select('id, title, profile_id, status')
      .eq('id', requestId)
      .maybeSingle()

    if (reqRow?.profile_id === user.id && reqRow.status === 'filled') {
      linkedRequestId = reqRow.id
      requestTitle = reqRow.title
    }
  }

  return Response.json({
    canReview: true,
    reason: 'ok',
    target: {
      listingId: listing.id,
      businessName: listing.business_name,
      ownerName: ownerProfile?.full_name?.trim() ?? 'Member',
      requestId: linkedRequestId,
      requestTitle,
    },
  } satisfies ReviewEligibility)
}
