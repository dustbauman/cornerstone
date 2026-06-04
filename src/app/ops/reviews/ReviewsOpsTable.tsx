'use client'
import { useState } from 'react'
import { Search, Trash2, Loader2, Star } from 'lucide-react'

export interface ReviewRow {
  id: string
  rating: number
  body: string | null
  created_at: string
  listings: { id: string; business_name: string; trade_category: string } | null
  reviewer: { full_name: string | null; email: string | null } | null
}

export default function ReviewsOpsTable({ rows }: { rows: ReviewRow[] }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  const filtered = rows.filter(r => {
    if (removed.has(r.id)) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      r.listings?.business_name.toLowerCase().includes(q) ||
      r.reviewer?.full_name?.toLowerCase().includes(q) ||
      r.reviewer?.email?.toLowerCase().includes(q) ||
      r.body?.toLowerCase().includes(q)
    )
  })

  async function remove(id: string) {
    if (!confirm('Permanently delete this review? This cannot be undone.')) return
    setLoading(id)
    try {
      const res = await fetch(`/api/ops/reviews/${id}`, { method: 'DELETE' })
      if (res.ok) setRemoved(prev => new Set(Array.from(prev).concat(id)))
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
          placeholder="Search listing, reviewer, content…"
          className="w-full pl-8 pr-3 py-2.5 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-navy/20 focus:border-navy"
        />
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E0D5] text-xs text-muted">
          {filtered.length} of {rows.length - removed.size} reviews
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted px-6 py-10 text-center">No reviews yet.</p>
        ) : (
          <div className="divide-y divide-[#F0EBE3]">
            {filtered.map(row => (
              <div key={row.id} className="flex items-start justify-between gap-4 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={i < row.rating ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-gray-200 fill-gray-200'}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted">
                      {new Date(row.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">
                    {row.listings?.business_name ?? 'Unknown listing'}
                    <span className="text-muted font-normal ml-1">({row.listings?.trade_category})</span>
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    By {row.reviewer?.full_name ?? row.reviewer?.email ?? 'Unknown'}
                  </p>
                  {row.body && (
                    <p className="text-xs text-[#1A1A1A] mt-1.5 leading-relaxed line-clamp-2">{row.body}</p>
                  )}
                </div>
                <button
                  onClick={() => remove(row.id)}
                  disabled={loading === row.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  {loading === row.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
