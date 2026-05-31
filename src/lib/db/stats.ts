import { createAdminClient } from '@/lib/supabase/admin'
import { isVerifiedPublicListing, type DbListingRow } from '@/lib/db/listings'

export interface LandingStats {
  professionals: number
  lodges: number
  states: number
  openRequests: number
}

export async function getLandingStats(): Promise<LandingStats> {
  const admin = createAdminClient()

  const [listingsRes, lodgesRes, requestsRes] = await Promise.all([
    admin
      .from('listings')
      .select(
        `id, state, profiles:profile_id ( verification_status, lodge_id )`
      )
      .eq('is_active', true)
      .eq('visibility', 'public'),
    admin.from('lodges').select('state').eq('status', 'active'),
    admin
      .from('requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'active']),
  ])

  const rows = (listingsRes.data ?? []) as unknown as Pick<
    DbListingRow,
    'id' | 'state' | 'profiles'
  >[]

  const professionals = rows.filter((row) =>
    isVerifiedPublicListing(row as DbListingRow)
  ).length

  const states = new Set<string>()
  for (const row of rows) {
    if (row.state) states.add(row.state)
  }
  for (const lodge of lodgesRes.data ?? []) {
    if (lodge.state) states.add(lodge.state)
  }

  return {
    professionals,
    lodges: lodgesRes.data?.length ?? 0,
    states: states.size,
    openRequests: requestsRes.count ?? 0,
  }
}
