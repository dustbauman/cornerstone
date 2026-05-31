import { createClient } from '@/lib/supabase/client'

/** Headers for authenticated fetches to Route Handlers when cookies are unreliable. */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) return {}

  return {
    Authorization: `Bearer ${session.access_token}`,
  }
}
