/**
 * Send or preview Tyrian transactional emails locally.
 *
 * Usage:
 *   pnpm email:test --to you@example.com --type lodge-claim
 *   pnpm email:test --to you@example.com --type all
 *   pnpm email:test --preview --type lodge-claim
 *
 * Requires RESEND_API_KEY + RESEND_FROM_EMAIL in .env.local for --send (default).
 */
import './load-env'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { deliverEmail } from '../src/lib/email/send'
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
} from '../src/lib/email/templates'

const PREVIEW_DIR = join(process.cwd(), '.email-previews')

const TYPES = [
  'lodge-claim',
  'claim-reminder',
  'magic-link',
  'auth-sign-in',
  'password-reset',
  'lodge-invite',
  'listing-invite',
  'listing-live',
  'sponsor-confirm',
  'member-verified',
  'response',
  'review-prompt',
  'all',
] as const

type EmailType = (typeof TYPES)[number]

function parseArgs() {
  const args = process.argv.slice(2)
  let to = process.env.TEST_EMAIL ?? ''
  let type: EmailType = 'lodge-claim'
  let preview = false
  let send = true

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--to' && args[i + 1]) {
      to = args[++i]
    } else if (arg === '--type' && args[i + 1]) {
      type = args[++i] as EmailType
    } else if (arg === '--preview') {
      preview = true
      send = false
    } else if (arg === '--send') {
      send = true
      preview = false
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
  }

  return { to, type, preview, send }
}

function printHelp() {
  console.log(`
Tyrian email test script

  pnpm email:test --to you@example.com --type lodge-claim
  pnpm email:test --preview --type all

Types: ${TYPES.join(', ')}

Env:
  RESEND_API_KEY      required for send
  RESEND_FROM_EMAIL   optional (default hello@tyrian.work)
  TEST_EMAIL          default --to if omitted
`)
}

function sampleEmails() {
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return {
    'lodge-claim': buildLodgeClaimEmail({
      payerName: 'Test Brother',
      lodgeName: 'Venice Lodge',
      lodgeNumber: '301',
      claimCode: 'CFQ-1992',
      tier: 'founding',
      expiresAt: expires,
    }),
    'claim-reminder': buildClaimReminderEmail({
      payerName: 'Test Brother',
      lodgeName: 'Venice Lodge',
      lodgeNumber: '301',
      claimCode: 'CFQ-1992',
      expiresAt: expires,
      daysUntilExpiry: 14,
    }),
    'magic-link': buildMemberMagicLinkEmail({
      memberName: 'James Mitchell',
      lodgeName: 'Venice Lodge',
      lodgeNumber: '301',
      magicLink: `${appUrl}/auth/confirm?token=test`,
    }),
    'auth-sign-in': buildAuthMagicLinkEmail({
      firstName: 'James',
      magicLink: `${appUrl}/auth/confirm?token=test`,
      purpose: 'sign-in',
    }),
    'password-reset': buildPasswordResetEmail({
      firstName: 'James',
      resetLink: `${appUrl}/auth/confirm?token=test-reset`,
    }),
    'lodge-invite': buildLodgeMemberInviteEmail({
      lodgeName: 'Venice Lodge',
      lodgeNumber: '301',
      joinUrl: `${appUrl}/join/venice-lodge-301`,
      adminName: 'Worshipful Master',
    }),
    'listing-invite': buildListingInviteEmail({
      recipientName: 'James E. Collins',
      trade: 'Electrical',
      lodgeName: 'Venice Lodge',
      lodgeNumber: '301',
      joinUrl: `${appUrl}/join/venice-lodge-301`,
      adminName: 'Lodge Secretary',
    }),
    'listing-live': buildListingLiveEmail({
      memberName: 'James Mitchell',
      businessName: 'Gulf Coast Roofing',
      trade: 'Roofing',
      listingUrl: `${appUrl}/directory/test-listing`,
      directoryUrl: `${appUrl}/directory`,
    }),
    'sponsor-confirm': buildSponsorConfirmEmail({
      sponsorName: 'John Sponsor',
      memberName: 'James Mitchell',
      lodgeName: 'Venice Lodge',
      lodgeNumber: '301',
      token: 'test-sponsor-token',
    }),
    'member-verified': buildMemberVerifiedEmail({
      memberName: 'James Mitchell',
      city: 'Sarasota',
      nearbyRequestCount: 4,
      hasListing: false,
    }),
    response: buildResponseNotificationEmail({
      requesterName: 'Guest User',
      notifyToken: 'test-notify-token',
      requestTitle: 'Need a roofer for storm damage',
      requestId: '00000000-0000-0000-0000-000000000001',
      responderName: 'James Mitchell',
      responderTrade: 'Roofing',
      responderLodge: 'Venice Lodge #301',
      responderCity: 'Sarasota',
      responderState: 'FL',
      responderPhone: '(941) 555-0100',
      responderEmail: 'james@example.com',
      message: 'Happy to take a look this week.',
      otherResponseCount: 0,
    }),
    'review-prompt': buildReviewPromptEmail({
      requesterName: 'Robert C. Ingram',
      requestTitle: 'Need electrician for panel upgrade — 200 amp service',
      businessName: 'Thornton Electric',
      ownerName: 'Marcus D. Wells',
      reviewUrl: `${appUrl}/dashboard?leaveReview=test-listing&requestId=test-request`,
    }),
  } as const
}

async function main() {
  const { to, type, preview, send } = parseArgs()

  if (!TYPES.includes(type)) {
    console.error(`Unknown type "${type}". Valid: ${TYPES.join(', ')}`)
    process.exit(1)
  }

  const samples = sampleEmails()
  const typesToRun: EmailType[] = type === 'all' ? [...TYPES.filter((t) => t !== 'all')] : [type]

  if (send && !to) {
    console.error('Missing recipient. Pass --to you@example.com or set TEST_EMAIL in .env.local')
    process.exit(1)
  }

  if (send && !process.env.RESEND_API_KEY) {
    console.error(
      'RESEND_API_KEY is not set.\n' +
        '  Add it to .env.local (not only .env): RESEND_API_KEY=re_...\n' +
        '  Or use --preview to write HTML files without sending.'
    )
    process.exit(1)
  }

  mkdirSync(PREVIEW_DIR, { recursive: true })

  for (const key of typesToRun) {
    const { subject, html, text } = samples[key as keyof typeof samples]
    const safeName = key.replace(/[^a-z-]/g, '')

    if (preview || !send) {
      const htmlPath = join(PREVIEW_DIR, `${safeName}.html`)
      const textPath = join(PREVIEW_DIR, `${safeName}.txt`)
      writeFileSync(htmlPath, html, 'utf8')
      writeFileSync(textPath, text, 'utf8')
      console.log(`Wrote ${htmlPath}`)
      continue
    }

    console.log(`Sending ${key} → ${to}`)
    await deliverEmail({ to, subject: `[TEST] ${subject}`, html, text })
    console.log(`  ✓ ${subject}`)
  }

  if (preview || !send) {
    console.log(`\nOpen previews: open ${PREVIEW_DIR}/lodge-claim.html`)
  } else {
    console.log('\nDone. Check your inbox (and spam) for [TEST] subjects.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
