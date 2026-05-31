import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { normalizeWebsiteUrl } from '@/lib/url'

async function requireLodgeAdmin() {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('lodge_id, is_lodge_admin, is_co_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.lodge_id || (!profile.is_lodge_admin && !profile.is_co_admin)) {
    return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { lodgeId: profile.lodge_id, admin }
}

export async function PATCH(request: Request) {
  const auth = await requireLodgeAdmin()
  if ('error' in auth && auth.error) return auth.error
  const { lodgeId, admin } = auth

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const city = typeof body.city === 'string' ? body.city.trim() : ''
  if (!city) {
    return Response.json({ error: 'City is required' }, { status: 400 })
  }

  const update = {
    city,
    meeting_address:
      typeof body.meeting_address === 'string'
        ? body.meeting_address.trim() || null
        : null,
    meeting_schedule:
      typeof body.meeting_schedule === 'string'
        ? body.meeting_schedule.trim() || null
        : null,
    website:
      typeof body.website === 'string' ? normalizeWebsiteUrl(body.website) : null,
    welcome_message:
      typeof body.welcome_message === 'string'
        ? body.welcome_message.trim() || null
        : null,
  }

  const { data: lodge, error } = await admin
    .from('lodges')
    .update(update)
    .eq('id', lodgeId)
    .select('id, slug')
    .single()

  if (error) {
    console.error('Lodge update error:', error)
    return Response.json({ error: 'Could not save lodge details' }, { status: 500 })
  }

  const slug = lodge.slug ?? lodge.id
  revalidatePath(`/lodge/${slug}`)
  revalidatePath('/network')

  return Response.json({ ok: true })
}
