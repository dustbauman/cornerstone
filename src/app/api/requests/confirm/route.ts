import { createAdminClient } from '@/lib/supabase/admin'
import { notifyMatchingPros, type NotifyRequest } from '@/lib/db/match-pros'

export async function POST(request: Request) {
  let token: string | null = null
  try {
    const body = await request.json()
    if (typeof body.token === 'string') token = body.token.trim()
  } catch {
    // fall through
  }

  if (!token) {
    return Response.json({ error: 'Missing confirmation token' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: req } = await admin
    .from('requests')
    .select(
      'id, profile_id, category, title, city, state, lat, lng, budget, timeline, details, remote_eligible, confirmed_at, pros_notified_at'
    )
    .eq('confirmation_token', token)
    .maybeSingle()

  if (!req) {
    return Response.json({ error: 'This confirmation link is invalid or has expired.' }, { status: 404 })
  }

  // Confirm (idempotent) — set confirmed_at and clear the token the first time.
  if (!req.confirmed_at) {
    const { error: updateError } = await admin
      .from('requests')
      .update({ confirmed_at: new Date().toISOString(), confirmation_token: null })
      .eq('id', req.id)
    if (updateError) {
      console.error('Request confirm update error:', updateError)
      return Response.json({ error: 'Could not confirm your request. Please try again.' }, { status: 500 })
    }
  }

  // Notify matching pros exactly once, guarded by pros_notified_at.
  if (!req.pros_notified_at) {
    try {
      const notifyRequest: NotifyRequest = {
        id: req.id,
        profile_id: req.profile_id,
        category: req.category,
        title: req.title,
        city: req.city,
        state: req.state,
        lat: req.lat,
        lng: req.lng,
        budget: req.budget,
        timeline: req.timeline,
        details: req.details,
        remote_eligible: req.remote_eligible,
      }
      await notifyMatchingPros(admin, notifyRequest)
      await admin
        .from('requests')
        .update({ pros_notified_at: new Date().toISOString() })
        .eq('id', req.id)
    } catch (err) {
      console.error('Push-to-pro notify (confirm) failed:', err)
    }
  }

  return Response.json({ success: true, requestId: req.id })
}
