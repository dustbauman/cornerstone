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
  const { lodge_id, verification_status, is_lodge_admin, is_co_admin } = body as {
    lodge_id?: string | null
    verification_status?: string
    is_lodge_admin?: boolean
    is_co_admin?: boolean
  }

  const patch: Record<string, string | boolean | null> = {}
  if (lodge_id !== undefined) patch.lodge_id = lodge_id
  if (verification_status !== undefined) patch.verification_status = verification_status
  if (is_lodge_admin !== undefined) patch.is_lodge_admin = is_lodge_admin
  if (is_co_admin !== undefined) patch.is_co_admin = is_co_admin

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

  const { error } = await admin.auth.admin.deleteUser(params.id)

  if (error) {
    console.error('ops user delete error:', error)
    return Response.json({ error: 'Delete failed' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
