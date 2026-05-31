import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { isRequestOwnedByUser } from '@/lib/request-response/load-responses'
import { getRouteUser } from '@/lib/supabase/route-auth'

export interface RequestRow {
  id: string
  profile_id: string | null
  posted_by_email: string
  posted_by_name: string
  title: string
  status: string
  responses_count: number
  requester_notify_token: string | null
  notify_token_sent_at: string | null
}

export async function loadRequest(requestId: string): Promise<RequestRow | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('requests')
    .select(
      'id, profile_id, posted_by_email, posted_by_name, title, status, responses_count, requester_notify_token, notify_token_sent_at'
    )
    .eq('id', requestId)
    .maybeSingle()

  if (error) {
    console.error('loadRequest error:', error.message)
    return null
  }

  return data as RequestRow | null
}

const TOKEN_EXPIRY_MS = 180 * 24 * 60 * 60 * 1000 // 180 days

function isTokenAuthorized(req: RequestRow, token: string): boolean {
  if (!req.requester_notify_token || token !== req.requester_notify_token) {
    return false
  }
  if (req.notify_token_sent_at) {
    const sentAt = new Date(req.notify_token_sent_at).getTime()
    if (Date.now() - sentAt > TOKEN_EXPIRY_MS) return false
  }
  return true
}

export function isRequesterAuthorized(
  req: RequestRow,
  user: User | null,
  token: string | null
): boolean {
  if (user && isRequestOwnedByUser(req, user)) return true
  if (token && isTokenAuthorized(req, token)) return true
  return false
}

export async function assertRequesterAuthorized(
  supabase: SupabaseClient,
  requestId: string,
  token: string | null,
  userOverride?: User | null
): Promise<{ authorized: true; request: RequestRow } | { authorized: false }> {
  const request = await loadRequest(requestId)
  if (!request) return { authorized: false }

  const user = userOverride ?? (await getRouteUser())

  const ok = isRequesterAuthorized(request, user, token)
  if (!ok) return { authorized: false }
  return { authorized: true, request }
}
