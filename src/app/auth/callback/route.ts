import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isRecentlyCreatedUser } from '@/lib/auth/membership-gate'
import {
  AUTH_INTENT_COOKIE,
  AUTH_NEXT_COOKIE,
  checkAuthAdmission,
  parseAuthIntentCookie,
  parseAuthNextCookie,
} from '@/lib/auth/admission'

function sanitizeNextPath(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/dashboard'
  }
  return next.split('?')[0]
}

function resolveNextPath(queryNext: string | null, cookieNext: string | undefined): string {
  if (queryNext) return sanitizeNextPath(queryNext)
  return sanitizeNextPath(parseAuthNextCookie(cookieNext))
}

function clearAuthFlowCookies(response: NextResponse) {
  response.cookies.set(AUTH_INTENT_COOKIE, '', { path: '/', maxAge: 0 })
  response.cookies.set(AUTH_NEXT_COOKIE, '', { path: '/', maxAge: 0 })
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const cookieStore = cookies()
  const authIntent = parseAuthIntentCookie(cookieStore.get(AUTH_INTENT_COOKIE)?.value)
  const next = resolveNextPath(
    searchParams.get('next'),
    cookieStore.get(AUTH_NEXT_COOKIE)?.value
  )

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const admin = createAdminClient()
        const { data: profile } = await admin
          .from('profiles')
          .select('full_name, lodge_id')
          .eq('id', user.id)
          .maybeSingle()

        const admission = await checkAuthAdmission(admin, user, profile, next, authIntent)
        if (!admission.allowed) {
          await supabase.auth.signOut()

          if (isRecentlyCreatedUser(user.created_at)) {
            try {
              await admin.auth.admin.deleteUser(user.id)
            } catch (err) {
              console.error('Failed to delete unauthorized signup:', err)
            }
          }

          const loginUrl = new URL(`${origin}/login`)
          loginUrl.searchParams.set('error', 'no_membership')
          if (next !== '/dashboard') {
            loginUrl.searchParams.set('redirect', next)
          }
          if (authIntent === 'claim' || next.startsWith('/claim')) {
            loginUrl.searchParams.set('mode', 'claim')
          }
          const response = NextResponse.redirect(loginUrl.toString())
          clearAuthFlowCookies(response)
          return response
        }

        const metaName =
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          null
        if (metaName?.trim() && !profile?.full_name?.trim()) {
          await admin
            .from('profiles')
            .update({ full_name: metaName.trim() })
            .eq('id', user.id)
        }

        const response = NextResponse.redirect(`${origin}${next}`)
        clearAuthFlowCookies(response)
        return response
      }

      const response = NextResponse.redirect(`${origin}${next}`)
      clearAuthFlowCookies(response)
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
