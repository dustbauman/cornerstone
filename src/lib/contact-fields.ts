import { normalizeWebsiteUrl } from '@/lib/url'

export type FieldResult =
  | { ok: true; value: string | null }
  | { ok: false; error: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Live mask while typing — digits only, auto (XXX) XXX-XXXX */
export function formatPhoneAsYouType(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

/** Format US phone as (XXX) XXX-XXXX when 10 digits; otherwise return cleaned digits. */
export function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, '')
  if (d.length === 10) {
    return formatPhoneAsYouType(d)
  }
  if (d.length === 11 && d.startsWith('1')) {
    return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  }
  return digits.trim()
}

export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return formatPhoneDisplay(digits)
  if (digits.length === 11 && digits.startsWith('1')) return formatPhoneDisplay(digits)
  return null
}

export function validatePhone(raw: string): FieldResult {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: true, value: null }
  const normalized = normalizePhone(trimmed)
  if (!normalized) {
    return { ok: false, error: 'Enter a valid US phone number (10 digits).' }
  }
  return { ok: true, value: normalized }
}

export function validateEmail(raw: string): FieldResult {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: true, value: null }
  if (!EMAIL_RE.test(trimmed)) {
    return { ok: false, error: 'Enter a valid email address.' }
  }
  return { ok: true, value: trimmed.toLowerCase() }
}

export function validateWebsite(raw: string): FieldResult {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: true, value: null }
  const normalized = normalizeWebsiteUrl(trimmed)
  if (!normalized) return { ok: false, error: 'Enter a valid website URL.' }
  try {
    const host = new URL(normalized).hostname
    if (!host.includes('.')) {
      return { ok: false, error: 'Enter a valid website URL (e.g. yourbusiness.com).' }
    }
  } catch {
    return { ok: false, error: 'Enter a valid website URL.' }
  }
  return { ok: true, value: normalized }
}

export function phoneToTelHref(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) return `tel:+${digits}`
  if (digits.length === 10) return `tel:+1${digits}`
  return `tel:${digits}`
}

export function validateListingContact(fields: {
  phone: string
  email: string
  website: string
}): { ok: true; phone: string | null; email: string | null; website: string | null } | { ok: false; error: string } {
  const phoneResult = validatePhone(fields.phone)
  if (!phoneResult.ok) return phoneResult
  const emailResult = validateEmail(fields.email)
  if (!emailResult.ok) return emailResult
  const websiteResult = validateWebsite(fields.website)
  if (!websiteResult.ok) return websiteResult
  return {
    ok: true,
    phone: phoneResult.value,
    email: emailResult.value,
    website: websiteResult.value,
  }
}
