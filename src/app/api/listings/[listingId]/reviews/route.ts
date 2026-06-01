import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRouteUser } from '@/lib/supabase/route-auth'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { listingId: string } }
) {
  const user = await getRouteUser(request)
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, verification_status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.verification_status !== 'verified') {
    return Response.json(
      { error: 'Only verified members can leave reviews' },
      { status: 403 }
    )
  }

  let rating: number | undefined
  let body: string | null = null
  let requestId: string | undefined

  try {
    const payload = await request.json()
    if (typeof payload.rating === 'number') rating = payload.rating
    if (typeof payload.body === 'string') {
      body = payload.body.trim().slice(0, 1000) || null
    }
    if (typeof payload.requestId === 'string') requestId = payload.requestId
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return Response.json({ error: 'Rating must be an integer from 1 to 5' }, { status: 400 })
  }

  const admin = createAdminClient()
  const listingId = params.listingId

  const { data: listing } = await admin
    .from('listings')
    .select('id, profile_id, is_active')
    .eq('id', listingId)
    .maybeSingle()

  if (!listing?.is_active) {
    return Response.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (listing.profile_id === user.id) {
    return Response.json({ error: 'You cannot review your own listing' }, { status: 403 })
  }

  if (requestId) {
    const { data: reqRow } = await admin
      .from('requests')
      .select('id, profile_id, status')
      .eq('id', requestId)
      .maybeSingle()

    if (!reqRow || reqRow.profile_id !== user.id) {
      return Response.json(
        { error: 'Invalid request for this review' },
        { status: 400 }
      )
    }

    if (reqRow.status !== 'filled') {
      return Response.json(
        { error: 'You can only link a review to a filled request' },
        { status: 400 }
      )
    }

    const { data: accepted } = await admin
      .from('request_responses')
      .select('id, responder_id')
      .eq('request_id', requestId)
      .eq('status', 'accepted')
      .maybeSingle()

    if (!accepted) {
      return Response.json(
        { error: 'No accepted provider on this request' },
        { status: 400 }
      )
    }

    const { data: providerListing } = await admin
      .from('listings')
      .select('id')
      .eq('profile_id', accepted.responder_id)
      .eq('is_active', true)
      .maybeSingle()

    if (!providerListing || providerListing.id !== listingId) {
      return Response.json(
        { error: 'This listing does not match the hired provider' },
        { status: 400 }
      )
    }
  }

  const { data: existing } = await admin
    .from('reviews')
    .select('id')
    .eq('listing_id', listingId)
    .eq('reviewer_id', user.id)
    .maybeSingle()

  if (existing) {
    return Response.json(
      { error: 'You have already reviewed this listing' },
      { status: 409 }
    )
  }

  const { data: inserted, error } = await admin
    .from('reviews')
    .insert({
      listing_id: listingId,
      reviewer_id: user.id,
      rating,
      body,
      request_id: requestId ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('review insert:', error.message)
    return Response.json({ error: 'Could not save review' }, { status: 500 })
  }

  return Response.json({ success: true, id: inserted.id })
}
