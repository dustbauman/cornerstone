import { requirePlatformAdmin } from '@/lib/platform-admin'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const result = await requirePlatformAdmin()
  if ('error' in result) return result.error

  const { admin } = result

  const { error } = await admin.from('reviews').delete().eq('id', params.id)

  if (error) {
    console.error('ops review delete error:', error)
    return Response.json({ error: 'Delete failed' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
