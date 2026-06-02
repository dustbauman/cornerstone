import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from '@/lib/supabase/admin'

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
  } catch (err) {
    console.error('Landing stats: admin client unavailable', err)
    return EMPTY_LANDING_STATS
  }

  const [professionalsRes, lodgesRes, requestsRes] = await Promise.all([
    admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'verified')
      .not('lodge_id', 'is', null),
    admin.from('lodges').select('state').eq('status', 'active'),
    admin
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'active']),
  ])

  if (professionalsRes.error) {
    console.error('Landing stats: professionals query failed', professionalsRes.error)
  }
  if (lodgesRes.error) {
    console.error('Landing stats: lodges query failed', lodgesRes.error)
  }
  if (requestsRes.error) {
    console.error('Landing stats: requests query failed', requestsRes.error)
  }

  const states = new Set<string>()
  for (const lodge of lodgesRes.data ?? []) {
    if (lodge.state) states.add(lodge.state)
  }

  return {
    professionals: professionalsRes.error ? 0 : (professionalsRes.count ?? 0),
    lodges: lodgesRes.error ? 0 : (lodgesRes.data?.length ?? 0),
    states: lodgesRes.error ? 0 : states.size,
    openRequests: requestsRes.error ? 0 : (requestsRes.count ?? 0),
  }
}
