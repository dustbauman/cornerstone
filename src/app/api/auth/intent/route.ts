import { NextResponse } from 'next/server'
import {
  AUTH_INTENT_COOKIE,
  AUTH_NEXT_COOKIE,
  type AuthIntent,
} from '@/lib/auth/admission'

function sanitizeNextPath(next: unknown): string | null {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) {
    return null
  }
  return next.split('?')[0]
}

export async function POST(request: Request) {
  const body = await request.json()
  const intent = body.intent as AuthIntent
  const next = sanitizeNextPath(body.next)

  if (intent !== 'claim' && intent !== 'join') {
    return Response.json({ error: 'Invalid intent' }, { status: 400 })
  }

  const cookieOptions = {
    path: '/',
    maxAge: 600,
    sameSite: 'lax' as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(AUTH_INTENT_COOKIE, intent, cookieOptions)
  if (next) {
    response.cookies.set(AUTH_NEXT_COOKIE, next, cookieOptions)
  }
  return response
}
