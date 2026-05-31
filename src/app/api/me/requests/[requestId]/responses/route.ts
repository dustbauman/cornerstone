import { createAdminClient } from '@/lib/supabase/admin'
import { loadOwnedRequest, loadRequestResponsesPayload } from '@/lib/request-response/load-responses'
import { getRouteUser } from '@/lib/supabase/route-auth'

export const dynamic = 'force-dynamic'

export async function GET(
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

  if (!owned.profile_id) {
    await admin
      .from('requests')
      .update({ profile_id: user.id })
      .eq('id', params.requestId)
  }

  const payload = await loadRequestResponsesPayload(params.requestId)
  if (!payload) {
    return Response.json({ error: 'Request not found' }, { status: 404 })
  }

  return Response.json(payload)
}
