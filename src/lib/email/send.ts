import { Resend } from 'resend'

let resendClient: Resend | null | undefined

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return null
  if (resendClient === undefined) {
    resendClient = new Resend(key)
  }
  return resendClient
}

export function getEmailFrom(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || 'Tyrian <hello@tyrian.work>'
}

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'
}

/** @deprecated use getEmailFrom() — kept for templates that import APP_URL at build time */
export const EMAIL_FROM = getEmailFrom()
export const APP_URL = getAppUrl()

export interface DeliverEmailArgs {
  to: string
  subject: string
  html: string
  text: string
  /** Extra lines logged when RESEND_API_KEY is missing */
  stubDetails?: string[]
}

export async function deliverEmail({
  to,
  subject,
  html,
  text,
  stubDetails = [],
}: DeliverEmailArgs): Promise<void> {
  const resend = getResend()
  if (!resend) {
    console.log('[Email stub — no RESEND_API_KEY]')
    console.log(`  To: ${to}`)
    console.log(`  Subject: ${subject}`)
    for (const line of stubDetails) {
      console.log(`  ${line}`)
    }
    return
  }

  const { error } = await resend.emails.send({
    from: getEmailFrom(),
    to,
    subject,
    html,
    text,
  })
  if (error) throw new Error(error.message)
}
