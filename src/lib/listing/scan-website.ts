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
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('Website scanning is not configured yet. Enter your details manually or contact support.')
  }

  const categoriesList = CATEGORIES.join(', ')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
      max_tokens: 1024,
      system: `You extract business listing details from website text for a US professional directory.
tradeCategory must be one of: ${categoriesList}.
state must be a 2-letter US state code when possible.
description should be 2-4 sentences, professional tone.
services should be 3-8 short service labels if found.
Use empty strings or empty arrays when unknown. Do not invent a physical address if not present.
Always respond by calling the submit_listing tool.`,
      tools: [
        {
          name: 'submit_listing',
          description: 'Submit the extracted business listing details.',
          input_schema: {
            type: 'object',
            properties: {
              businessName: { type: 'string' },
              tradeCategory: { type: 'string', enum: CATEGORIES },
              city: { type: 'string' },
              state: { type: 'string' },
              description: { type: 'string' },
              services: { type: 'array', items: { type: 'string' } },
              phone: { type: 'string' },
              email: { type: 'string' },
              hours: { type: 'string' },
            },
            required: ['businessName', 'tradeCategory', 'city', 'state', 'description', 'services', 'phone', 'email', 'hours'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'submit_listing' },
      messages: [
        {
          role: 'user',
          content: `Website URL: ${websiteUrl}\n\nPage content:\n${pageText}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Anthropic scan error:', err)
    throw new Error('Could not analyze that website. Try again or enter details manually.')
  }

  const data = await res.json()
  const toolUse = data.content?.find(
    (block: { type: string }) => block.type === 'tool_use'
  )
  if (!toolUse?.input) throw new Error('No analysis returned for that website.')

  const parsed = toolUse.input as AiPayload

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
