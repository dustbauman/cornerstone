import { createClient } from '@/lib/supabase/server'
import { assertRequesterAuthorized } from '@/lib/request-response/access'
import { loadRequestResponsesPayload } from '@/lib/request-response/load-responses'
import { getRouteUser } from '@/lib/supabase/route-auth'

export const dynamic = 'force-dynamic'

/** Guest / magic-link access via ?token= */
export async function GET(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  const supabase = createClient()
  const user = await getRouteUser(request)
  const auth = await assertRequesterAuthorized(supabase, params.requestId, token, user)

  if (!auth.authorized) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = await loadRequestResponsesPayload(params.requestId)
  if (!payload) {
    return Response.json({ error: 'Request not found' }, { status: 404 })
  }

  return Response.json(payload)
}
