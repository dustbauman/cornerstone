import { requireLodgeAdmin } from '@/lib/lodge-admin'
import { sendLodgeMemberInviteEmail } from '@/lib/email'
import { getAppUrl } from '@/lib/email/send'
import { canAcceptNewMember } from '@/lib/invites'

export async function POST(request: Request) {
  const auth = await requireLodgeAdmin()
  if ('error' in auth && auth.error) return auth.error

  const { lodge, adminName } = auth

  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const email = body.email?.toLowerCase().trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Valid email required' }, { status: 400 })
  }

  const { allowed, cap } = await canAcceptNewMember(lodge.id)
  if (!allowed) {
    return Response.json({
      error: 'LODGE_AT_CAPACITY',
      message: cap
        ? `Your lodge has reached its ${cap}-verified member limit. Upgrade your plan to invite more brothers.`
        : 'Your lodge cannot accept new members right now.',
    }, { status: 403 })
  }

  const slug = lodge.slug ?? lodge.id
  const joinUrl = `${getAppUrl()}/join/${slug}`

  try {
    await sendLodgeMemberInviteEmail({
      to: email,
      lodgeName: lodge.name,
      lodgeNumber: lodge.number,
      joinUrl,
      adminName,
    })
  } catch (err) {
    console.error('Lodge invite email error:', err)
    return Response.json({ error: 'Failed to send invite email' }, { status: 500 })
  }

  return Response.json({ success: true, joinUrl })
}
