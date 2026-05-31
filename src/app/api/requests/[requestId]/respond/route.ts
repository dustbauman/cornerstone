import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResponderContact } from '@/lib/db/responder-contact'
import { sendResponseNotification } from '@/lib/email'

export async function POST(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, lodge_id, verification_status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.verification_status !== 'verified') {
    return Response.json(
      { error: 'Only verified members can respond to requests' },
      { status: 403 }
    )
  }

  if (!profile.full_name?.trim() || !profile.lodge_id) {
    return Response.json(
      { error: 'Add your name and lodge to your profile before responding' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  const { data: req } = await admin
    .from('requests')
    .select(
      'id, profile_id, title, status, responses_count, posted_by_email, posted_by_name, requester_notify_token'
    )
    .eq('id', params.requestId)
    .in('status', ['open', 'active'])
    .maybeSingle()

  if (!req) {
    return Response.json(
      { error: 'Request not found or no longer accepting responses' },
      { status: 404 }
    )
  }

  if (req.profile_id === user.id) {
    return Response.json({ error: 'You cannot respond to your own request' }, { status: 403 })
  }

  const { data: existing } = await admin
    .from('request_responses')
    .select('id')
    .eq('request_id', params.requestId)
    .eq('responder_id', user.id)
    .maybeSingle()

  if (existing) {
    return Response.json(
      { error: 'You have already responded to this request' },
      { status: 409 }
    )
  }

  let message: string | null = null
  try {
    const body = await request.json()
    if (body.message && typeof body.message === 'string') {
      message = body.message.trim().slice(0, 500) || null
    }
  } catch {
    // optional body
  }

  const { error: insertError } = await supabase.from('request_responses').insert({
    request_id: params.requestId,
    responder_id: user.id,
    message,
    status: 'sent',
    responder_contact_revealed: true,
  })

  if (insertError) {
    console.error('Response insert error:', insertError)
    return Response.json({ error: 'Failed to submit response' }, { status: 500 })
  }

  // Count after insert so concurrent submits don't clobber each other.
  const { count: responseCount } = await admin
    .from('request_responses')
    .select('id', { count: 'exact', head: true })
    .eq('request_id', params.requestId)

  await admin
    .from('requests')
    .update({
      responses_count: responseCount ?? 1,
      status: req.status === 'open' ? 'active' : req.status,
      notify_token_sent_at: new Date().toISOString(),
    })
    .eq('id', params.requestId)

  const contact = await getResponderContact(admin, user.id)

  // otherCount = responses before this one (responseCount already includes this insert)
  const otherCount = Math.max(0, (responseCount ?? 1) - 1)

  try {
    await sendResponseNotification({
      requesterEmail: req.posted_by_email,
      requesterName: req.posted_by_name,
      notifyToken: req.requester_notify_token ?? '',
      requestTitle: req.title,
      requestId: req.id,
      responderName: contact?.fullName ?? profile.full_name ?? 'Verified Member',
      responderTrade: contact?.trade ?? null,
      responderLodge: contact?.lodgeLabel ?? 'Verified Member',
      responderCity: contact?.city ?? null,
      responderState: contact?.state ?? null,
      responderPhone: contact?.phone ?? null,
      responderEmail: contact?.email ?? null,
      message,
      otherResponseCount: otherCount,
    })
  } catch (err) {
    console.error('Response notification email failed:', err)
  }

  return Response.json({ success: true })
}
