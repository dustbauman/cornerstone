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
        <p style="margin: 0; font-weight: 600; color: #92400E;">⭐ You've secured a Founding Lodge designation.</p>
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

  await resend.emails.send({ from: FROM, to, subject, html })
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
