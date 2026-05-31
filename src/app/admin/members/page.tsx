'use client'

import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLodgeAdminGate } from '@/hooks/useLodgeAdminGate'
import AdminDirectoryShell from '@/components/admin/AdminDirectoryShell'
import MemberDirectoryRow, { type AdminMemberRow } from '@/components/admin/MemberDirectoryRow'

export default function AdminMembersPage() {
  const { loading: gateLoading, error, lodge, lodgeId } = useLodgeAdminGate()
  const [members, setMembers] = useState<AdminMemberRow[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!lodgeId) return
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select(
          'id, full_name, email, trade_category, city, verification_status, is_lodge_admin, is_co_admin'
        )
        .eq('lodge_id', lodgeId)
        .order('full_name')
      setMembers((data || []) as AdminMemberRow[])
      setDataLoading(false)
    }
    load()
  }, [lodgeId])

  const loading = gateLoading || dataLoading

  return (
    <AdminDirectoryShell
      lodge={lodge}
      title="Total members"
      description="All brothers who have joined your lodge on Tyrian."
      count={members.length}
      loading={loading}
      error={error}
    >
      {members.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm px-6 py-16 text-center text-muted">
          <Users size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No members yet. Share your lodge invite link from the admin dashboard.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm overflow-hidden divide-y divide-gray-50">
          {members.map(member => (
            <MemberDirectoryRow key={member.id} member={member} />
          ))}
        </div>
      )}
    </AdminDirectoryShell>
  )
}
