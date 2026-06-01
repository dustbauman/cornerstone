import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendListingLiveEmail } from '@/lib/email'
import { getAppUrl } from '@/lib/email/send'

export async function POST(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { listingId?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const listingId = body.listingId?.trim()
  if (!listingId) {
    return Response.json({ error: 'listingId required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: listing } = await admin
    .from('listings')
    .select('id, profile_id, business_name, trade_category, is_active')
    .eq('id', listingId)
    .maybeSingle()

  if (!listing || listing.profile_id !== user.id || !listing.is_active) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile?.email) {
    return Response.json({ error: 'No email on profile' }, { status: 400 })
  }

  const appUrl = getAppUrl()
  const listingUrl = `${appUrl}/directory/${listing.id}`

  try {
    await sendListingLiveEmail({
      to: profile.email,
      memberName: profile.full_name || 'Member',
      businessName: listing.business_name,
      trade: listing.trade_category,
      listingUrl,
      directoryUrl: `${appUrl}/directory`,
    })
  } catch (err) {
    console.error('Listing live email error:', err)
    return Response.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return Response.json({ success: true })
}
