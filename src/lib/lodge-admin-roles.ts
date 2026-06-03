export const CO_ADMIN_CAP = 2

export type AdminRoleAction =
  | 'promote_co_admin'
  | 'demote_co_admin'
  | 'transfer_primary'

export function adminRoleLabel(isLodgeAdmin: boolean, isCoAdmin: boolean): string | null {
  if (isLodgeAdmin) return 'Primary'
  if (isCoAdmin) return 'Co-admin'
  return null
}
