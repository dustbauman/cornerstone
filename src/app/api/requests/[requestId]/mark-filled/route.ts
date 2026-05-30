import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertRequesterAuthorized } from '@/lib/request-response/access'

export async function POST(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  const supabase = createClient()
  let token: string | null = null
  let responseId: string | undefined

  try {
    const body = await request.json()
    token = typeof body.token === 'string' ? body.token : null
    responseId = typeof body.responseId === 'string' ? body.responseId : undefined
  } catch {
    // empty body ok for auth-only callers
  }

  const auth = await assertRequesterAuthorized(supabase, params.requestId, token)

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

  await admin
    .from('requests')
    .update({ status: 'filled', filled_at: now })
    .eq('id', params.requestId)

  if (responseId) {
    await admin
      .from('request_responses')
      .update({ status: 'accepted' })
      .eq('id', responseId)
      .eq('request_id', params.requestId)
  }

  return Response.json({ success: true })
}
