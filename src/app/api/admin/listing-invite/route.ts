import { requireLodgeAdmin } from '@/lib/lodge-admin'
import { sendListingInviteEmail } from '@/lib/email'
import { getAppUrl } from '@/lib/email/send'

export async function POST(request: Request) {
  const auth = await requireLodgeAdmin()
  if ('error' in auth && auth.error) return auth.error

  const { lodge, adminName } = auth

  let body: { email?: string; recipientName?: string; trade?: string; message?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 })
  }

  const email = body.email?.toLowerCase().trim()
  const recipientName = body.recipientName?.trim() || 'Brother'
  const trade = body.trade?.trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Valid email required' }, { status: 400 })
  }
  if (!trade) {
    return Response.json({ error: 'Trade is required' }, { status: 400 })
  }

  const slug = lodge.slug ?? lodge.id
  const joinUrl = `${getAppUrl()}/join/${slug}`

  try {
    await sendListingInviteEmail({
      to: email,
      recipientName,
      trade,
      lodgeName: lodge.name,
      lodgeNumber: lodge.number,
      joinUrl,
      adminName,
      personalMessage: body.message?.trim() || undefined,
    })
  } catch (err) {
    console.error('Listing invite email error:', err)
    return Response.json({ error: 'Failed to send invite' }, { status: 500 })
  }

  return Response.json({ success: true })
}
