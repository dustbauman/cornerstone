'use client'

import { useEffect, useState, useCallback } from 'react'
import { Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLodgeAdminGate } from '@/hooks/useLodgeAdminGate'
import AdminDirectoryShell from '@/components/admin/AdminDirectoryShell'
import MemberDirectoryRow, { type AdminMemberRow } from '@/components/admin/MemberDirectoryRow'

export default function AdminPendingPage() {
  const { loading: gateLoading, error, lodge, lodgeId, currentUserId } = useLodgeAdminGate()
  const [members, setMembers] = useState<AdminMemberRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    if (!lodgeId) return
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select(
        'id, full_name, email, trade_category, city, verification_status, is_lodge_admin, is_co_admin'
      )
      .eq('lodge_id', lodgeId)
      .eq('verification_status', 'pending')
    setMembers((data || []) as AdminMemberRow[])
    setDataLoading(false)
  }, [lodgeId])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const pending = members.filter(
    m => !m.is_lodge_admin && !m.is_co_admin && m.id !== currentUserId
  )

  async function handleMemberAction(memberId: string, action: 'approve' | 'deny') {
    setActionLoading(memberId)
    const res = await fetch('/api/admin/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, action }),
    })
    setActionLoading(null)
    if (res.ok) {
      setMembers(prev => prev.filter(m => m.id !== memberId))
    }
  }

  const loading = gateLoading || dataLoading

  return (
    <AdminDirectoryShell
      lodge={lodge}
      title="Pending approvals"
      description="Review brothers waiting for lodge verification before they appear in the network."
      count={pending.length}
      loading={loading}
      error={error}
    >
      {pending.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm px-6 py-16 text-center text-muted">
          <Clock size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No pending approvals. You&apos;re all caught up.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden divide-y divide-gray-50">
          {pending.map(member => (
            <MemberDirectoryRow
              key={member.id}
              member={member}
              showActions
              actionLoading={actionLoading === member.id}
              onApprove={() => handleMemberAction(member.id, 'approve')}
              onDeny={() => handleMemberAction(member.id, 'deny')}
            />
          ))}
        </div>
      )}
    </AdminDirectoryShell>
  )
}
