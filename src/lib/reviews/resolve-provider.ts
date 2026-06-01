import type { SupabaseClient } from '@supabase/supabase-js'

export type FilledRequestReviewContext = {
  requestId: string
  requestTitle: string
  requesterProfileId: string | null
  requesterEmail: string
  requesterName: string
  listingId: string
  businessName: string
  ownerName: string
}

/** Accepted provider listing for a filled request, if any. */
export async function getFilledRequestReviewContext(
  admin: SupabaseClient,
  requestId: string
): Promise<FilledRequestReviewContext | null> {
  const { data: req } = await admin
    .from('requests')
    .select('id, title, status, profile_id, posted_by_email, posted_by_name')
    .eq('id', requestId)
    .eq('status', 'filled')
    .maybeSingle()

  if (!req) return null

  const { data: accepted } = await admin
    .from('request_responses')
    .select('responder_id')
    .eq('request_id', requestId)
    .eq('status', 'accepted')
    .maybeSingle()

  if (!accepted) return null

  const { data: listing } = await admin
    .from('listings')
    .select('id, business_name, profiles:profile_id ( full_name )')
    .eq('profile_id', accepted.responder_id)
    .eq('is_active', true)
    .maybeSingle()

  if (!listing) return null

  const profileRow = listing.profiles as unknown
  const ownerProfile =
    profileRow &&
    typeof profileRow === 'object' &&
    !Array.isArray(profileRow) &&
    'full_name' in profileRow
      ? (profileRow as { full_name: string | null })
      : null

  return {
    requestId: req.id,
    requestTitle: req.title,
    requesterProfileId: req.profile_id,
    requesterEmail: req.posted_by_email,
    requesterName: req.posted_by_name,
    listingId: listing.id,
    businessName: listing.business_name,
    ownerName: ownerProfile?.full_name?.trim() ?? 'Member',
  }
}

export async function getRequesterEmail(
  admin: SupabaseClient,
  ctx: Pick<
    FilledRequestReviewContext,
    'requesterProfileId' | 'requesterEmail'
  >
): Promise<string | null> {
  if (ctx.requesterProfileId) {
    const { data: profile } = await admin
      .from('profiles')
      .select('email')
      .eq('id', ctx.requesterProfileId)
      .maybeSingle()

    if (profile?.email) return profile.email
  }

  return ctx.requesterEmail?.trim() || null
}
