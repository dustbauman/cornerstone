import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: rows } = await admin
    .from('request_responses')
    .select('id, message, status, created_at, request_id')
    .eq('responder_id', user.id)
    .order('created_at', { ascending: false })

  if (!rows?.length) {
    return Response.json({ responses: [] })
  }

  const requestIds = Array.from(new Set(rows.map((r) => r.request_id)))

  const { data: requests } = await admin
    .from('requests')
    .select('id, title, posted_by_name, city, state, lodge_display, status')
    .in('id', requestIds)

  const requestMap = new Map((requests ?? []).map((r) => [r.id, r]))

  const responses = rows.map((row) => {
    const req = requestMap.get(row.request_id)
    return {
      id: row.id,
      message: row.message,
      status: row.status,
      created_at: row.created_at,
      request: req
        ? {
            id: req.id,
            title: req.title,
            posted_by_name: req.posted_by_name,
            city: req.city,
            state: req.state,
            lodge_display: req.lodge_display,
            status: req.status,
          }
        : null,
    }
  })

  return Response.json({ responses })
}
