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
