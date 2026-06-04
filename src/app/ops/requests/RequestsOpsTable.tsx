'use client'
import { useState } from 'react'
import { Search, Loader2, MinusCircle, Trash2 } from 'lucide-react'

interface Row {
  id: string
  title: string
  category: string
  city: string
  state: string
  status: string
  posted_by_name: string
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-[#2D6A4F]/10 text-[#2D6A4F]',
  active: 'bg-blue-100 text-blue-700',
  filled: 'bg-gray-100 text-gray-500',
  withdrawn: 'bg-amber-100 text-amber-700',
}

export default function RequestsOpsTable({ rows }: { rows: Row[] }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState<string | null>(null)
  const [statuses, setStatuses] = useState<Record<string, string>>(
    Object.fromEntries(rows.map(r => [r.id, r.status]))
  )
  const [removed, setRemoved] = useState<Set<string>>(new Set())

  const filtered = rows.filter(r => {
    if (removed.has(r.id)) return false
    if (statusFilter !== 'all' && (statuses[r.id] ?? r.status) !== statusFilter) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return (
      r.title.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.city.toLowerCase().includes(q) ||
      r.posted_by_name.toLowerCase().includes(q)
    )
  })

  async function withdraw(id: string) {
    if (!confirm('Withdraw this request? It will be hidden from the board.')) return
    setLoading(id)
    try {
      const res = await fetch(`/api/ops/requests/${id}`, { method: 'PATCH' })
      if (res.ok) setStatuses(prev => ({ ...prev, [id]: 'withdrawn' }))
    } finally {
      setLoading(null)
    }
  }

  async function hardDelete(id: string) {
    if (!confirm('Permanently delete this request and all responses? This cannot be undone.')) return
    setLoading(id + '_del')
    try {
      const res = await fetch(`/api/ops/requests/${id}`, { method: 'DELETE' })
      if (res.ok) setRemoved(prev => new Set(Array.from(prev).concat(id)))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search title, category, city…"
            className="w-full pl-8 pr-3 py-2.5 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-navy/20 focus:border-navy"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-navy/20 bg-white"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="active">Active</option>
          <option value="filled">Filled</option>
          <option value="withdrawn">Withdrawn</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E0D5] text-xs text-muted">
          {filtered.length} of {rows.length - removed.size} requests
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted px-6 py-10 text-center">No results.</p>
        ) : (
          <div className="divide-y divide-[#F0EBE3]">
            {filtered.map(row => {
              const status = statuses[row.id] ?? row.status
              const isWithdrawn = status === 'withdrawn'
              return (
                <div key={row.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1A1A1A] truncate">{row.title}</p>
                    <p className="text-xs text-muted">
                      {row.category} · {row.city}, {row.state} · {row.posted_by_name}
                      {' · '}{new Date(row.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {status}
                    </span>
                    {!isWithdrawn && (
                      <button
                        onClick={() => withdraw(row.id)}
                        disabled={loading === row.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
                      >
                        {loading === row.id ? <Loader2 size={12} className="animate-spin" /> : <MinusCircle size={12} />}
                        Withdraw
                      </button>
                    )}
                    <button
                      onClick={() => hardDelete(row.id)}
                      disabled={loading === row.id + '_del'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {loading === row.id + '_del' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Delete
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
