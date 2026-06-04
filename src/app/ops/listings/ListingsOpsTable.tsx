'use client'
import { useState } from 'react'
import { Search, Eye, EyeOff, Loader2 } from 'lucide-react'

export interface ListingRow {
  id: string
  business_name: string
  trade_category: string
  city: string
  state: string
  is_active: boolean
  created_at: string
  profiles: {
    full_name: string | null
    email: string | null
    lodges: { name: string; number: string } | null
  } | null
}

export default function ListingsOpsTable({ rows }: { rows: ListingRow[] }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [statuses, setStatuses] = useState<Record<string, boolean>>(
    Object.fromEntries(rows.map(r => [r.id, r.is_active]))
  )

  const filtered = rows.filter(r => {
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      r.business_name.toLowerCase().includes(q) ||
      r.trade_category.toLowerCase().includes(q) ||
      r.city.toLowerCase().includes(q) ||
      r.state.toLowerCase().includes(q) ||
      r.profiles?.full_name?.toLowerCase().includes(q) ||
      r.profiles?.lodges?.name.toLowerCase().includes(q)
    )
  })

  async function toggle(id: string, currentlyActive: boolean) {
    setLoading(id)
    try {
      const res = await fetch(`/api/ops/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentlyActive }),
      })
      if (res.ok) setStatuses(prev => ({ ...prev, [id]: !currentlyActive }))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search name, trade, city, lodge…"
          className="w-full pl-8 pr-3 py-2.5 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-navy/20 focus:border-navy"
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E0D5] text-xs text-muted">
          {filtered.length} of {rows.length} listings
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted px-6 py-10 text-center">No results.</p>
        ) : (
          <div className="divide-y divide-[#F0EBE3]">
            {filtered.map(row => {
              const active = statuses[row.id] ?? row.is_active
              return (
                <div key={row.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1A1A1A] truncate">{row.business_name}</p>
                    <p className="text-xs text-muted">
                      {row.trade_category} · {row.city}, {row.state}
                      {row.profiles?.full_name && <> · {row.profiles.full_name}</>}
                      {row.profiles?.lodges && <> · {row.profiles.lodges.name} #{row.profiles.lodges.number}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      active ? 'bg-[#2D6A4F]/10 text-[#2D6A4F]' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {active ? 'active' : 'inactive'}
                    </span>
                    <button
                      onClick={() => toggle(row.id, active)}
                      disabled={loading === row.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 ${
                        active
                          ? 'text-red-600 border-red-200 hover:bg-red-50'
                          : 'text-[#2D6A4F] border-[#2D6A4F]/30 hover:bg-[#2D6A4F]/5'
                      }`}
                    >
                      {loading === row.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : active ? <><EyeOff size={12} /> Deactivate</> : <><Eye size={12} /> Reactivate</>
                      }
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
