import type { SupabaseClient } from '@supabase/supabase-js'

export interface ResponderContact {
  fullName: string
  trade: string | null
  lodgeLabel: string | null
  city: string | null
  state: string | null
  phone: string | null
  email: string | null
  isVerified: boolean
}

/** Batch variant — fetches contacts for multiple responders in 3 queries instead of 3N. */
export async function getResponderContacts(
  supabase: SupabaseClient,
  profileIds: string[]
): Promise<Map<string, ResponderContact>> {
  if (!profileIds.length) return new Map()

  const [{ data: profiles }, { data: listings }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, trade_category, occupation, lodge_id, city, state, verification_status')
      .in('id', profileIds),
    supabase
      .from('listings')
      .select('profile_id, phone, email')
      .in('profile_id', profileIds)
      .eq('is_active', true),
  ])

  if (!profiles?.length) return new Map()

  const lodgeIds = Array.from(new Set(profiles.filter((p) => p.lodge_id).map((p) => p.lodge_id as string)))
  const { data: lodges } = lodgeIds.length
    ? await supabase.from('lodges').select('id, name, number').in('id', lodgeIds)
    : { data: [] }

  const lodgeMap = new Map((lodges ?? []).map((l) => [l.id, l]))
  const listingMap = new Map((listings ?? []).map((l) => [l.profile_id, l]))

  return new Map(
    profiles.map((profile) => {
      const lodge = profile.lodge_id ? lodgeMap.get(profile.lodge_id) : null
      const listing = listingMap.get(profile.id)
      return [
        profile.id,
        {
          fullName: profile.full_name?.trim() || 'Verified Member',
          trade: profile.trade_category || profile.occupation || null,
          lodgeLabel: lodge ? `${lodge.name} #${lodge.number}` : null,
          city: profile.city,
          state: profile.state,
          phone: listing?.phone?.trim() || null,
          email: listing?.email?.trim() || profile.email?.trim() || null,
          isVerified: profile.verification_status === 'verified',
        } as ResponderContact,
      ]
    })
  )
}

/** Contact shown to requesters: profile identity + listing phone/email when available. */
export async function getResponderContact(
  supabase: SupabaseClient,
  profileId: string
): Promise<ResponderContact | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, trade_category, occupation, lodge_id, city, state, verification_status')
    .eq('id', profileId)
    .single()

  if (!profile) return null

  let lodgeLabel: string | null = null
  if (profile.lodge_id) {
    const { data: lodge } = await supabase
      .from('lodges')
      .select('name, number, city, state')
      .eq('id', profile.lodge_id)
      .maybeSingle()
    if (lodge) {
      lodgeLabel = `${lodge.name} #${lodge.number}`
    }
  }

  const { data: listing } = await supabase
    .from('listings')
    .select('phone, email')
    .eq('profile_id', profileId)
    .eq('is_active', true)
    .maybeSingle()

  return {
    fullName: profile.full_name?.trim() || 'Verified Member',
    trade: profile.trade_category || profile.occupation || null,
    lodgeLabel,
    city: profile.city,
    state: profile.state,
    phone: listing?.phone?.trim() || null,
    email: listing?.email?.trim() || profile.email?.trim() || null,
    isVerified: profile.verification_status === 'verified',
  }
}
