import { sendMemberMagicLinkEmail, sendSponsorConfirmEmail } from '@/lib/email'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const body = await request.json()
  const { lodgeSlug, fullName, email, sponsorName, sponsorContact } = body

  if (!lodgeSlug || !fullName || !email || !sponsorName || !sponsorContact) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  let lodge = null

  const { data: bySlug } = await supabase
    .from('lodges')
    .select('id, name, number, slug, status, welcome_message')
    .eq('slug', lodgeSlug)
    .eq('status', 'active')
    .maybeSingle()

  if (bySlug) {
    lodge = bySlug
  } else if (uuidPattern.test(lodgeSlug)) {
    const { data: byId } = await supabase
      .from('lodges')
      .select('id, name, number, slug, status, welcome_message')
      .eq('id', lodgeSlug)
      .eq('status', 'active')
      .maybeSingle()
    lodge = byId
  }

  if (!lodge) {
    return Response.json({ error: 'LODGE_NOT_FOUND', message: 'This lodge is not on Tyrian yet.' }, { status: 404 })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const normalizedSponsorContact = sponsorContact.trim()

  if (!normalizedSponsorContact.includes('@')) {
    return Response.json({
      error: 'SPONSOR_EMAIL_REQUIRED',
      message: 'Sponsor contact must be an email address so we can send them a confirmation request.',
    }, { status: 400 })
  }

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: normalizedEmail,
    options: {
      redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent('/join/complete')}`,
    },
  })

  if (linkError || !linkData.user) {
    console.error('Magic link error:', linkError)
    return Response.json({ error: 'Failed to start signup' }, { status: 500 })
  }

  const userId = linkData.user.id
  const magicLink = linkData.properties.action_link

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: normalizedEmail,
      full_name: fullName.trim(),
      lodge_id: lodge.id,
      sponsor_name: sponsorName.trim(),
      sponsor_contact: sponsorContact.trim(),
      verification_status: 'pending',
    }, { onConflict: 'id' })

  if (profileError) {
    console.error('Profile upsert error:', profileError)
    return Response.json({ error: 'Failed to save profile' }, { status: 500 })
  }

  const { data: confirmation, error: confirmError } = await supabase
    .from('sponsor_confirmations')
    .insert({
      profile_id: userId,
      sponsor_name: sponsorName.trim(),
      sponsor_contact: sponsorContact.trim(),
    })
    .select('token')
    .single()

  if (confirmError || !confirmation) {
    console.error('Sponsor confirmation error:', confirmError)
    return Response.json({ error: 'Failed to create sponsor confirmation' }, { status: 500 })
  }

  const emailsConfigured = !!process.env.RESEND_API_KEY
  const emailErrors: string[] = []

  try {
    await sendMemberMagicLinkEmail({
      to: normalizedEmail,
      memberName: fullName.trim(),
      lodgeName: lodge.name,
      lodgeNumber: lodge.number,
      magicLink,
    })
  } catch (err) {
    console.error('Member magic link email error:', err)
    emailErrors.push('member')
  }

  try {
    await sendSponsorConfirmEmail({
      sponsorContact: normalizedSponsorContact,
      sponsorName: sponsorName.trim(),
      memberName: fullName.trim(),
      lodgeName: lodge.name,
      lodgeNumber: lodge.number,
      token: confirmation.token,
    })
  } catch (err) {
    console.error('Sponsor confirm email error:', err)
    emailErrors.push('sponsor')
  }

  if (!emailsConfigured) {
    console.log('[member-join] RESEND_API_KEY not set — emails logged to console only')
    console.log(`  Member magic link for ${normalizedEmail}: ${magicLink}`)
  }

  if (emailsConfigured && emailErrors.length === 2) {
    return Response.json({
      error: 'EMAIL_FAILED',
      message: 'Your profile was created but we could not send emails. Contact your lodge admin for help signing in.',
    }, { status: 500 })
  }

  return Response.json({
    success: true,
    emailsConfigured,
    emailWarnings: emailErrors,
  })
}
