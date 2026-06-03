'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MoreHorizontal, Shield, ShieldOff, ArrowRightLeft } from 'lucide-react'
import { CO_ADMIN_CAP } from '@/lib/lodge-admin-roles'
import type { AdminMemberRow } from '@/components/admin/MemberDirectoryRow'

type RoleAction = 'promote_co_admin' | 'demote_co_admin' | 'transfer_primary'

interface Props {
  member: AdminMemberRow
  currentUserId: string
  isPrimaryAdmin: boolean
  coAdminCount: number
  onUpdated: () => void
}

export default function MemberRoleActions({
  member,
  currentUserId,
  isPrimaryAdmin,
  coAdminCount,
  onUpdated,
}: Props) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [modal, setModal] = useState<'transfer' | null>(null)
  const [keepAsCoAdmin, setKeepAsCoAdmin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isSelf = member.id === currentUserId
  const atCoAdminCap = coAdminCount >= CO_ADMIN_CAP

  async function runAction(action: RoleAction, options?: { keepAsCoAdmin?: boolean }) {
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: member.id,
        action,
        keepAsCoAdmin: options?.keepAsCoAdmin,
      }),
    })

    const data = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) {
      setError(typeof data.message === 'string' ? data.message : 'Something went wrong. Please try again.')
      return
    }

    setModal(null)
    setMenuOpen(false)

    if (action === 'transfer_primary' && !options?.keepAsCoAdmin) {
      router.push('/dashboard?admin_transferred=1')
      router.refresh()
      return
    }

    if (action === 'demote_co_admin' && data.demotedSelf) {
      router.push('/dashboard?co_admin_removed=1')
      router.refresh()
      return
    }

    onUpdated()
    router.refresh()
  }

  function openTransfer() {
    setKeepAsCoAdmin(true)
    setError('')
    setModal('transfer')
    setMenuOpen(false)
  }

  const displayName = member.full_name || member.email || 'this member'

  const canPromote =
    isPrimaryAdmin &&
    !isSelf &&
    !member.is_lodge_admin &&
    !member.is_co_admin &&
    member.verification_status === 'verified'

  const canTransfer =
    isPrimaryAdmin &&
    !isSelf &&
    !member.is_lodge_admin &&
    member.verification_status === 'verified'

  const canRemoveCoAdmin = isPrimaryAdmin && member.is_co_admin && !member.is_lodge_admin && !isSelf

  const canStepDown = member.is_co_admin && isSelf && !member.is_lodge_admin

  if (!canPromote && !canTransfer && !canRemoveCoAdmin && !canStepDown) {
    return null
  }

  return (
    <>
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setMenuOpen(open => !open)}
          className="p-1.5 rounded-lg text-muted hover:text-navy hover:bg-stone transition-colors"
          aria-label="Admin role actions"
        >
          <MoreHorizontal size={16} />
        </button>

        {menuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10 cursor-default"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1 z-20 min-w-[200px] bg-white border border-[#E5E0D5] rounded-xl shadow-lg py-1 text-sm">
              {canPromote && (
                <button
                  type="button"
                  disabled={atCoAdminCap || loading}
                  onClick={() => {
                    setMenuOpen(false)
                    void runAction('promote_co_admin')
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-stone disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Shield size={14} />
                  Make co-admin
                </button>
              )}

              {canTransfer && (
                <button
                  type="button"
                  onClick={openTransfer}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-stone text-red-700"
                >
                  <ArrowRightLeft size={14} />
                  Transfer primary role
                </button>
              )}

              {canRemoveCoAdmin && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setMenuOpen(false)
                    void runAction('demote_co_admin')
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-stone"
                >
                  <ShieldOff size={14} />
                  Remove co-admin
                </button>
              )}

              {canStepDown && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setMenuOpen(false)
                    void runAction('demote_co_admin')
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-stone"
                >
                  <ShieldOff size={14} />
                  Step down as co-admin
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {modal === 'transfer' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-navy mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Transfer primary admin?
            </h2>
            <p className="text-sm text-muted mb-4">
              <strong className="text-[#1A1A1A]">{displayName}</strong> will become the primary admin and can manage members, settings, and billing.
            </p>

            <label className="flex items-start gap-2.5 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={keepAsCoAdmin}
                onChange={e => setKeepAsCoAdmin(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-sm text-[#1A1A1A]">Keep me as co-admin</span>
            </label>

            {!keepAsCoAdmin && atCoAdminCap && (
              <p className="text-xs text-muted mb-3">
                Unchecking this removes your admin access entirely.
              </p>
            )}

            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#E5E0D5] text-sm font-semibold text-muted hover:bg-stone transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void runAction('transfer_primary', { keepAsCoAdmin })}
                className="flex-1 py-2.5 rounded-xl bg-red-700 text-white text-sm font-semibold hover:bg-red-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
