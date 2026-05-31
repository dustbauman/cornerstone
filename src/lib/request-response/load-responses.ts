import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResponderContacts } from '@/lib/db/responder-contact'

export async function loadRequestResponsesPayload(requestId: string) {
  const admin = createAdminClient()

  const { data: reqRow } = await admin
    .from('requests')
    .select('id, title, status, posted_by_name, responses_count')
    .eq('id', requestId)
    .maybeSingle()

  if (!reqRow) {
    return null
  }

  const { data: rows } = await admin
    .from('request_responses')
    .select('id, message, status, created_at, responder_id')
    .eq('request_id', requestId)
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

  return {
    request: reqRow,
    responses,
  }
}

export function isRequestOwnedByUser(
  req: {
    profile_id: string | null
    posted_by_email: string
  },
  user: { id: string; email?: string | null }
): boolean {
  if (req.profile_id && req.profile_id === user.id) return true
  if (!user.email) return false
  return user.email.trim().toLowerCase() === req.posted_by_email.trim().toLowerCase()
}

export async function loadOwnedRequest(
  admin: SupabaseClient,
  requestId: string,
  user: { id: string; email?: string | null }
) {
  const { data: req } = await admin
    .from('requests')
    .select('id, profile_id, posted_by_email')
    .eq('id', requestId)
    .maybeSingle()

  if (!req || !isRequestOwnedByUser(req, user)) return null
  return req
}
