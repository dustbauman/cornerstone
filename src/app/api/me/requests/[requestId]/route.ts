import { createAdminClient } from '@/lib/supabase/admin'
import { loadOwnedRequest } from '@/lib/request-response/load-responses'
import { getRouteUser } from '@/lib/supabase/route-auth'

export const dynamic = 'force-dynamic'

const EDITABLE_STATUSES = new Set(['open', 'active'])
const VALID_TIMELINES = new Set(['ASAP', 'Within 1 week', 'Within 1 month', 'Flexible'])

function normalizeTimeline(timeline: string): string {
  if (VALID_TIMELINES.has(timeline)) return timeline
  return 'Flexible'
}

export async function PATCH(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  const user = await getRouteUser(request)
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const owned = await loadOwnedRequest(admin, params.requestId, user)
  if (!owned) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: reqRow } = await admin
    .from('requests')
    .select('id, status')
    .eq('id', params.requestId)
    .maybeSingle()

  if (!reqRow) {
    return Response.json({ error: 'Request not found' }, { status: 404 })
  }

  if (!EDITABLE_STATUSES.has(reqRow.status)) {
    return Response.json(
      { error: 'Only open or active requests can be edited' },
      { status: 409 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}

  if (typeof body.title === 'string' && body.title.trim()) {
    updates.title = body.title.trim().slice(0, 200)
  }
  if (typeof body.category === 'string' && body.category.trim()) {
    updates.category = body.category.trim()
  }
  if (typeof body.city === 'string' && body.city.trim()) {
    updates.city = body.city.trim()
  }
  if (typeof body.state === 'string' && body.state.trim()) {
    updates.state = body.state.trim().slice(0, 2).toUpperCase()
  }
  if (body.budget !== undefined) {
    updates.budget =
      typeof body.budget === 'string' && body.budget.trim() ? body.budget.trim() : null
  }
  if (typeof body.timeline === 'string') {
    updates.timeline = normalizeTimeline(body.timeline)
  }
  if (body.details !== undefined) {
    updates.details =
      typeof body.details === 'string' && body.details.trim() ? body.details.trim() : null
  }
  if (typeof body.remoteEligible === 'boolean') {
    updates.remote_eligible = body.remoteEligible
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data: updated, error } = await admin
    .from('requests')
    .update(updates)
    .eq('id', params.requestId)
    .select(
      'id, title, category, city, state, budget, timeline, details, status, remote_eligible, responses_count'
    )
    .single()

  if (error || !updated) {
    console.error('Request update error:', error)
    return Response.json({ error: 'Failed to update request' }, { status: 500 })
  }

  return Response.json({ request: updated })
}

export async function DELETE(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  const user = await getRouteUser(request)
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const owned = await loadOwnedRequest(admin, params.requestId, user)
  if (!owned) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: reqRow } = await admin
    .from('requests')
    .select('id, status')
    .eq('id', params.requestId)
    .maybeSingle()

  if (!reqRow) {
    return Response.json({ error: 'Request not found' }, { status: 404 })
  }

  if (!EDITABLE_STATUSES.has(reqRow.status)) {
    return Response.json(
      { error: 'Only open or active requests can be withdrawn' },
      { status: 409 }
    )
  }

  const { error } = await admin
    .from('requests')
    .update({ status: 'withdrawn' })
    .eq('id', params.requestId)

  if (error) {
    console.error('Request withdraw error:', error)
    return Response.json({ error: 'Failed to withdraw request' }, { status: 500 })
  }

  return Response.json({ success: true })
}
