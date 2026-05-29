import { NextResponse } from 'next/server'
import { AUTH_INTENT_COOKIE, type AuthIntent } from '@/lib/auth/admission'

export async function POST(request: Request) {
  const body = await request.json()
  const intent = body.intent as AuthIntent

  if (intent !== 'claim' && intent !== 'join') {
    return Response.json({ error: 'Invalid intent' }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(AUTH_INTENT_COOKIE, intent, {
    path: '/',
    maxAge: 600,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  })
  return response
}
