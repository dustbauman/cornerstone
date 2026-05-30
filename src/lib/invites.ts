import { createAdminClient } from './supabase/admin'

export const INVITE_CAPS: Record<string, number | null> = {
  founding: null,
  charter:  null,
  small:    40,
  standard: 100,
  large:    null,
}

export async function canSendInvite(lodgeId: string): Promise<{
  allowed: boolean
  remaining: number | null
  cap: number | null
}> {
  const supabase = createAdminClient()
  const { data: lodge } = await supabase
    .from('lodges')
    .select('invite_cap, invites_sent')
    .eq('id', lodgeId)
    .single()

  if (!lodge) return { allowed: false, remaining: null, cap: null }
  if (lodge.invite_cap === null) return { allowed: true, remaining: null, cap: null }

  const remaining = lodge.invite_cap - (lodge.invites_sent ?? 0)
  return {
    allowed: remaining > 0,
    remaining,
    cap: lodge.invite_cap,
  }
}

export async function recordInviteSent(lodgeId: string, count = 1) {
  const supabase = createAdminClient()
  await supabase.rpc('increment_invites_sent', { lodge_id: lodgeId, amount: count })
}
