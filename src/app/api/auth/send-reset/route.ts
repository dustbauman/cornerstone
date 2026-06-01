import { createAdminClient } from '@/lib/supabase/admin'
import { sendPasswordResetEmail } from '@/lib/email'
import { getAppUrl } from '@/lib/email/send'

export async function POST(request: Request) {
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

  const appUrl = getAppUrl()
  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('email', email)
    .maybeSingle()

  // Always return success to avoid email enumeration
  const okResponse = () =>
    Response.json({
      success: true,
      message: 'If an account exists for this email, a reset link has been sent.',
    })

  if (!profile) {
    return okResponse()
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  if (linkError || !linkData.properties?.action_link) {
    console.error('Password reset link error:', linkError)
    return okResponse()
  }

  try {
    await sendPasswordResetEmail({
      to: email,
      resetLink: linkData.properties.action_link,
      firstName: profile.full_name?.split(' ')[0],
    })
  } catch (err) {
    console.error('Password reset email error:', err)
  }

  return okResponse()
}
