import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { id?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const id = body.id?.trim()
  if (!id) {
    return Response.json({ error: 'Listing id required' }, { status: 400 })
  }

  const { data: listing } = await supabase
    .from('listings')
    .select('profile_id')
    .eq('id', id)
    .maybeSingle()

  if (!listing || listing.profile_id !== user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  revalidatePath(`/directory/${id}`)
  revalidatePath('/directory')

  return Response.json({ ok: true })
}
