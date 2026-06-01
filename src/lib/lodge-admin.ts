import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function requireLodgeAdmin() {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('lodge_id, is_lodge_admin, is_co_admin, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.lodge_id || (!profile.is_lodge_admin && !profile.is_co_admin)) {
    return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const { data: lodge } = await admin
    .from('lodges')
    .select('id, name, number, slug, status, invite_cap, invites_sent')
    .eq('id', profile.lodge_id)
    .single()

  if (!lodge || lodge.status !== 'active') {
    return { error: Response.json({ error: 'Lodge not active' }, { status: 403 }) }
  }

  return { userId: user.id, admin, lodge, adminName: profile.full_name ?? 'Your lodge admin' }
}
