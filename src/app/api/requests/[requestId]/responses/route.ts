import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertRequesterAuthorized } from '@/lib/request-response/access'
import { getResponderContacts } from '@/lib/db/responder-contact'

export async function GET(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  const supabase = createClient()
  const auth = await assertRequesterAuthorized(supabase, params.requestId, token)

  if (!auth.authorized) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: reqRow } = await admin
    .from('requests')
    .select('id, title, status, posted_by_name, responses_count')
    .eq('id', params.requestId)
    .maybeSingle()

  if (!reqRow) {
    return Response.json({ error: 'Request not found' }, { status: 404 })
  }

  const { data: rows } = await admin
    .from('request_responses')
    .select('id, message, status, created_at, responder_id')
    .eq('request_id', params.requestId)
    .order('created_at', { ascending: true })

  const sentIds = (rows ?? [])
    .filter((r) => r.status === 'sent')
    .map((r) => r.id)

  if (sentIds.length > 0) {
    await admin
      .from('request_responses')
      .update({ status: 'viewed' })
      .in('id', sentIds)
  }

  const responderIds = (rows ?? []).map((r) => r.responder_id)
  const contactMap = await getResponderContacts(admin, responderIds)

  const responses = (rows ?? []).map((row) => ({
    id: row.id,
    message: row.message,
    status: sentIds.includes(row.id) ? 'viewed' : row.status,
    created_at: row.created_at,
    responder: contactMap.get(row.responder_id) ?? null,
  }))

  return Response.json({
    request: reqRow,
    responses,
  })
}
