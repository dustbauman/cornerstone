const MESSAGE = 'tyrian-ops-v1'
export const OPS_COOKIE = 'ops_token'

async function computeToken(secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(MESSAGE))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function generateOpsToken(): Promise<string> {
  const secret = process.env.PLATFORM_ADMIN_SECRET
  if (!secret) throw new Error('PLATFORM_ADMIN_SECRET is not set')
  return computeToken(secret)
}

export async function verifyOpsToken(token: string): Promise<boolean> {
  const secret = process.env.PLATFORM_ADMIN_SECRET
  if (!secret || !token) return false
  const expected = await computeToken(secret)
  if (token.length !== expected.length) return false
  // Constant-time comparison to prevent timing attacks
  let diff = 0
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}
