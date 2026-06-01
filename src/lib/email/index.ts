import { escapeHtml, emailLayout, emailParagraph, emailButton } from './layout'
import { EMAIL_THEME as t } from './theme'
import { APP_URL, deliverEmail } from './send'
import {
  buildAuthMagicLinkEmail,
  buildClaimReminderEmail,
  buildListingInviteEmail,
  buildListingLiveEmail,
  buildLodgeClaimEmail,
  buildLodgeMemberInviteEmail,
  buildMemberMagicLinkEmail,
  buildMemberVerifiedEmail,
  buildPasswordResetEmail,
  buildResponseNotificationEmail,
  buildReviewPromptEmail,
  buildSponsorConfirmEmail,
} from './templates'

export { APP_URL } from './send'

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
  const { to, ...templateArgs } = args
  const { subject, html, text, claimUrl } = buildLodgeClaimEmail(templateArgs)
  await deliverEmail({
    to,
    subject,
    html,
    text,
    stubDetails: [`Claim code: ${args.claimCode}`, `Claim URL: ${claimUrl}`],
  })
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
  const { to, ...templateArgs } = args
  const { subject, html, text, claimUrl } = buildClaimReminderEmail(templateArgs)
  await deliverEmail({
    to,
    subject,
    html,
    text,
    stubDetails: [`Reminder (${args.daysUntilExpiry}d)`, `Code: ${args.claimCode}`, `URL: ${claimUrl}`],
  })
}

export interface MemberMagicLinkArgs {
  to: string
  memberName: string
  lodgeName: string
  lodgeNumber: string
  magicLink: string
}

export async function sendMemberMagicLinkEmail(args: MemberMagicLinkArgs) {
  const { to, magicLink, ...templateArgs } = args
  const { subject, html, text } = buildMemberMagicLinkEmail({ ...templateArgs, magicLink })
  await deliverEmail({
    to,
    subject,
    html,
    text,
    stubDetails: [`Magic link: ${magicLink}`],
  })
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
  const { sponsorContact, ...templateArgs } = args
  const { subject, html, text, confirmUrl, denyUrl } = buildSponsorConfirmEmail(templateArgs)
  const isEmail = sponsorContact.includes('@')

  if (!isEmail) {
    console.log(`[Email stub] SMS sponsor confirm not implemented — ${sponsorContact}`)
    console.log(`  Confirm: ${confirmUrl}`)
    console.log(`  Deny: ${denyUrl}`)
    return
  }

  await deliverEmail({
    to: sponsorContact,
    subject,
    html,
    text,
    stubDetails: [`Confirm: ${confirmUrl}`, `Deny: ${denyUrl}`],
  })
}

export interface MemberVerifiedEmailArgs {
  to: string
  memberName: string
  city: string
  nearbyRequestCount: number
  hasListing: boolean
}

export async function sendMemberVerifiedEmail(args: MemberVerifiedEmailArgs) {
  const { to, ...templateArgs } = args
  const { subject, html, text } = buildMemberVerifiedEmail(templateArgs)
  await deliverEmail({ to, subject, html, text })
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
  const { requesterEmail, ...templateArgs } = args
  const { subject, html, text, viewUrl } = buildResponseNotificationEmail(templateArgs)
  await deliverEmail({
    to: requesterEmail,
    subject,
    html,
    text,
    stubDetails: [`View: ${viewUrl.split('?')[0]}?token=[redacted]`],
  })
}

export interface AuthMagicLinkEmailArgs {
  to: string
  magicLink: string
  purpose: 'sign-in' | 'claim'
  firstName?: string
}

export async function sendAuthMagicLinkEmail(args: AuthMagicLinkEmailArgs) {
  const { to, ...templateArgs } = args
  const { subject, html, text } = buildAuthMagicLinkEmail(templateArgs)
  await deliverEmail({
    to,
    subject,
    html,
    text,
    stubDetails: [`Link: ${args.magicLink}`],
  })
}

export interface PasswordResetEmailArgs {
  to: string
  resetLink: string
  firstName?: string
}

export async function sendPasswordResetEmail(args: PasswordResetEmailArgs) {
  const { to, ...templateArgs } = args
  const { subject, html, text } = buildPasswordResetEmail(templateArgs)
  await deliverEmail({
    to,
    subject,
    html,
    text,
    stubDetails: [`Reset: ${args.resetLink}`],
  })
}

export interface LodgeMemberInviteEmailArgs {
  to: string
  lodgeName: string
  lodgeNumber: string
  joinUrl: string
  adminName?: string
}

export async function sendLodgeMemberInviteEmail(args: LodgeMemberInviteEmailArgs) {
  const { to, ...templateArgs } = args
  const { subject, html, text, joinUrl } = buildLodgeMemberInviteEmail(templateArgs)
  await deliverEmail({
    to,
    subject,
    html,
    text,
    stubDetails: [`Join: ${joinUrl}`],
  })
}

export interface ListingInviteEmailArgs {
  to: string
  recipientName: string
  trade: string
  lodgeName: string
  lodgeNumber: string
  joinUrl: string
  adminName?: string
  personalMessage?: string
}

export async function sendListingInviteEmail(args: ListingInviteEmailArgs) {
  const { to, ...templateArgs } = args
  const { subject, html, text } = buildListingInviteEmail(templateArgs)
  await deliverEmail({ to, subject, html, text })
}

export interface ListingLiveEmailArgs {
  to: string
  memberName: string
  businessName: string
  trade: string
  listingUrl: string
  directoryUrl: string
}

export async function sendListingLiveEmail(args: ListingLiveEmailArgs) {
  const { to, ...templateArgs } = args
  const { subject, html, text } = buildListingLiveEmail(templateArgs)
  await deliverEmail({
    to,
    subject,
    html,
    text,
    stubDetails: [`Listing: ${args.listingUrl}`],
  })
}

export interface ReviewPromptEmailArgs {
  to: string
  requesterName: string
  requestTitle: string
  businessName: string
  ownerName: string
  listingId: string
  requestId: string
}

export async function sendReviewPromptEmail(args: ReviewPromptEmailArgs) {
  const { to, listingId, requestId, ...templateArgs } = args
  const reviewUrl = `${APP_URL}/dashboard?leaveReview=${listingId}&requestId=${requestId}`
  const { subject, html, text } = buildReviewPromptEmail({
    ...templateArgs,
    reviewUrl,
  })
  await deliverEmail({
    to,
    subject,
    html,
    text,
    stubDetails: [`Review: ${reviewUrl}`],
  })
}

export function sponsorResponsePage(title: string, message: string) {
  const bodyHtml = [
    emailParagraph(escapeHtml(message)),
    emailButton({ href: APP_URL, label: 'Return to Tyrian →', variant: 'secondary' }),
  ].join('')

  return emailLayout({
    preheader: title,
    bodyHtml: `<h1 style="margin:0 0 16px;font-family:${t.fontSerif};font-size:26px;font-weight:700;color:${t.navy};text-align:center;">${escapeHtml(title)}</h1>${bodyHtml}`,
  })
}
