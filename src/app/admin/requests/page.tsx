'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageSquare, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLodgeAdminGate } from '@/hooks/useLodgeAdminGate'
import AdminDirectoryShell from '@/components/admin/AdminDirectoryShell'
import {
  DB_REQUEST_SELECT,
  dbRequestToServiceRequest,
  type DbRequestRow,
} from '@/lib/db/requests'

export default function AdminRequestsPage() {
  const { loading: gateLoading, error, lodge, lodgeId } = useLodgeAdminGate()
  const [requests, setRequests] = useState<ReturnType<typeof dbRequestToServiceRequest>[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!lodgeId) return
    async function load() {
      const supabase = createClient()
      const { data: members } = await supabase
        .from('profiles')
        .select('id')
        .eq('lodge_id', lodgeId)

      const memberIds = new Set((members || []).map(m => m.id))

      const { data: rows } = await supabase
        .from('requests')
        .select(DB_REQUEST_SELECT)
        .in('status', ['open', 'active'])
        .order('created_at', { ascending: false })

      const filtered = (rows || []).filter(
        (r: DbRequestRow) =>
          r.lodge_id === lodgeId || (r.profile_id != null && memberIds.has(r.profile_id))
      )

      setRequests(filtered.map(row => dbRequestToServiceRequest(row as DbRequestRow)))
      setDataLoading(false)
    }
    load()
  }, [lodgeId])

  const loading = gateLoading || dataLoading

  return (
    <AdminDirectoryShell
      lodge={lodge}
      title="Open requests"
      description="Service requests posted by your lodge or its members that are still open."
      count={requests.length}
      loading={loading}
      error={error}
    >
      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm px-6 py-16 text-center text-muted">
          <MessageSquare size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No open requests from your lodge right now.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm overflow-hidden divide-y divide-gray-50">
          {requests.map(req => (
            <Link
              key={req.id}
              href={`/requests/${req.id}`}
              className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-stone/50 transition-colors group"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1A1A1A] truncate group-hover:text-navy">
                  {req.title}
                </p>
                <p className="text-xs text-muted truncate">
                  {req.name} · {req.category} · {req.city}, {req.state}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {req.budget} · {req.timeline} · {req.responses} response{req.responses === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                    req.status === 'active'
                      ? 'bg-navy/10 text-navy'
                      : 'bg-[#2D6A4F]/10 text-[#2D6A4F]'
                  }`}
                >
                  {req.status}
                </span>
                <ChevronRight size={14} className="text-muted" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </AdminDirectoryShell>
  )
}
