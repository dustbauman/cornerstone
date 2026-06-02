import type { SupabaseClient } from '@supabase/supabase-js'
import { isAuthBootstrapPath, hasLodgeMembership } from '@/lib/auth/membership-gate'

export type AuthIntent = 'claim' | 'join'

export async function hasUnclaimedLodgeForEmail(
  admin: SupabaseClient,
  email: string
): Promise<boolean> {
  const normalized = email.toLowerCase().trim()
  const { data } = await admin
    .from('lodges')
    .select('id')
    .eq('paid_by_email', normalized)
    .eq('status', 'active')
    .is('claim_code_claimed_at', null)
    .limit(1)
  return (data?.length ?? 0) > 0
}

export async function checkAuthAdmission(
  admin: SupabaseClient,
  user: { id: string; email?: string | null },
  profile: { lodge_id: string | null } | null | undefined,
  nextPath: string,
  authIntent: AuthIntent | null
): Promise<{ allowed: boolean; reason?: 'no_membership' }> {
  if (hasLodgeMembership(profile)) return { allowed: true }
  if (isAuthBootstrapPath(nextPath)) return { allowed: true }

  // Checkout payers may not have a profile yet — claim intent is enough.
  if (authIntent === 'claim') {
    return { allowed: true }
  }

  if (user.email && (await hasUnclaimedLodgeForEmail(admin, user.email))) {
    return { allowed: true }
  }

  return { allowed: false, reason: 'no_membership' }
}

export const AUTH_INTENT_COOKIE = 'tyrian_auth_intent'
export const AUTH_NEXT_COOKIE = 'tyrian_auth_next'

export function parseAuthIntentCookie(value: string | undefined): AuthIntent | null {
  if (value === 'claim' || value === 'join') return value
  return null
}

export function parseAuthNextCookie(value: string | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  return value
}
