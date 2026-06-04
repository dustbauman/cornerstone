import { requirePlatformAdmin } from '@/lib/platform-admin'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const result = await requirePlatformAdmin()
  if ('error' in result) return result.error

  const { admin } = result
  const body = await request.json().catch(() => ({}))
  const { is_active } = body as { is_active?: boolean }

  if (typeof is_active !== 'boolean') {
    return Response.json({ error: 'is_active (boolean) is required' }, { status: 400 })
  }

  const { error } = await admin
    .from('listings')
    .update({ is_active })
    .eq('id', params.id)

  if (error) {
    console.error('ops listing patch error:', error)
    return Response.json({ error: 'Update failed' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
