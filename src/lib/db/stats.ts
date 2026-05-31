import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from '@/lib/supabase/admin'
import { isVerifiedPublicListing, type DbListingRow } from '@/lib/db/listings'

export interface LandingStats {
  professionals: number
  lodges: number
  states: number
  openRequests: number
}

export const EMPTY_LANDING_STATS: LandingStats = {
  professionals: 0,
  lodges: 0,
  states: 0,
  openRequests: 0,
}

export async function getLandingStats(): Promise<LandingStats> {
  if (!isSupabaseAdminConfigured()) {
    return EMPTY_LANDING_STATS
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return EMPTY_LANDING_STATS
  }

  let listingsRes
  let lodgesRes
  let requestsRes
  try {
    ;[listingsRes, lodgesRes, requestsRes] = await Promise.all([
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
  } catch {
    return EMPTY_LANDING_STATS
  }

  if (listingsRes.error || lodgesRes.error || requestsRes.error) {
    return EMPTY_LANDING_STATS
  }

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
