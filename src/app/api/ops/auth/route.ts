import { generateOpsToken, OPS_COOKIE } from '@/lib/ops-token'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
}

export async function POST(request: Request) {
  const { secret } = await request.json().catch(() => ({})) as { secret?: string }

  if (!secret || !process.env.PLATFORM_ADMIN_SECRET) {
    return Response.json({ error: 'Invalid' }, { status: 401 })
  }

  if (secret !== process.env.PLATFORM_ADMIN_SECRET) {
    // Deliberate delay to slow brute-force
    await new Promise(r => setTimeout(r, 800))
    return Response.json({ error: 'Invalid' }, { status: 401 })
  }

  const token = await generateOpsToken()

  const res = Response.json({ ok: true })
  res.headers.set(
    'Set-Cookie',
    `${OPS_COOKIE}=${token}; Path=${COOKIE_OPTIONS.path}; Max-Age=${COOKIE_OPTIONS.maxAge}; HttpOnly; SameSite=Strict${COOKIE_OPTIONS.secure ? '; Secure' : ''}`
  )
  return res
}

export async function DELETE() {
  const res = Response.json({ ok: true })
  res.headers.set(
    'Set-Cookie',
    `${OPS_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`
  )
  return res
}
