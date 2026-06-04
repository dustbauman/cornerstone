import { requirePlatformAdmin } from '@/lib/platform-admin'
import { enrichLodgeGeo } from '@/lib/lodges/geocode-lodge'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const result = await requirePlatformAdmin()
  if ('error' in result) return result.error

  const { admin } = result
  const lodgeId = params.id

  const body = await request.json().catch(() => ({}))
  const { directory_id } = body as { directory_id?: string | null }

  if (directory_id === undefined) {
    return Response.json({ error: 'directory_id is required' }, { status: 400 })
  }

  const { data: lodge, error: fetchErr } = await admin
    .from('lodges')
    .select('id, name, number, state, city, meeting_address, lat, lng, directory_id')
    .eq('id', lodgeId)
    .single()

  if (fetchErr || !lodge) {
    return Response.json({ error: 'Lodge not found' }, { status: 404 })
  }

  const { error: patchErr } = await admin
    .from('lodges')
    .update({ directory_id })
    .eq('id', lodgeId)

  if (patchErr) {
    console.error('ops lodge patch error:', patchErr)
    return Response.json({ error: 'Update failed' }, { status: 500 })
  }

  // Backfill geo from directory row when linking
  if (directory_id) {
    await enrichLodgeGeo(admin, {
      id: lodgeId,
      number: lodge.number ?? undefined,
      city: lodge.city,
      state: lodge.state,
      meeting_address: lodge.meeting_address,
      lat: lodge.lat,
      lng: lodge.lng,
      directory_id,
    })
  }

  return Response.json({ ok: true })
}
