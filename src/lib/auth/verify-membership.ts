import type { SupabaseClient } from '@supabase/supabase-js'
import { checkMembershipGate, hasLodgeMembership } from '@/lib/auth/membership-gate'

export async function fetchProfileMembership(
  supabase: SupabaseClient,
  userId: string
) {
  const { data } = await supabase
    .from('profiles')
    .select('lodge_id')
    .eq('id', userId)
    .maybeSingle()
  return data
}

export async function verifyMembershipForRedirect(
  supabase: SupabaseClient,
  userId: string,
  redirectPath: string
) {
  const profile = await fetchProfileMembership(supabase, userId)
  return checkMembershipGate(profile, redirectPath)
}

export { hasLodgeMembership, checkMembershipGate }
