/** Paths where a user may authenticate before lodge_id exists on their profile. */
export const AUTH_BOOTSTRAP_PATHS = ['/claim', '/join/complete', '/auth/reset-password'] as const

export function isAuthBootstrapPath(path: string): boolean {
  const base = path.split('?')[0]
  return AUTH_BOOTSTRAP_PATHS.some(p => base === p || base.startsWith(`${p}/`))
}

export function hasLodgeMembership(profile: { lodge_id: string | null } | null | undefined): boolean {
  return !!profile?.lodge_id
}

export type MembershipGateResult =
  | { allowed: true }
  | { allowed: false; reason: 'no_membership' }

/** Returning members need lodge_id. New users may only enter via claim or lodge invite completion. */
export function checkMembershipGate(
  profile: { lodge_id: string | null } | null | undefined,
  nextPath: string
): MembershipGateResult {
  if (hasLodgeMembership(profile)) return { allowed: true }
  if (isAuthBootstrapPath(nextPath)) return { allowed: true }
  return { allowed: false, reason: 'no_membership' }
}

export function isRecentlyCreatedUser(createdAt: string, windowMs = 10 * 60 * 1000): boolean {
  return Date.now() - new Date(createdAt).getTime() < windowMs
}
