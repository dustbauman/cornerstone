import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertRequesterAuthorized } from '@/lib/request-response/access'
import { getRouteUser } from '@/lib/supabase/route-auth'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  const supabase = createClient()
  const user = await getRouteUser(request)
  let token: string | null = null
  let responseId: string | undefined

  try {
    const body = await request.json()
    token = typeof body.token === 'string' ? body.token : null
    responseId = typeof body.responseId === 'string' ? body.responseId : undefined
  } catch {
    // empty body ok for auth-only callers
  }

  const auth = await assertRequesterAuthorized(supabase, params.requestId, token, user)

  if (!auth.authorized) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: reqRow } = await admin
    .from('requests')
    .select('id, status')
    .eq('id', params.requestId)
    .maybeSingle()

  if (!reqRow) {
    return Response.json({ error: 'Request not found' }, { status: 404 })
  }

  if (reqRow.status === 'filled') {
    return Response.json({ error: 'Request is already marked as filled' }, { status: 409 })
  }

  const now = new Date().toISOString()
  const reviewPromptAt = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000
  ).toISOString()

  await admin
    .from('requests')
    .update({
      status: 'filled',
      filled_at: now,
      review_prompt_at: reviewPromptAt,
    })
    .eq('id', params.requestId)

  if (responseId) {
    const { count: updatedCount } = await admin
      .from('request_responses')
      .update({ status: 'accepted' }, { count: 'exact' })
      .eq('id', responseId)
      .eq('request_id', params.requestId)

    if (!updatedCount) {
      return Response.json(
        { error: 'Response not found on this request' },
        { status: 400 }
      )
    }
  }

  return Response.json({ success: true })
}
