export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'flagged'

export type MemberAccessState =
  | 'unaffiliated'
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'flagged'

export interface MemberProfileAccess {
  lodge_id: string | null
  verification_status: string
}

export function getMemberAccessState(profile: MemberProfileAccess): MemberAccessState {
  if (!profile.lodge_id) return 'unaffiliated'
  if (profile.verification_status === 'verified') return 'verified'
  if (profile.verification_status === 'rejected') return 'rejected'
  if (profile.verification_status === 'flagged') return 'flagged'
  return 'pending'
}

export function canCreateListing(profile: MemberProfileAccess): boolean {
  return !!profile.lodge_id && profile.verification_status === 'verified'
}
