import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM = process.env.RESEND_FROM_EMAIL || 'hello@tyrian.work'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export interface LodgeClaimEmailArgs {
  to: string
  payerName: string
  lodgeName: string
  lodgeNumber: string
  claimCode: string
  tier: string
  expiresAt: Date
}

export async function sendLodgeClaimEmail(args: LodgeClaimEmailArgs) {
  const { to, payerName, lodgeName, lodgeNumber, claimCode, tier, expiresAt } = args
  const isFounding = tier === 'founding'
  const expiryStr = expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const claimUrl = `${APP_URL}/claim?code=${claimCode}`

  const subject = `Your lodge claim code for Tyrian — ${claimCode}`
  const html = `
    <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1A1A1A;">
      <div style="margin-bottom: 32px;">
        <span style="font-size: 20px; font-weight: 700; color: #1B2A4A; font-family: 'Cormorant Garamond', Georgia, serif;">Tyrian</span>
      </div>

      <p>Hi ${payerName},</p>

      <p><strong>${lodgeName} #${lodgeNumber}</strong> is now on Tyrian.</p>

      ${isFounding ? `
      <div style="background: #FEF3C7; border: 1px solid #C9A84C; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <p style="margin: 0; font-weight: 600; color: #92400E;">Founding Lodge — you've secured a permanent designation.</p>
        <p style="margin: 8px 0 0; font-size: 14px; color: #78350F;">This status is permanent and will appear on your lodge page and every member's verified profile.</p>
      </div>
      ` : ''}

      <p>Your lodge admin claim code:</p>

      <div style="background: #F8F6F1; border: 2px solid #1B2A4A; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
        <span style="font-size: 36px; font-weight: 700; letter-spacing: 6px; font-family: monospace; color: #1B2A4A;">${claimCode}</span>
      </div>

      <p>This code gives whoever uses it full admin access to your lodge on Tyrian. Forward it to your Worshipful Master or Secretary, or use it yourself if you're claiming admin.</p>

      <div style="margin: 32px 0;">
        <a href="${claimUrl}" style="background: #C9A84C; color: #1B2A4A; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
          Claim Admin Access →
        </a>
      </div>

      <p style="font-size: 13px; color: #6B7280;">This code expires on ${expiryStr}.</p>

      <hr style="border: none; border-top: 1px solid #E5E0D5; margin: 32px 0;" />

      <p style="font-size: 13px; color: #6B7280;"><strong>Not sure what to do next? Here's the short version:</strong></p>
      <ol style="font-size: 13px; color: #6B7280; padding-left: 20px;">
        <li>Forward this code to your Worshipful Master or Secretary</li>
        <li>They click "Claim Admin Access" above and sign in</li>
        <li>They invite lodge members via email, link, or QR code</li>
      </ol>

      <p style="font-size: 13px; color: #6B7280;">Questions? Reply to this email.</p>

      <p style="font-size: 12px; color: #9CA3AF; margin-top: 32px; font-style: italic;">Built on trust. Proven by the craft.<br>Tyrian · tyrian.work</p>
    </div>
  `

  if (!resend) {
    console.log('[Email stub — no RESEND_API_KEY]')
    console.log(`  To: ${to}`)
    console.log(`  Subject: ${subject}`)
    console.log(`  Claim code: ${claimCode}`)
    console.log(`  Claim URL: ${claimUrl}`)
    return
  }

  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) throw new Error(error.message)
}

export interface ClaimReminderArgs {
  to: string
  payerName: string
  lodgeName: string
  lodgeNumber: string
  claimCode: string
  expiresAt: Date
  daysUntilExpiry: number
}

export async function sendClaimReminder(args: ClaimReminderArgs) {
  const { to, payerName, lodgeName, lodgeNumber, claimCode, expiresAt, daysUntilExpiry } = args
  const expiryStr = expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const claimUrl = `${APP_URL}/claim?code=${claimCode}`
  const subject = daysUntilExpiry > 10
    ? `Your Tyrian claim code expires in ${daysUntilExpiry} days — ${lodgeName}`
    : `Your Tyrian claim code expires in ${daysUntilExpiry} days — action needed`

  const html = `
    <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1A1A1A;">
      <div style="margin-bottom: 32px;">
        <span style="font-size: 20px; font-weight: 700; color: #1B2A4A; font-family: 'Cormorant Garamond', Georgia, serif;">Tyrian</span>
      </div>

      <p>Hi ${payerName},</p>

      <p>Just a reminder — <strong>${lodgeName} #${lodgeNumber}</strong> is on Tyrian but admin access hasn't been claimed yet.</p>

      <p>Your claim code: <strong style="font-family: monospace; font-size: 18px; letter-spacing: 2px;">${claimCode}</strong><br>
      Expires: ${expiryStr}</p>

      <div style="margin: 32px 0;">
        <a href="${claimUrl}" style="background: #C9A84C; color: #1B2A4A; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
          Claim Admin Access →
        </a>
      </div>

      <p style="font-size: 13px; color: #6B7280;">Once admin is claimed, you can start inviting members and the lodge directory will go live.</p>

      <p style="font-size: 12px; color: #9CA3AF; margin-top: 32px; font-style: italic;">Built on trust. Proven by the craft.<br>Tyrian · tyrian.work</p>
    </div>
  `

  if (!resend) {
    console.log(`[Email stub] Reminder (${daysUntilExpiry}d) to ${to} — ${claimCode}`)
    return
  }

  await resend.emails.send({ from: FROM, to, subject, html })
}

export interface MemberMagicLinkArgs {
  to: string
  memberName: string
  lodgeName: string
  lodgeNumber: string
  magicLink: string
}

export async function sendMemberMagicLinkEmail(args: MemberMagicLinkArgs) {
  const { to, memberName, lodgeName, lodgeNumber, magicLink } = args
  const subject = `Complete your Tyrian membership — ${lodgeName} #${lodgeNumber}`
  const html = `
    <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1A1A1A;">
      <div style="margin-bottom: 32px;">
        <span style="font-size: 20px; font-weight: 700; color: #1B2A4A; font-family: 'Cormorant Garamond', Georgia, serif;">Tyrian</span>
      </div>
      <p>Hi ${memberName},</p>
      <p>You're joining <strong>${lodgeName} #${lodgeNumber}</strong> on Tyrian. Click below to verify your email and finish setting up your profile.</p>
      <div style="margin: 32px 0;">
        <a href="${magicLink}" style="background: #C9A84C; color: #1B2A4A; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
          Complete your membership →
        </a>
      </div>
      <p style="font-size: 13px; color: #6B7280;">Your sponsor will receive a separate confirmation request. Verification usually takes under 24 hours once they confirm.</p>
      <p style="font-size: 12px; color: #9CA3AF; margin-top: 32px; font-style: italic;">Built on trust. Proven by the craft.<br>Tyrian · tyrian.work</p>
    </div>
  `

  if (!resend) {
    console.log(`[Email stub] Member magic link to ${to}: ${magicLink}`)
    return
  }

  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) throw new Error(error.message)
}

export interface SponsorConfirmEmailArgs {
  sponsorContact: string
  sponsorName: string
  memberName: string
  lodgeName: string
  lodgeNumber: string
  token: string
}

export async function sendSponsorConfirmEmail(args: SponsorConfirmEmailArgs) {
  const { sponsorContact, sponsorName, memberName, lodgeName, lodgeNumber, token } = args
  const confirmUrl = `${APP_URL}/api/sponsor-confirm?token=${token}&action=confirm`
  const denyUrl = `${APP_URL}/api/sponsor-confirm?token=${token}&action=deny`
  const isEmail = sponsorContact.includes('@')
  const subject = `Did you sponsor ${memberName} for Tyrian?`

  const html = `
    <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1A1A1A;">
      <div style="margin-bottom: 32px;">
        <span style="font-size: 20px; font-weight: 700; color: #1B2A4A; font-family: 'Cormorant Garamond', Georgia, serif;">Tyrian</span>
      </div>
      <p>Hi ${sponsorName},</p>
      <p><strong>${memberName}</strong> listed you as their sponsor to join <strong>${lodgeName} #${lodgeNumber}</strong> on Tyrian — the professional network for Freemasons.</p>
      <p>Did you sponsor this brother for membership?</p>
      <div style="margin: 32px 0;">
        <a href="${confirmUrl}" style="background: #2D6A4F; color: #FFFFFF; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block; margin-right: 12px;">
          Yes, I sponsored them →
        </a>
        <a href="${denyUrl}" style="background: #FFFFFF; color: #1B2A4A; padding: 14px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; border: 2px solid #E5E0D5; display: inline-block;">
          No, I didn't →
        </a>
      </div>
      <p style="font-size: 13px; color: #6B7280;">If you don't recognize this request, click "No, I didn't."</p>
      <p style="font-size: 12px; color: #9CA3AF; margin-top: 32px; font-style: italic;">Built on trust. Proven by the craft.<br>Tyrian · tyrian.work</p>
    </div>
  `

  if (!resend) {
    console.log(`[Email stub] Sponsor confirm to ${sponsorContact}`)
    console.log(`  Confirm: ${confirmUrl}`)
    console.log(`  Deny: ${denyUrl}`)
    return
  }

  if (isEmail) {
    const { error } = await resend.emails.send({ from: FROM, to: sponsorContact, subject, html })
    if (error) throw new Error(error.message)
  } else {
    console.log(`[Email stub] SMS sponsor confirm not implemented — ${sponsorContact}`)
    console.log(`  Confirm: ${confirmUrl}`)
  }
}

export interface MemberVerifiedEmailArgs {
  to: string
  memberName: string
  city: string
  nearbyRequestCount: number
  hasListing: boolean
}

export async function sendMemberVerifiedEmail(args: MemberVerifiedEmailArgs) {
  const { to, memberName, city, nearbyRequestCount, hasListing } = args
  const subject = `You're verified, Brother ${memberName.split(' ')[0]}`
  const firstName = memberName.split(' ')[0]

  const earningBlock = !hasListing && nearbyRequestCount > 0 ? `
    <div style="background: #FAF3E0; border-left: 3px solid #C9A84C; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 8px; font-weight: 600; color: #1B2A4A;">Don't have a business yet?</p>
      <p style="margin: 0 0 12px; font-size: 14px; color: #4B5563;">The request board shows <strong>${nearbyRequestCount}</strong> open request${nearbyRequestCount === 1 ? '' : 's'} near ${city} right now.</p>
      <a href="${APP_URL}/requests" style="color: #1B2A4A; font-weight: 600; font-size: 14px;">See open requests near you →</a>
    </div>
  ` : ''

  const html = `
    <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1A1A1A;">
      <div style="margin-bottom: 32px;">
        <span style="font-size: 20px; font-weight: 700; color: #1B2A4A; font-family: 'Cormorant Garamond', Georgia, serif;">Tyrian</span>
      </div>
      <p>Hi ${firstName},</p>
      <p>Your sponsor confirmed your membership. You're now a <strong>verified member</strong> on Tyrian.</p>
      ${earningBlock}
      <div style="margin: 32px 0;">
        <a href="${APP_URL}/dashboard" style="background: #C9A84C; color: #1B2A4A; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
          Go to your dashboard →
        </a>
      </div>
      <p style="font-size: 12px; color: #9CA3AF; margin-top: 32px; font-style: italic;">Built on trust. Proven by the craft.<br>Tyrian · tyrian.work</p>
    </div>
  `

  if (!resend) {
    console.log(`[Email stub] Member verified to ${to}`)
    return
  }

  await resend.emails.send({ from: FROM, to, subject, html })
}

export interface ResponseNotificationArgs {
  requesterEmail: string
  requesterName: string
  notifyToken: string
  requestTitle: string
  requestId: string
  responderName: string
  responderTrade: string | null
  responderLodge: string
  responderCity: string | null
  responderState: string | null
  responderPhone: string | null
  responderEmail: string | null
  message: string | null
  otherResponseCount: number
}

export async function sendResponseNotification(args: ResponseNotificationArgs) {
  const {
    requesterEmail,
    requesterName,
    notifyToken,
    requestTitle,
    requestId,
    responderName,
    responderTrade,
    responderLodge,
    responderCity,
    responderState,
    responderPhone,
    responderEmail,
    message,
    otherResponseCount,
  } = args

  const firstName = requesterName.split(' ')[0] || requesterName
  const responderFirst = responderName.split(' ')[0] || responderName
  const location =
    responderCity && responderState ? `${responderCity}, ${responderState}` : null
  const viewUrl = `${APP_URL}/requests/${requestId}/responses?token=${notifyToken}`

  const subject = `${responderName} from ${responderLodge} responded to your Tyrian request`

  const messageBlock = message
    ? `<p style="font-style: italic; color: #4B5563; margin: 16px 0;">&ldquo;${message.replace(/</g, '&lt;')}&rdquo;</p>`
    : ''

  const contactLines = [
    responderPhone ? `<p style="margin: 4px 0;">📞 ${responderPhone}</p>` : '',
    responderEmail ? `<p style="margin: 4px 0;">✉ ${responderEmail}</p>` : '',
  ]
    .filter(Boolean)
    .join('')

  const contactBlock = contactLines
    ? `<p style="font-weight: 600; margin: 16px 0 8px;">Contact ${responderFirst}:</p>${contactLines}`
    : `<p style="font-size: 14px; color: #6B7280;">View their profile in the Tyrian directory to connect.</p>`

  const socialProof =
    otherResponseCount === 0
      ? `<p style="font-size: 14px; color: #4B5563;">${responderName} is the first to respond. Reply soon — great professionals get hired fast.</p>`
      : `<p style="font-size: 14px; color: #4B5563;">${otherResponseCount} other verified member${otherResponseCount === 1 ? '' : 's'} have also responded. <a href="${viewUrl}" style="color: #1B2A4A;">View all responses →</a></p>`

  const html = `
    <div style="font-family: 'DM Sans', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1A1A1A;">
      <div style="margin-bottom: 32px;">
        <span style="font-size: 20px; font-weight: 700; color: #1B2A4A; font-family: 'Cormorant Garamond', Georgia, serif;">Tyrian</span>
      </div>

      <p>Hi ${firstName},</p>
      <p>A verified Masonic professional has responded to your request on Tyrian.</p>

      <div style="border-top: 1px solid #E5E0D5; border-bottom: 1px solid #E5E0D5; padding: 16px 0; margin: 24px 0;">
        <p style="margin: 0; font-size: 13px; color: #6B7280;">Your request:</p>
        <p style="margin: 4px 0 0; font-weight: 600; color: #1B2A4A;">&ldquo;${requestTitle.replace(/</g, '&lt;')}&rdquo;</p>
      </div>

      <p style="font-weight: 700; margin: 0 0 4px;">${responderName}</p>
      ${responderTrade ? `<p style="margin: 0 0 4px; color: #4B5563;">${responderTrade}</p>` : ''}
      <p style="margin: 0 0 8px; color: #4B5563;">${responderLodge}${location ? ` · ${location}` : ''}</p>
      <p style="display: inline-block; background: #E1F5EE; color: #0F6E56; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.06em; text-transform: uppercase;">✓ Lodge-Verified Member</p>

      ${messageBlock}
      ${contactBlock}

      <div style="margin: 32px 0;">
        <a href="${viewUrl}" style="background: #C9A84C; color: #1B2A4A; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
          View all responses to your request →
        </a>
      </div>

      ${socialProof}

      <hr style="border: none; border-top: 1px solid #E5E0D5; margin: 32px 0;" />

      <p style="font-size: 14px; color: #4B5563;">Are you a Freemason? Create a free account to post requests, respond to others, and connect with your lodge network.</p>
      <p style="margin: 16px 0;"><a href="${APP_URL}/login" style="color: #1B2A4A; font-weight: 600;">Join Tyrian →</a></p>

      <p style="font-size: 12px; color: #9CA3AF; margin-top: 32px; font-style: italic;">Built on trust. Proven by the craft.<br>Tyrian · tyrian.work</p>
    </div>
  `

  if (!resend) {
    console.log('[Email stub — no RESEND_API_KEY] Response notification')
    console.log(`  To: ${requesterEmail}`)
    console.log(`  Subject: ${subject}`)
    console.log(`  View: ${viewUrl}`)
    return
  }

  const { error } = await resend.emails.send({ from: FROM, to: requesterEmail, subject, html })
  if (error) throw new Error(error.message)
}

export function sponsorResponsePage(title: string, message: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} · Tyrian</title>
</head>
<body style="margin:0;background:#F8F6F1;font-family:sans-serif;color:#1A1A1A;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
  <div style="max-width:480px;width:100%;background:#fff;border:1px solid #E5E0D5;border-radius:16px;padding:40px 32px;text-align:center;">
    <p style="font-size:24px;font-weight:700;color:#1B2A4A;margin:0 0 24px;">Tyrian</p>
    <h1 style="font-size:28px;color:#1B2A4A;margin:0 0 12px;">${title}</h1>
    <p style="color:#6B7280;line-height:1.6;margin:0 0 24px;">${message}</p>
    <a href="${APP_URL}" style="color:#1B2A4A;font-weight:600;">Return to Tyrian →</a>
  </div>
</body>
</html>`
}
