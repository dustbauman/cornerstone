import { createAdminClient } from '@/lib/supabase/admin'
import { getRouteUser } from '@/lib/supabase/route-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const user = await getRouteUser(request)

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: rows, error } = await admin
    .from('requests')
    .select(
      'id, title, category, city, state, status, responses_count, created_at, requester_notify_token'
    )
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Failed to load my requests:', error)
    return Response.json({ error: 'Failed to load requests' }, { status: 500 })
  }

  const requests = rows ?? []
  const requestIds = requests.map((r) => r.id)

  const unreadByRequest = new Map<string, number>()
  if (requestIds.length > 0) {
    const { data: unreadRows } = await admin
      .from('request_responses')
      .select('request_id')
      .in('request_id', requestIds)
      .eq('status', 'sent')

    for (const row of unreadRows ?? []) {
      unreadByRequest.set(row.request_id, (unreadByRequest.get(row.request_id) ?? 0) + 1)
    }
  }

  return Response.json({
    requests: requests.map((r) => ({
      ...r,
      new_responses_count: unreadByRequest.get(r.id) ?? 0,
    })),
  })
}
