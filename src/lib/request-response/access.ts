import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export interface RequestRow {
  id: string
  profile_id: string | null
  posted_by_email: string
  posted_by_name: string
  title: string
  status: string
  responses_count: number
  requester_notify_token: string | null
}

export async function loadRequest(requestId: string): Promise<RequestRow | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('requests')
    .select(
      'id, profile_id, posted_by_email, posted_by_name, title, status, responses_count, requester_notify_token'
    )
    .eq('id', requestId)
    .maybeSingle()
  return data as RequestRow | null
}

export function isRequesterAuthorized(
  req: RequestRow,
  user: { id: string; email?: string | null } | null,
  token: string | null
): boolean {
  if (token && req.requester_notify_token && token === req.requester_notify_token) {
    return true
  }
  if (!user) return false
  if (req.profile_id && req.profile_id === user.id) return true
  const userEmail = user.email?.trim().toLowerCase()
  const postedEmail = req.posted_by_email?.trim().toLowerCase()
  return !!(userEmail && postedEmail && userEmail === postedEmail)
}

export async function assertRequesterAuthorized(
  supabase: SupabaseClient,
  requestId: string,
  token: string | null
): Promise<{ authorized: true; request: RequestRow } | { authorized: false }> {
  const request = await loadRequest(requestId)
  if (!request) return { authorized: false }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ok = isRequesterAuthorized(request, user, token)
  if (!ok) return { authorized: false }
  return { authorized: true, request }
}
