import { createAdminClient } from '@/lib/supabase/admin'
import { sendAuthMagicLinkEmail } from '@/lib/email'
import { getAppUrl } from '@/lib/email/send'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const ipLimit = await checkRateLimit({
    name: 'auth-magic-link-ip',
    identifier: getClientIp(request),
    max: 10,
    window: '1 h',
  })
  if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfter)

  let body: { email?: string; redirectTo?: string; purpose?: string }
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
    name: 'auth-magic-link-email',
    identifier: email,
    max: 5,
    window: '1 h',
  })
  if (!emailLimit.ok) return rateLimitResponse(emailLimit.retryAfter)

  const purpose = body.purpose === 'claim' ? 'claim' : 'sign-in'
  const appUrl = getAppUrl()
  const redirectTo =
    body.redirectTo?.trim() ||
    (purpose === 'claim'
      ? `${appUrl}/auth/callback?next=${encodeURIComponent('/claim')}`
      : `${appUrl}/auth/callback?next=${encodeURIComponent('/dashboard')}`)

  const admin = createAdminClient()

  if (purpose === 'sign-in') {
    // Always return the same generic success to avoid email enumeration:
    // the response must not reveal whether an account exists for this email.
    const genericOk = () =>
      Response.json({
        success: true,
        message:
          'If a Tyrian account exists for this email, a sign-in link has been sent.',
      })

    const { data: profile } = await admin
      .from('profiles')
      .select('id, full_name')
      .eq('email', email)
      .maybeSingle()

    if (!profile) {
      return genericOk()
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    })

    if (linkError || !linkData.properties?.action_link) {
      console.error('Auth magic link error:', linkError)
      return genericOk()
    }

    try {
      await sendAuthMagicLinkEmail({
        to: email,
        magicLink: linkData.properties.action_link,
        purpose: 'sign-in',
        firstName: profile.full_name?.split(' ')[0],
      })
    } catch (err) {
      console.error('Sign-in email error:', err)
    }

    return genericOk()
  }

  // Claim flow — allow checkout email that may not have a profile yet
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })

  if (linkError || !linkData.properties?.action_link) {
    console.error('Claim magic link error:', linkError)
    return Response.json({ error: 'Failed to send sign-in link' }, { status: 500 })
  }

  try {
    await sendAuthMagicLinkEmail({
      to: email,
      magicLink: linkData.properties.action_link,
      purpose: 'claim',
    })
  } catch (err) {
    console.error('Claim sign-in email error:', err)
    return Response.json({ error: 'Failed to send sign-in link' }, { status: 500 })
  }

  return Response.json({ success: true })
}
