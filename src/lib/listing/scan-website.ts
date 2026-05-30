import { CATEGORIES } from '@/lib/constants/categories'
import { normalizeStateCode } from '@/lib/constants/states'
import { normalizePhone, validateEmail } from '@/lib/contact-fields'
import { mapTradeCategory } from '@/lib/listing/map-trade-category'
import { extractPageText } from '@/lib/listing/extract-page-text'
import { normalizeWebsiteUrl } from '@/lib/url'

export interface WebsiteScanResult {
  businessName: string
  tradeCategory: string
  city: string
  state: string
  description: string
  services: string[]
  phone: string
  email: string
  website: string
}

const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

export function isSafeWebsiteUrl(raw: string): boolean {
  try {
    const normalized = normalizeWebsiteUrl(raw)
    if (!normalized) return false
    const { protocol, hostname } = new URL(normalized)
    if (protocol !== 'http:' && protocol !== 'https:') return false
    const host = hostname.toLowerCase()
    if (BLOCKED_HOSTS.has(host)) return false
    if (host.endsWith('.local')) return false
    if (/^127\.|^10\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\./.test(host)) return false
    if (host === '169.254.169.254') return false
    return true
  } catch {
    return false
  }
}

export async function fetchWebsiteText(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'TyrianBot/1.0 (+https://tyrian.work; business listing import)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    })

    if (!res.ok) {
      throw new Error(`Could not reach that website (HTTP ${res.status}).`)
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new Error('That URL did not return a web page we can read.')
    }

    const html = await res.text()
    if (html.length > 400_000) {
      throw new Error('Website page is too large to scan.')
    }

    return extractPageText(html)
  } finally {
    clearTimeout(timeout)
  }
}

interface AiPayload {
  businessName?: string
  tradeCategory?: string
  city?: string
  state?: string
  description?: string
  services?: string[]
  phone?: string
  email?: string
  hours?: string
}

export async function scanWebsiteWithAi(
  websiteUrl: string,
  pageText: string
): Promise<WebsiteScanResult> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('Website scanning is not configured yet. Enter your details manually or contact support.')
  }

  const categoriesList = CATEGORIES.join(', ')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: `You extract business listing details from website text for a US professional directory.
Return JSON only with keys: businessName, tradeCategory, city, state, description, services (array of strings), phone, email, hours.
tradeCategory must be one of: ${categoriesList}.
state must be a 2-letter US state code when possible.
description should be 2-4 sentences, professional tone.
services should be 3-8 short service labels if found.
Use empty strings or empty arrays when unknown. Do not invent a physical address if not present.`,
        },
        {
          role: 'user',
          content: `Website URL: ${websiteUrl}\n\nPage content:\n${pageText}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('OpenAI scan error:', err)
    throw new Error('Could not analyze that website. Try again or enter details manually.')
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('No analysis returned for that website.')

  let parsed: AiPayload
  try {
    parsed = JSON.parse(content) as AiPayload
  } catch {
    throw new Error('Could not parse website analysis.')
  }

  let description = (parsed.description ?? '').trim()
  const hours = (parsed.hours ?? '').trim()
  if (hours && !description.toLowerCase().includes('hour')) {
    description = description ? `${description}\n\nHours: ${hours}` : `Hours: ${hours}`
  }

  const phoneRaw = (parsed.phone ?? '').trim()
  const emailRaw = (parsed.email ?? '').trim()
  const phone = normalizePhone(phoneRaw) ?? phoneRaw
  const emailResult = validateEmail(emailRaw)
  const email = emailResult.ok ? emailResult.value ?? '' : ''

  return {
    businessName: (parsed.businessName ?? '').trim(),
    tradeCategory: mapTradeCategory(parsed.tradeCategory),
    city: (parsed.city ?? '').trim(),
    state: normalizeStateCode(parsed.state ?? ''),
    description,
    services: Array.isArray(parsed.services)
      ? parsed.services.map(s => String(s).trim()).filter(Boolean).slice(0, 12)
      : [],
    phone,
    email: email ?? '',
    website: normalizeWebsiteUrl(websiteUrl) ?? websiteUrl,
  }
}
