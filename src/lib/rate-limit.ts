import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Sliding-window duration string, e.g. '30 s', '1 h', '1 d'.
type Window = Parameters<typeof Ratelimit.slidingWindow>[1]

const redis = (() => {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
})()

const limiters = new Map<string, Ratelimit>()

function getLimiter(name: string, max: number, window: Window): Ratelimit | null {
  if (!redis) return null
  const key = `${name}:${max}:${window}`
  let limiter = limiters.get(key)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, window),
      prefix: `rl:${name}`,
      analytics: false,
    })
    limiters.set(key, limiter)
  }
  return limiter
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return request.headers.get('x-real-ip')?.trim() || '0.0.0.0'
}

export interface RateLimitOptions {
  /** Logical bucket name, e.g. 'auth-magic-link'. */
  name: string
  /** What to count against, e.g. the client IP or an email. */
  identifier: string
  max: number
  window: Window
}

/**
 * Returns { ok: true } when allowed. No-ops (allows) when Upstash env vars are
 * unset so local dev and unconfigured deploys keep working.
 */
export async function checkRateLimit(
  opts: RateLimitOptions
): Promise<{ ok: boolean; retryAfter?: number }> {
  const limiter = getLimiter(opts.name, opts.max, opts.window)
  if (!limiter) return { ok: true }

  try {
    const res = await limiter.limit(opts.identifier)
    if (res.success) return { ok: true }
    const retryAfter = Math.max(1, Math.ceil((res.reset - Date.now()) / 1000))
    return { ok: false, retryAfter }
  } catch (err) {
    // Fail open: a Redis outage must not take down auth/checkout.
    console.error('Rate limit check failed (allowing request):', err)
    return { ok: true }
  }
}

export function rateLimitResponse(retryAfter?: number): Response {
  return Response.json(
    { error: 'RATE_LIMITED', message: 'Too many requests. Please try again in a moment.' },
    {
      status: 429,
      headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined,
    }
  )
}
