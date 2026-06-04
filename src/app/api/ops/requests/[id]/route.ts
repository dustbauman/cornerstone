import { requirePlatformAdmin } from '@/lib/platform-admin'

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const result = await requirePlatformAdmin()
  if ('error' in result) return result.error

  const { admin } = result

  const { error } = await admin
    .from('requests')
    .update({ status: 'withdrawn' })
    .eq('id', params.id)

  if (error) {
    console.error('ops request withdraw error:', error)
    return Response.json({ error: 'Withdraw failed' }, { status: 500 })
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

  // Delete responses first to avoid FK violations
  await admin.from('request_responses').delete().eq('request_id', params.id)

  const { error } = await admin.from('requests').delete().eq('id', params.id)

  if (error) {
    console.error('ops request delete error:', error)
    return Response.json({ error: 'Delete failed' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
