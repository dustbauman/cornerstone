import { createAdminClient } from './supabase/admin'

export const INVITE_CAPS: Record<string, number | null> = {
  founding: null,
  charter:  null,
  small:    null,
  standard: null,
  large:    null,
}

export async function countVerifiedMembers(lodgeId: string): Promise<number> {
  const supabase = createAdminClient()
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('lodge_id', lodgeId)
    .eq('verification_status', 'verified')

  if (error) {
    console.error('countVerifiedMembers error:', error)
    return 0
  }
  return count ?? 0
}

export async function getLodgeMemberCapacity(lodgeId: string): Promise<{
  allowed: boolean
  remaining: number | null
  cap: number | null
  verifiedCount: number
}> {
  const supabase = createAdminClient()
  const { data: lodge } = await supabase
    .from('lodges')
    .select('invite_cap')
    .eq('id', lodgeId)
    .single()

  if (!lodge) {
    return { allowed: false, remaining: null, cap: null, verifiedCount: 0 }
  }

  const verifiedCount = await countVerifiedMembers(lodgeId)
  if (lodge.invite_cap === null) {
    return { allowed: true, remaining: null, cap: null, verifiedCount }
  }

  const remaining = lodge.invite_cap - verifiedCount
  return {
    allowed: remaining > 0,
    remaining,
    cap: lodge.invite_cap,
    verifiedCount,
  }
}

/** True when the lodge can accept another member (verified count below tier cap). */
export async function canAcceptNewMember(lodgeId: string): Promise<{
  allowed: boolean
  remaining: number | null
  cap: number | null
  verifiedCount: number
}> {
  return getLodgeMemberCapacity(lodgeId)
}

/** @deprecated Use canAcceptNewMember — kept for call sites during migration. */
export const canSendInvite = canAcceptNewMember
