'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLodgeAdminGate } from '@/hooks/useLodgeAdminGate'
import AdminDirectoryShell from '@/components/admin/AdminDirectoryShell'
import {
  DB_LISTING_SELECT,
  dbListingToListing,
  type DbListingRow,
} from '@/lib/db/listings'

export default function AdminListingsPage() {
  const { loading: gateLoading, error, lodge, lodgeId } = useLodgeAdminGate()
  const [listings, setListings] = useState<ReturnType<typeof dbListingToListing>[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!lodgeId) return
    async function load() {
      const supabase = createClient()
      const { data: members } = await supabase
        .from('profiles')
        .select('id')
        .eq('lodge_id', lodgeId)

      const memberIds = (members || []).map(m => m.id)
      if (memberIds.length === 0) {
        setDataLoading(false)
        return
      }

      const { data: rows } = await supabase
        .from('listings')
        .select(DB_LISTING_SELECT)
        .in('profile_id', memberIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      setListings(
        (rows || []).map(row => dbListingToListing(row as unknown as DbListingRow))
      )
      setDataLoading(false)
    }
    load()
  }, [lodgeId])

  const loading = gateLoading || dataLoading

  return (
    <AdminDirectoryShell
      lodge={lodge}
      title="Active listings"
      description="Business listings from verified members of your lodge that are currently live."
      count={listings.length}
      loading={loading}
      error={error}
    >
      {listings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm px-6 py-16 text-center text-muted">
          <Eye size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No active listings from lodge members yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm overflow-hidden divide-y divide-gray-50">
          {listings.map(listing => (
            <Link
              key={listing.id}
              href={`/directory/${listing.id}`}
              className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-stone/50 transition-colors group"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1A1A1A] truncate group-hover:text-navy">
                  {listing.businessName}
                </p>
                <p className="text-xs text-muted truncate">
                  {listing.ownerName} · {listing.trade} · {listing.location.city}, {listing.location.stateCode}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {listing.verified ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#2D6A4F]/10 text-[#2D6A4F]">
                    Verified
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    Pending
                  </span>
                )}
                <ChevronRight size={14} className="text-muted" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </AdminDirectoryShell>
  )
}
