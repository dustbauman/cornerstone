import { lookup } from 'node:dns/promises'
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

/** True if an IP literal (v4 or v6) is private, loopback, link-local, or otherwise non-public. */
export function isPrivateIp(ip: string): boolean {
  const addr = ip.toLowerCase().replace(/^\[|\]$/g, '')

  // IPv4 (also handles IPv4-mapped IPv6 like ::ffff:127.0.0.1)
  const v4 = addr.startsWith('::ffff:') ? addr.slice(7) : addr
  const m = v4.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (m) {
    const [a, b] = m.slice(1).map(Number)
    if (a === 10) return true
    if (a === 127) return true
    if (a === 0) return true
    if (a === 169 && b === 254) return true // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true // carrier-grade NAT
    if (a >= 224) return true // multicast / reserved
    return false
  }

  // IPv6
  if (addr === '::' || addr === '::1') return true // unspecified / loopback
  if (addr.startsWith('fe80')) return true // link-local
  if (addr.startsWith('fc') || addr.startsWith('fd')) return true // unique local (ULA)
  if (addr.startsWith('ff')) return true // multicast
  return false
}

/** Cheap synchronous pre-filter on the URL string. The real guard is assertPublicUrl. */
export function isSafeWebsiteUrl(raw: string): boolean {
  try {
    const normalized = normalizeWebsiteUrl(raw)
    if (!normalized) return false
    const { protocol, hostname } = new URL(normalized)
    if (protocol !== 'http:' && protocol !== 'https:') return false
    const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (BLOCKED_HOSTS.has(host)) return false
    if (host.endsWith('.local') || host.endsWith('.internal')) return false
    // Block obvious IP literals (DNS names are checked at fetch time via assertPublicUrl)
    if (/^[\d.]+$/.test(host) || host.includes(':')) {
      if (isPrivateIp(host)) return false
    }
    return true
  } catch {
    return false
  }
}

/** Resolve the URL's host and throw if it (or any resolved address) is non-public. */
async function assertPublicUrl(url: string): Promise<void> {
  const { protocol, hostname } = new URL(url)
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new Error('Unsupported URL.')
  }
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('That URL is not allowed.')
  }
  // IP literal: validate directly. Hostname: resolve all addresses and validate each.
  if (/^[\d.]+$/.test(host) || host.includes(':')) {
    if (isPrivateIp(host)) throw new Error('That URL is not allowed.')
    return
  }
  const results = await lookup(host, { all: true })
  if (results.length === 0) throw new Error('That URL could not be resolved.')
  for (const { address } of results) {
    if (isPrivateIp(address)) throw new Error('That URL is not allowed.')
  }
}

export async function fetchWebsiteText(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12_000)

  try {
    // Follow redirects manually so we can re-validate every hop's host (a public URL
    // can 30x-redirect to an internal address, bypassing a one-time check).
    let currentUrl = url
    let res: Response | undefined
    for (let hop = 0; hop < 5; hop++) {
      await assertPublicUrl(currentUrl)
      res = await fetch(currentUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TyrianBot/1.0 (+https://tyrian.work; business listing import)',
          Accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'manual',
      })

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        if (!location) break
        currentUrl = new URL(location, currentUrl).toString()
        continue
      }
      break
    }

    if (!res) {
      throw new Error('Could not reach that website.')
    }
    if (res.status >= 300 && res.status < 400) {
      throw new Error('That website redirected too many times.')
    }
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
