import { createAdminClient } from '@/lib/supabase/admin'
import { sendPasswordResetEmail } from '@/lib/email'
import { getAppUrl } from '@/lib/email/send'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const ipLimit = await checkRateLimit({
    name: 'auth-reset-ip',
    identifier: getClientIp(request),
    max: 10,
    window: '1 h',
  })
  if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfter)

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

  const emailLimit = await checkRateLimit({
    name: 'auth-reset-email',
    identifier: email,
    max: 5,
    window: '1 h',
  })
  if (!emailLimit.ok) return rateLimitResponse(emailLimit.retryAfter)

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
