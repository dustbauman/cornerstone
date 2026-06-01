import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRouteUser } from '@/lib/supabase/route-auth'
import type { PendingReviewTarget } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const user = await getRouteUser(request)
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('verification_status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.verification_status !== 'verified') {
    return Response.json({ targets: [] satisfies PendingReviewTarget[] })
  }

  const admin = createAdminClient()

  const { data: filledRequests } = await admin
    .from('requests')
    .select('id, title')
    .eq('profile_id', user.id)
    .eq('status', 'filled')

  if (!filledRequests?.length) {
    return Response.json({ targets: [] })
  }

  const requestIds = filledRequests.map((r) => r.id)
  const titleById = Object.fromEntries(filledRequests.map((r) => [r.id, r.title]))

  const { data: acceptedResponses } = await admin
    .from('request_responses')
    .select('request_id, responder_id')
    .in('request_id', requestIds)
    .eq('status', 'accepted')

  if (!acceptedResponses?.length) {
    return Response.json({ targets: [] })
  }

  const responderIds = Array.from(
    new Set(acceptedResponses.map((r) => r.responder_id))
  )

  const { data: providerListings } = await admin
    .from('listings')
    .select('id, profile_id, business_name, profiles:profile_id ( full_name )')
    .in('profile_id', responderIds)
    .eq('is_active', true)

  if (!providerListings?.length) {
    return Response.json({ targets: [] })
  }

  const listingByResponder = new Map(
    providerListings.map((l) => [l.profile_id, l])
  )

  const listingIds = providerListings.map((l) => l.id)

  const { data: existingReviews } = await admin
    .from('reviews')
    .select('listing_id')
    .eq('reviewer_id', user.id)
    .in('listing_id', listingIds)

  const reviewedListingIds = new Set(
    (existingReviews ?? []).map((r) => r.listing_id)
  )

  const targets: PendingReviewTarget[] = []

  for (const row of acceptedResponses) {
    const listing = listingByResponder.get(row.responder_id)
    if (!listing || reviewedListingIds.has(listing.id)) continue

    const profileRow = listing.profiles as unknown
    const profile =
      profileRow &&
      typeof profileRow === 'object' &&
      !Array.isArray(profileRow) &&
      'full_name' in profileRow
        ? (profileRow as { full_name: string | null })
        : null
    targets.push({
      listingId: listing.id,
      businessName: listing.business_name,
      ownerName: profile?.full_name?.trim() ?? 'Member',
      requestId: row.request_id,
      requestTitle: titleById[row.request_id] ?? 'Service request',
    })
  }

  return Response.json({ targets })
}
