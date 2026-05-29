import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { memberId, action } = await request.json()

  if (!memberId || !['approve', 'deny'].includes(action)) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: adminProfile } = await admin
    .from('profiles')
    .select('lodge_id, is_lodge_admin, is_co_admin')
    .eq('id', user.id)
    .single()

  if (!adminProfile?.lodge_id || (!adminProfile.is_lodge_admin && !adminProfile.is_co_admin)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: target } = await admin
    .from('profiles')
    .select('id, lodge_id, is_lodge_admin, is_co_admin')
    .eq('id', memberId)
    .single()

  if (!target || target.lodge_id !== adminProfile.lodge_id) {
    return Response.json({ error: 'Member not found' }, { status: 404 })
  }

  if (target.is_lodge_admin || target.is_co_admin) {
    return Response.json({ error: 'Cannot modify lodge admin' }, { status: 400 })
  }

  if (target.id === user.id) {
    return Response.json({ error: 'Cannot modify your own status' }, { status: 400 })
  }

  const status = action === 'approve' ? 'verified' : 'rejected'

  const { error } = await admin
    .from('profiles')
    .update({ verification_status: status })
    .eq('id', memberId)

  if (error) {
    console.error('Member action error:', error)
    return Response.json({ error: 'Update failed' }, { status: 500 })
  }

  return Response.json({ success: true, status })
}
