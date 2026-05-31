import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/** Resolve the current user in Route Handlers (cookies, then Authorization bearer). */
export async function getRouteUser(request?: Request): Promise<User | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) return user

  const authHeader = request?.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const accessToken = authHeader.slice(7).trim()
  if (!accessToken) return null

  const bearerClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const {
    data: { user: bearerUser },
    error,
  } = await bearerClient.auth.getUser(accessToken)

  if (error) {
    console.error('Bearer auth error:', error.message)
    return null
  }

  return bearerUser
}
