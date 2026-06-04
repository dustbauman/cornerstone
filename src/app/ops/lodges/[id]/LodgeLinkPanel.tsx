'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, CheckCircle2, Link2, Loader2, X, ShieldOff, ShieldCheck } from 'lucide-react'

interface DirectoryResult {
  id: string
  name: string
  number: string
  city: string
  state: string
  grand_lodge: string
}

interface Lodge {
  id: string
  name: string
  number: string
  state: string
  status: string
  directory_id: string | null
}

export default function LodgeLinkPanel({ lodge }: { lodge: Lodge }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DirectoryResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<DirectoryResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [suspending, setSuspending] = useState(false)
  const [error, setError] = useState('')

  const isSuspended = lodge.status === 'suspended'

  async function toggleSuspend() {
    const newStatus = isSuspended ? 'active' : 'suspended'
    const verb = isSuspended ? 'Unsuspend' : 'Suspend'
    if (!confirm(`${verb} ${lodge.name}?`)) return
    setSuspending(true)
    try {
      const res = await fetch(`/api/ops/lodges/${lodge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) { setError('Status update failed'); return }
      router.refresh()
    } finally {
      setSuspending(false)
    }
  }

  async function search(q: string) {
    setQuery(q)
    if (q.trim().length < 2) { setResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(
        `/api/lodge-directory/search?q=${encodeURIComponent(q)}&state=${encodeURIComponent(lodge.state)}`
      )
      const data = await res.json()
      setResults(data.results ?? [])
    } finally {
      setSearching(false)
    }
  }

  async function link() {
    if (!selected) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/ops/lodges/${lodge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory_id: selected.id }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Save failed')
        return
      }
      setSaved(true)
      setTimeout(() => router.refresh(), 800)
    } finally {
      setSaving(false)
    }
  }

  async function unlink() {
    if (!confirm(`Remove directory link from ${lodge.name}?`)) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/ops/lodges/${lodge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory_id: null }),
      })
      if (!res.ok) {
        setError('Unlink failed')
        return
      }
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6">
      <h2 className="text-xl font-bold text-navy mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        Directory link
      </h2>
      <p className="text-xs text-muted mb-5">
        Linking a lodge_directory row verifies this manual signup and backfills geo data.
      </p>

      {lodge.directory_id ? (
        <div className="flex items-center justify-between gap-3 bg-[#2D6A4F]/5 border border-[#2D6A4F]/20 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#2D6A4F] flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A]">Directory linked</p>
              <p className="text-xs text-muted font-mono">{lodge.directory_id}</p>
            </div>
          </div>
          <button
            onClick={unlink}
            disabled={saving}
            className="text-xs text-muted hover:text-red-600 flex items-center gap-1 transition-colors"
          >
            <X size={12} />
            Unlink
          </button>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-5">
          <Link2 size={13} />
          Not linked to lodge_directory
        </div>
      )}

      <div className="space-y-3">
        <label className="block text-xs font-semibold text-navy">
          Search lodge_directory
        </label>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={query}
            onChange={e => search(e.target.value)}
            placeholder={`e.g. "${lodge.number}" or "${lodge.name.split(' ')[0]}"`}
            className="w-full pl-8 pr-3 py-2.5 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-navy/20 focus:border-navy"
          />
          {searching && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted animate-spin" />
          )}
        </div>

        {results.length > 0 && !selected && (
          <div className="border border-[#E5E0D5] rounded-xl overflow-hidden">
            {results.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => { setSelected(r); setResults([]) }}
                className="w-full flex items-start justify-between gap-3 px-4 py-3 text-left hover:bg-stone/50 transition-colors border-b border-[#F0EBE3] last:border-0"
              >
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">
                    {r.name} #{r.number}
                  </p>
                  <p className="text-xs text-muted">{r.city}, {r.state} · {r.grand_lodge}</p>
                </div>
                <span className="text-xs text-navy font-semibold flex-shrink-0 mt-0.5">Select →</span>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="bg-stone rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A]">
                {selected.name} #{selected.number}
              </p>
              <p className="text-xs text-muted">{selected.city}, {selected.state}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-muted hover:text-red-500 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          type="button"
          onClick={link}
          disabled={!selected || saving || saved}
          className="w-full py-2.5 bg-navy text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-navy/90 transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <><Loader2 size={14} className="animate-spin" /> Saving…</>
          ) : saved ? (
            <><CheckCircle2 size={14} /> Linked!</>
          ) : (
            'Link & verify lodge'
          )}
        </button>
      </div>

      {/* Suspend / unsuspend */}
      <div className={`mt-6 pt-6 border-t ${isSuspended ? 'border-red-100' : 'border-[#E5E0D5]'}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#1A1A1A]">
              {isSuspended ? 'Lodge is suspended' : 'Suspend lodge'}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {isSuspended
                ? 'Unsuspending restores normal access for this lodge.'
                : 'Hides this lodge from the platform and blocks member actions.'}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleSuspend}
            disabled={suspending}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl border transition-colors disabled:opacity-50 flex-shrink-0 ${
              isSuspended
                ? 'text-[#2D6A4F] border-[#2D6A4F]/30 hover:bg-[#2D6A4F]/5'
                : 'text-red-600 border-red-200 hover:bg-red-50'
            }`}
          >
            {suspending
              ? <Loader2 size={14} className="animate-spin" />
              : isSuspended
              ? <><ShieldCheck size={14} /> Unsuspend</>
              : <><ShieldOff size={14} /> Suspend</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
