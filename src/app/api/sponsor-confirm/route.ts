import { createAdminClient } from '@/lib/supabase/admin'
import { sendMemberVerifiedEmail, sponsorResponsePage } from '@/lib/email'
import { haversineDistance } from '@/lib/geo/scoring'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const action = searchParams.get('action')

  if (!token || !action || !['confirm', 'deny'].includes(action)) {
    return new Response(
      sponsorResponsePage('Invalid link', 'This confirmation link is missing required information. Please contact your lodge admin.'),
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  const supabase = createAdminClient()

  const { data: confirmation } = await supabase
    .from('sponsor_confirmations')
    .select('id, profile_id, status, created_at')
    .eq('token', token)
    .maybeSingle()

  if (!confirmation) {
    return new Response(
      sponsorResponsePage('Link not found', 'This confirmation link is invalid or has already been used.'),
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  if (confirmation.status !== 'pending') {
    return new Response(
      sponsorResponsePage('Already responded', 'This sponsor confirmation has already been processed.'),
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  const createdAt = new Date(confirmation.created_at)
  const expired = Date.now() - createdAt.getTime() > 7 * 24 * 60 * 60 * 1000
  if (expired) {
    await supabase
      .from('sponsor_confirmations')
      .update({ status: 'expired', responded_at: new Date().toISOString() })
      .eq('id', confirmation.id)
      .eq('status', 'pending')

    return new Response(
      sponsorResponsePage('Link expired', 'This confirmation link has expired. The member will need to submit a new join request.'),
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  const now = new Date().toISOString()

  if (action === 'deny') {
    // Atomic update — only proceeds if still pending, guards against double-click
    const { data: claimed } = await supabase
      .from('sponsor_confirmations')
      .update({ status: 'denied', responded_at: now })
      .eq('id', confirmation.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (!claimed) {
      return new Response(
        sponsorResponsePage('Already responded', 'This sponsor confirmation has already been processed.'),
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    await supabase
      .from('profiles')
      .update({ verification_status: 'rejected' })
      .eq('id', confirmation.profile_id)

    return new Response(
      sponsorResponsePage('Response recorded', 'Thank you. The membership request has been declined and the lodge admin has been notified.'),
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  // Atomic update — only proceeds if still pending, guards against double-click
  const { data: claimed } = await supabase
    .from('sponsor_confirmations')
    .update({ status: 'confirmed', responded_at: now })
    .eq('id', confirmation.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (!claimed) {
    return new Response(
      sponsorResponsePage('Already responded', 'This sponsor confirmation has already been processed.'),
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  await supabase
    .from('profiles')
    .update({ verification_status: 'verified' })
    .eq('id', confirmation.profile_id)

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, city, lat, lng')
    .eq('id', confirmation.profile_id)
    .single()

  const { data: listing } = await supabase
    .from('listings')
    .select('id')
    .eq('profile_id', confirmation.profile_id)
    .eq('is_active', true)
    .maybeSingle()

  let nearbyRequestCount = 0
  if (profile?.lat && profile?.lng) {
    const { data: openRequests } = await supabase
      .from('requests')
      .select('lat, lng')
      .in('status', ['open', 'active'])

    nearbyRequestCount = (openRequests || []).filter(r => {
      if (r.lat == null || r.lng == null) return false
      return haversineDistance(profile.lat!, profile.lng!, r.lat, r.lng) <= 50
    }).length
  }

  if (profile?.email && profile.full_name) {
    try {
      await sendMemberVerifiedEmail({
        to: profile.email,
        memberName: profile.full_name,
        city: profile.city || 'your area',
        nearbyRequestCount,
        hasListing: !!listing,
      })
    } catch (err) {
      console.error('Member verified email failed:', err)
    }
  }

  return new Response(
    sponsorResponsePage('Membership confirmed', 'Thank you for confirming. The member has been verified and will receive a welcome email shortly.'),
    { headers: { 'Content-Type': 'text/html' } }
  )
}
