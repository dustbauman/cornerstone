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
  const { data } = await admin
    .from('profiles')
    .select('request_emails_enabled, verification_status')
    .eq('id', user.id)
    .single()

  return Response.json({
    enabled: data?.request_emails_enabled ?? true,
    verified: data?.verification_status === 'verified',
  })
}

export async function PATCH(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let enabled: boolean
  try {
    const body = await request.json()
    if (typeof body.enabled !== 'boolean') {
      return Response.json({ error: 'enabled must be a boolean' }, { status: 400 })
    }
    enabled = body.enabled
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ request_emails_enabled: enabled })
    .eq('id', user.id)

  if (error) {
    console.error('request_emails_enabled update error:', error)
    return Response.json({ error: 'Failed to update preference' }, { status: 500 })
  }

  return Response.json({ enabled })
}
