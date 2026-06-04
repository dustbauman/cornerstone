import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { verifyOpsToken, OPS_COOKIE } from '@/lib/ops-token'

function redirectWithSessionCookies(url: URL, sessionResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url)
  sessionResponse.cookies.getAll().forEach(({ name, value }) => {
    redirectResponse.cookies.set(name, value)
  })
  return redirectResponse
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Validates JWT and refreshes the session cookie when needed
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtected =
    path.startsWith('/dashboard') ||
    path.startsWith('/admin') ||
    path.startsWith('/settings')

  const requiresLodge = path.startsWith('/dashboard') || path.startsWith('/admin')
  // /ops pages: redirect to /ops/login if the signed cookie is missing/invalid.
  // /api/ops routes: no redirect — requirePlatformAdmin() in each handler returns 404.
  const isOpsPage = path.startsWith('/ops') && !path.startsWith('/api/ops') && path !== '/ops/login'
  if (isOpsPage) {
    const token = request.cookies.get(OPS_COOKIE)?.value ?? ''
    if (!(await verifyOpsToken(token))) {
      const url = request.nextUrl.clone()
      url.pathname = '/ops/login'
      return NextResponse.redirect(url)
    }
  }

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', path)
    return NextResponse.redirect(url)
  }

  if (user && requiresLodge) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('lodge_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.lodge_id) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'no_membership')
      return redirectWithSessionCookies(url, supabaseResponse)
    }
  }

  return supabaseResponse
}
