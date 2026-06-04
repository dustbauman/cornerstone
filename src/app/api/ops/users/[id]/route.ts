import { requirePlatformAdmin } from '@/lib/platform-admin'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const result = await requirePlatformAdmin()
  if ('error' in result) return result.error

  const { admin } = result
  const userId = params.id

  const body = await request.json().catch(() => ({}))
  const { lodge_id, verification_status } = body as {
    lodge_id?: string | null
    verification_status?: string
  }

  const patch: Record<string, string | null> = {}
  if (lodge_id !== undefined) patch.lodge_id = lodge_id
  if (verification_status !== undefined) patch.verification_status = verification_status

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await admin.from('profiles').update(patch).eq('id', userId)

  if (error) {
    console.error('ops user patch error:', error)
    return Response.json({ error: 'Update failed' }, { status: 500 })
  }

  return Response.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const result = await requirePlatformAdmin()
  if ('error' in result) return result.error

  const { admin } = result
  const userId = params.id

  const { error } = await admin.auth.admin.deleteUser(userId)

  if (error) {
    console.error('ops user delete error:', error)
    return Response.json({ error: 'Delete failed' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
