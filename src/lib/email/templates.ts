import { APP_URL, getAppUrl } from './send'
import { EMAIL_THEME as t } from './theme'
import {
  emailButton,
  emailButtonRow,
  emailCallout,
  emailCodeBox,
  emailDivider,
  emailHeading,
  emailLayout,
  emailParagraph,
  emailQuoteBlock,
  emailResponderCard,
  emailSteps,
  emailTextFooter,
  escapeHtml,
} from './layout'

// —— Lodge claim ——

export interface LodgeClaimTemplateArgs {
  payerName: string
  lodgeName: string
  lodgeNumber: string
  claimCode: string
  tier: string
  expiresAt: Date
}

export function buildLodgeClaimEmail(args: LodgeClaimTemplateArgs) {
  const { payerName, lodgeName, lodgeNumber, claimCode, tier, expiresAt } = args
  const isFounding = tier === 'founding'
  const expiryStr = expiresAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const claimUrl = `${APP_URL}/claim?code=${claimCode}`
  const lodgeLabel = `${lodgeName} #${lodgeNumber}`

  const subject = `Your lodge claim code for Tyrian — ${claimCode}`

  const foundingBlock = isFounding
    ? emailCallout({
        title: 'Founding Lodge — permanent designation secured',
        body: 'This status is permanent and appears on your lodge page and every member&rsquo;s verified profile.',
        variant: 'founding',
      })
    : ''

  const bodyHtml = [
    emailParagraph(`Hi ${escapeHtml(payerName)},`),
    emailParagraph(`<strong>${escapeHtml(lodgeLabel)}</strong> is now on Tyrian.`),
    foundingBlock,
    emailParagraph('Your lodge admin claim code:'),
    emailCodeBox(claimCode),
    emailParagraph(
      'This code grants full admin access to your lodge on Tyrian. Forward it to your Worshipful Master or Secretary, or use it yourself if you&rsquo;re claiming admin.',
    ),
    emailButton({ href: claimUrl, label: 'Claim admin access →' }),
    emailParagraph(`This code expires on <strong>${escapeHtml(expiryStr)}</strong>.`, true),
    emailDivider(),
    emailParagraph('<strong>Not sure what to do next?</strong>', true),
    emailSteps([
      'Forward this code to your Worshipful Master or Secretary',
      'They click &ldquo;Claim admin access&rdquo; above and sign in',
      'They invite lodge members via email, link, or QR code',
    ]),
    emailParagraph('Questions? Reply to this email.', true),
  ].join('')

  const html = emailLayout({
    preheader: `Claim code ${claimCode} for ${lodgeLabel}`,
    bodyHtml,
  })

  const text = [
    `Hi ${payerName},`,
    '',
    `${lodgeLabel} is now on Tyrian.`,
    isFounding ? '\nFounding Lodge — you have secured a permanent designation.\n' : '',
    `Your claim code: ${claimCode}`,
    `Expires: ${expiryStr}`,
    '',
    `Claim admin: ${claimUrl}`,
    '',
    'Next steps:',
    '1. Forward this code to your Worshipful Master or Secretary',
    '2. They claim admin access at the link above',
    '3. They invite lodge members',
    emailTextFooter(),
  ].join('\n')

  return { subject, html, text, claimUrl }
}

// —— Claim reminder ——

export interface ClaimReminderTemplateArgs {
  payerName: string
  lodgeName: string
  lodgeNumber: string
  claimCode: string
  expiresAt: Date
  daysUntilExpiry: number
}

export function buildClaimReminderEmail(args: ClaimReminderTemplateArgs) {
  const { payerName, lodgeName, lodgeNumber, claimCode, expiresAt, daysUntilExpiry } = args
  const expiryStr = expiresAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const claimUrl = `${APP_URL}/claim?code=${claimCode}`
  const lodgeLabel = `${lodgeName} #${lodgeNumber}`

  const subject =
    daysUntilExpiry > 10
      ? `Your Tyrian claim code expires in ${daysUntilExpiry} days — ${lodgeName}`
      : `Your Tyrian claim code expires in ${daysUntilExpiry} days — action needed`

  const bodyHtml = [
    emailParagraph(`Hi ${escapeHtml(payerName)},`),
    emailParagraph(
      `Just a reminder — <strong>${escapeHtml(lodgeLabel)}</strong> is on Tyrian but admin access hasn&rsquo;t been claimed yet.`,
    ),
    emailCodeBox(claimCode),
    emailParagraph(`Expires <strong>${escapeHtml(expiryStr)}</strong>.`, true),
    emailButton({ href: claimUrl, label: 'Claim admin access →' }),
    emailParagraph(
      'Once admin is claimed, you can invite members and your lodge directory goes live.',
      true,
    ),
  ].join('')

  const html = emailLayout({
    preheader: `${daysUntilExpiry} days left to claim ${lodgeLabel}`,
    bodyHtml,
  })

  const text = [
    `Hi ${payerName},`,
    '',
    `${lodgeLabel} is on Tyrian but admin access hasn't been claimed.`,
    `Claim code: ${claimCode}`,
    `Expires: ${expiryStr}`,
    `Claim: ${claimUrl}`,
    emailTextFooter(),
  ].join('\n')

  return { subject, html, text, claimUrl }
}

// —— Member magic link ——

export interface MemberMagicLinkTemplateArgs {
  memberName: string
  lodgeName: string
  lodgeNumber: string
  magicLink: string
}

export function buildMemberMagicLinkEmail(args: MemberMagicLinkTemplateArgs) {
  const { memberName, lodgeName, lodgeNumber, magicLink } = args
  const lodgeLabel = `${lodgeName} #${lodgeNumber}`
  const subject = `Complete your Tyrian membership — ${lodgeLabel}`

  const bodyHtml = [
    emailHeading('Complete your membership'),
    emailParagraph(`Hi ${escapeHtml(memberName)},`),
    emailParagraph(
      `You&rsquo;re joining <strong>${escapeHtml(lodgeLabel)}</strong> on Tyrian. Click below to verify your email and finish your profile.`,
    ),
    emailButton({ href: magicLink, label: 'Complete your membership →' }),
    emailParagraph(
      'Your sponsor will receive a separate confirmation request. Verification usually takes under 24 hours once they confirm.',
      true,
    ),
  ].join('')

  const html = emailLayout({
    preheader: `Finish joining ${lodgeLabel} on Tyrian`,
    bodyHtml,
  })

  const text = [
    `Hi ${memberName},`,
    '',
    `Join ${lodgeLabel} on Tyrian:`,
    magicLink,
    '',
    'Your sponsor will receive a separate confirmation request.',
    emailTextFooter(),
  ].join('\n')

  return { subject, html, text }
}

// —— Sponsor confirm ——

export interface SponsorConfirmTemplateArgs {
  sponsorName: string
  memberName: string
  lodgeName: string
  lodgeNumber: string
  token: string
}

export function buildSponsorConfirmEmail(args: SponsorConfirmTemplateArgs) {
  const { sponsorName, memberName, lodgeName, lodgeNumber, token } = args
  const confirmUrl = `${APP_URL}/api/sponsor-confirm?token=${token}&action=confirm`
  const denyUrl = `${APP_URL}/api/sponsor-confirm?token=${token}&action=deny`
  const lodgeLabel = `${lodgeName} #${lodgeNumber}`
  const subject = `Did you sponsor ${memberName} for Tyrian?`

  const bodyHtml = [
    emailHeading('Sponsor confirmation'),
    emailParagraph(`Hi ${escapeHtml(sponsorName)},`),
    emailParagraph(
      `<strong>${escapeHtml(memberName)}</strong> listed you as their sponsor to join <strong>${escapeHtml(lodgeLabel)}</strong> on Tyrian — the professional network for Freemasons.`,
    ),
    emailParagraph('Did you sponsor this brother for membership?'),
    emailButtonRow([
      { href: confirmUrl, label: 'Yes, I sponsored them →', variant: 'trust' },
      { href: denyUrl, label: "No, I didn't →", variant: 'secondary' },
    ]),
    emailParagraph('If you don&rsquo;t recognize this request, choose &ldquo;No.&rdquo;', true),
  ].join('')

  const html = emailLayout({
    preheader: `${memberName} listed you as their Tyrian sponsor`,
    bodyHtml,
  })

  const text = [
    `Hi ${sponsorName},`,
    '',
    `${memberName} listed you as sponsor for ${lodgeLabel} on Tyrian.`,
    '',
    `Confirm: ${confirmUrl}`,
    `Deny: ${denyUrl}`,
    emailTextFooter(),
  ].join('\n')

  return { subject, html, text, confirmUrl, denyUrl }
}

// —— Member verified ——

export interface MemberVerifiedTemplateArgs {
  memberName: string
  city: string
  nearbyRequestCount: number
  hasListing: boolean
}

export function buildMemberVerifiedEmail(args: MemberVerifiedTemplateArgs) {
  const { memberName, city, nearbyRequestCount, hasListing } = args
  const firstName = memberName.split(' ')[0] || memberName
  const subject = `You're verified, Brother ${firstName}`

  const earningBlock =
    !hasListing && nearbyRequestCount > 0
      ? emailCallout({
          title: "Don't have a business yet?",
          body: `The request board shows <strong>${nearbyRequestCount}</strong> open request${nearbyRequestCount === 1 ? '' : 's'} near ${escapeHtml(city)} right now. <a href="${APP_URL}/requests" style="color:${t.navy};font-weight:600;">See open requests near you →</a>`,
          variant: 'gold',
        })
      : ''

  const bodyHtml = [
    emailHeading("You're verified"),
    emailParagraph(`Hi ${escapeHtml(firstName)},`),
    emailParagraph(
      'Your sponsor confirmed your membership. You&rsquo;re now a <strong>verified member</strong> on Tyrian.',
    ),
    earningBlock,
    emailButton({ href: `${APP_URL}/dashboard`, label: 'Go to your dashboard →' }),
  ].join('')

  const html = emailLayout({
    preheader: 'Your Tyrian membership is verified',
    bodyHtml,
  })

  const text = [
    `Hi ${firstName},`,
    '',
    "Your sponsor confirmed your membership. You're now verified on Tyrian.",
    !hasListing && nearbyRequestCount > 0
      ? `\n${nearbyRequestCount} open request(s) near ${city}: ${APP_URL}/requests`
      : '',
    `\nDashboard: ${APP_URL}/dashboard`,
    emailTextFooter(),
  ].join('\n')

  return { subject, html, text }
}

// —— Response notification ——

export interface ResponseNotificationTemplateArgs {
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

export function buildResponseNotificationEmail(args: ResponseNotificationTemplateArgs) {
  const {
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
    ? emailParagraph(`&ldquo;${escapeHtml(message)}&rdquo;`, true)
    : ''

  const contactParts: string[] = []
  if (responderPhone) contactParts.push(emailParagraph(`Phone: ${escapeHtml(responderPhone)}`))
  if (responderEmail) contactParts.push(emailParagraph(`Email: ${escapeHtml(responderEmail)}`))
  const contactBlock =
    contactParts.length > 0
      ? [
          emailParagraph(`<strong>Contact ${escapeHtml(responderFirst)}:</strong>`),
          ...contactParts,
        ].join('')
      : emailParagraph('View their profile in the Tyrian directory to connect.', true)

  const socialProof =
    otherResponseCount === 0
      ? emailParagraph(
          `${escapeHtml(responderName)} is the first to respond. Reply soon — great professionals get hired fast.`,
          true,
        )
      : emailParagraph(
          `${otherResponseCount} other verified member${otherResponseCount === 1 ? '' : 's'} have also responded. <a href="${viewUrl}" style="color:#1B2A4A;font-weight:600;">View all responses →</a>`,
          true,
        )

  const bodyHtml = [
    emailHeading('New response to your request'),
    emailParagraph(`Hi ${escapeHtml(firstName)},`),
    emailParagraph('A verified Masonic professional has responded to your request on Tyrian.'),
    emailQuoteBlock('Your request', requestTitle),
    emailResponderCard({
      name: responderName,
      trade: responderTrade,
      lodge: responderLodge,
      location,
    }),
    messageBlock,
    contactBlock,
    emailButton({ href: viewUrl, label: 'View all responses →' }),
    socialProof,
    emailDivider(),
    emailParagraph(
      'Are you a Freemason? Create a free account to post requests, respond to others, and connect with your lodge network.',
      true,
    ),
    emailParagraph(`<a href="${APP_URL}/login" style="color:#1B2A4A;font-weight:600;">Join Tyrian →</a>`),
  ].join('')

  const html = emailLayout({
    preheader: `${responderName} responded to "${requestTitle}"`,
    bodyHtml,
  })

  const text = [
    `Hi ${firstName},`,
    '',
    `${responderName} (${responderLodge}) responded to your request: "${requestTitle}"`,
    responderTrade ? `Trade: ${responderTrade}` : '',
    location ? `Location: ${location}` : '',
    message ? `\nMessage: "${message}"` : '',
    responderPhone ? `Phone: ${responderPhone}` : '',
    responderEmail ? `Email: ${responderEmail}` : '',
    '',
    `View responses: ${viewUrl}`,
    emailTextFooter(),
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html, text, viewUrl }
}

// —— Auth (magic link / password reset) ——

export interface AuthMagicLinkTemplateArgs {
  firstName?: string
  magicLink: string
  purpose: 'sign-in' | 'claim'
}

export function buildAuthMagicLinkEmail(args: AuthMagicLinkTemplateArgs) {
  const { magicLink, purpose } = args
  const firstName = args.firstName?.trim() || 'Brother'
  const subject =
    purpose === 'claim'
      ? 'Sign in to claim your lodge on Tyrian'
      : 'Your Tyrian sign-in link'

  const bodyHtml = [
    emailHeading(purpose === 'claim' ? 'Claim your lodge' : 'Sign in to Tyrian'),
    emailParagraph(`Hi ${escapeHtml(firstName)},`),
    emailParagraph(
      purpose === 'claim'
        ? 'Use the button below to sign in and complete lodge admin setup. This link expires shortly.'
        : 'Use the button below to sign in to your Tyrian account. This link expires shortly.',
    ),
    emailButton({ href: magicLink, label: purpose === 'claim' ? 'Sign in to claim →' : 'Sign in to Tyrian →' }),
    emailParagraph(
      'If you didn&rsquo;t request this, you can ignore this email.',
      true,
    ),
  ].join('')

  const html = emailLayout({
    preheader: purpose === 'claim' ? 'Complete your lodge claim' : 'Your secure sign-in link',
    bodyHtml,
  })

  const text = [
    `Hi ${firstName},`,
    '',
    purpose === 'claim' ? 'Sign in to claim your lodge:' : 'Sign in to Tyrian:',
    magicLink,
    '',
    "If you didn't request this, ignore this email.",
    emailTextFooter(),
  ].join('\n')

  return { subject, html, text }
}

export interface PasswordResetTemplateArgs {
  firstName?: string
  resetLink: string
}

export function buildPasswordResetEmail(args: PasswordResetTemplateArgs) {
  const { resetLink } = args
  const firstName = args.firstName?.trim() || 'Brother'
  const subject = 'Reset your Tyrian password'

  const bodyHtml = [
    emailHeading('Reset your password'),
    emailParagraph(`Hi ${escapeHtml(firstName)},`),
    emailParagraph('We received a request to reset your Tyrian password.'),
    emailButton({ href: resetLink, label: 'Reset password →' }),
    emailParagraph(
      'If you didn&rsquo;t request a reset, you can ignore this email — your password won&rsquo;t change.',
      true,
    ),
  ].join('')

  const html = emailLayout({
    preheader: 'Reset your Tyrian password',
    bodyHtml,
  })

  const text = [
    `Hi ${firstName},`,
    '',
    'Reset your password:',
    resetLink,
    emailTextFooter(),
  ].join('\n')

  return { subject, html, text }
}

// —— Lodge member invite (admin) ——

export interface LodgeMemberInviteTemplateArgs {
  lodgeName: string
  lodgeNumber: string
  joinUrl: string
  adminName?: string
}

export function buildLodgeMemberInviteEmail(args: LodgeMemberInviteTemplateArgs) {
  const { lodgeName, lodgeNumber, joinUrl, adminName } = args
  const lodgeLabel = `${lodgeName} #${lodgeNumber}`
  const subject = `You're invited to join ${lodgeName} on Tyrian`

  const bodyHtml = [
    emailHeading('Join your lodge on Tyrian'),
    emailParagraph(
      `You&rsquo;ve been invited to join <strong>${escapeHtml(lodgeLabel)}</strong> on Tyrian — the verified professional network for Freemasons.`,
    ),
    adminName
      ? emailParagraph(
          `${escapeHtml(adminName)} shared this invite so you can get verified and connect with your lodge.`,
          true,
        )
      : '',
    emailParagraph(
      'You&rsquo;ll need a sponsor to confirm your membership. The join form takes just a few minutes.',
    ),
    emailButton({ href: joinUrl, label: 'Join your lodge →' }),
    emailDivider(),
    emailSteps([
      'Open the link and complete the join form',
      'Your sponsor confirms your membership',
      'List your business or browse the request board',
    ]),
  ].join('')

  const html = emailLayout({
    preheader: `Join ${lodgeLabel} on Tyrian`,
    bodyHtml,
  })

  const text = [
    `You've been invited to join ${lodgeLabel} on Tyrian.`,
    '',
    `Join: ${joinUrl}`,
    emailTextFooter(),
  ].join('\n')

  return { subject, html, text, joinUrl }
}

// —— Listing invite (gap / unlisted member) ——

export interface ListingInviteTemplateArgs {
  recipientName: string
  trade: string
  lodgeName: string
  lodgeNumber: string
  joinUrl: string
  adminName?: string
  personalMessage?: string
}

export function buildListingInviteEmail(args: ListingInviteTemplateArgs) {
  const { recipientName, trade, lodgeName, lodgeNumber, joinUrl, adminName, personalMessage } =
    args
  const firstName = recipientName.split(' ').slice(-1)[0] || recipientName
  const lodgeLabel = `${lodgeName} #${lodgeNumber}`
  const subject = `${lodgeName} wants you on Tyrian — list your ${trade} business`

  const defaultMessage = `Your lodge has open requests for a ${trade.toLowerCase()} in your area. Listing on Tyrian takes minutes and puts you in front of members who need your services.`

  const bodyHtml = [
    emailHeading('List your business on Tyrian'),
    emailParagraph(`Hi ${escapeHtml(firstName)},`),
    emailParagraph(
      adminName
        ? `<strong>${escapeHtml(adminName)}</strong> from <strong>${escapeHtml(lodgeLabel)}</strong> invited you to list on Tyrian.`
        : `<strong>${escapeHtml(lodgeLabel)}</strong> invited you to list your business on Tyrian.`,
    ),
    emailCallout({
      title: 'Why list now?',
      body: escapeHtml(personalMessage || defaultMessage),
      variant: 'gold',
    }),
    emailButton({ href: joinUrl, label: 'Get started on Tyrian →' }),
    emailParagraph(
      'Already verified? Sign in and create your listing from your dashboard.',
      true,
    ),
    emailParagraph(
      `<a href="${getAppUrl()}/login" style="color:${t.navy};font-weight:600;">Sign in →</a>`,
      true,
    ),
  ].join('')

  const html = emailLayout({
    preheader: `List your ${trade} business on Tyrian`,
    bodyHtml,
  })

  const text = [
    `Hi ${firstName},`,
    '',
    personalMessage || defaultMessage,
    '',
    `Get started: ${joinUrl}`,
    emailTextFooter(),
  ].join('\n')

  return { subject, html, text }
}

// —— Listing live ——

export interface ListingLiveTemplateArgs {
  memberName: string
  businessName: string
  trade: string
  listingUrl: string
  directoryUrl: string
}

export function buildListingLiveEmail(args: ListingLiveTemplateArgs) {
  const { memberName, businessName, trade, listingUrl, directoryUrl } = args
  const firstName = memberName.split(' ')[0] || memberName
  const subject = `Your listing is live — ${businessName}`

  const bodyHtml = [
    emailHeading('Your listing is live'),
    emailParagraph(`Hi ${escapeHtml(firstName)},`),
    emailParagraph(
      `<strong>${escapeHtml(businessName)}</strong> is now live on the Tyrian directory as a <strong>${escapeHtml(trade)}</strong> provider.`,
    ),
    emailParagraph(
      'Members and the public can find you in search. You&rsquo;ll appear with your lodge-verified badge.',
    ),
    emailButton({ href: listingUrl, label: 'View your listing →' }),
    emailParagraph(
      `<a href="${directoryUrl}" style="color:${t.navy};font-weight:600;">Browse the directory →</a>`,
      true,
    ),
    emailCallout({
      title: 'Tip',
      body: 'Check the request board for leads near you — verified members can respond to open requests.',
      variant: 'info',
    }),
  ].join('')

  const html = emailLayout({
    preheader: `${businessName} is live on Tyrian`,
    bodyHtml,
  })

  const text = [
    `Hi ${firstName},`,
    '',
    `${businessName} is live on Tyrian.`,
    `View: ${listingUrl}`,
    emailTextFooter(),
  ].join('\n')

  return { subject, html, text }
}
