'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import EditRequestModal, { type EditableRequest } from '@/components/requests/EditRequestModal'
import { getAuthHeaders } from '@/lib/supabase/auth-headers'

interface Props {
  request: EditableRequest & { status?: string }
  onUpdated?: (request: EditableRequest) => void
  className?: string
}

export default function ManageRequestActions({ request, onUpdated, className = '' }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [withdrawing, setWithdrawing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canManage =
    request.status === undefined || request.status === 'open' || request.status === 'active'

  if (!canManage) return null

  async function handleWithdraw() {
    const ok = window.confirm(
      'Remove this request from the board? Existing responses will no longer be visible on the public board.'
    )
    if (!ok) return

    setWithdrawing(true)
    setError(null)

    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch(`/api/me/requests/${request.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: authHeaders,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Could not remove request')
        return
      }
      router.push('/dashboard#my-requests')
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setWithdrawing(false)
    }
  }

  return (
    <>
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="text-sm font-semibold text-navy border border-navy/20 px-3 py-1.5 rounded-lg hover:bg-stone transition-colors"
        >
          Edit request
        </button>
        <button
          type="button"
          onClick={handleWithdraw}
          disabled={withdrawing}
          className="text-sm font-semibold text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {withdrawing ? 'Removing…' : 'Remove from board'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {editOpen && (
        <EditRequestModal
          request={request}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            onUpdated?.(updated)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
