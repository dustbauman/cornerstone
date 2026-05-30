'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useDebounce } from '@/lib/hooks/useDebounce'

export interface LodgeResult {
  id: string | null
  name: string
  number: string
  city: string
  state: string
  grand_lodge: string | null
  isManualEntry?: boolean
}

interface LodgeSearchProps {
  onSelect: (lodge: LodgeResult | null) => void
  defaultState?: string
  defaultNumber?: string
}

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
]

export { US_STATES }

export default function LodgeSearch({ onSelect, defaultState = '', defaultNumber = '' }: LodgeSearchProps) {
  const [query, setQuery] = useState(defaultNumber || '')
  const [state, setState] = useState(defaultState)
  const [results, setResults] = useState<LodgeResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selected, setSelected] = useState<LodgeResult | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string, s: string) => {
    if (!q && !s) { setResults([]); return }
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (s) params.set('state', s)
      const res = await fetch(`/api/lodge-directory/search?${params}`)
      const data = await res.json()
      setResults(data.results || [])
      setShowResults(true)
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const debouncedSearch = useDebounce(search, 250)

  // Auto-search if defaultNumber is provided
  useEffect(() => {
    if (defaultNumber && defaultState) {
      search(defaultNumber, defaultState)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setSelected(null)
    onSelect(null)
    debouncedSearch(val, state)
  }

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    setState(val)
    setSelected(null)
    onSelect(null)
    if (query || val) debouncedSearch(query, val)
  }

  const handleSelect = (lodge: LodgeResult) => {
    setSelected(lodge)
    setQuery(`${lodge.name} #${lodge.number}`)
    setShowResults(false)
    onSelect(lodge)
  }

  const handleManualEntry = () => {
    setShowManual(true)
    setShowResults(false)
    setSelected(null)
    onSelect(null)
  }

  const handleClear = () => {
    setSelected(null)
    setQuery('')
    setShowManual(false)
    onSelect(null)
  }

  if (showManual) {
    return <ManualLodgeEntry onSelect={onSelect} onBack={() => setShowManual(false)} defaultState={state} />
  }

  return (
    <div ref={containerRef} className="relative">
      <select
        value={state}
        onChange={handleStateChange}
        disabled={!!selected}
        className={`w-full px-4 py-3 border rounded-xl text-sm mb-2 focus:outline-none focus:ring-2 transition ${
          selected
            ? 'border-[#2D6A4F] bg-[#E1F5EE] text-[#0F6E56] cursor-not-allowed'
            : 'border-[#E5E0D5] bg-white focus:ring-navy/20 focus:border-navy'
        }`}
      >
        <option value="">Select your state</option>
        {US_STATES.map(s => (
          <option key={s.code} value={s.code}>{s.name}</option>
        ))}
      </select>

      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          onFocus={() => results.length > 0 && !selected && setShowResults(true)}
          placeholder="Search by lodge name or number…"
          disabled={!!selected}
          className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition ${
            selected
              ? 'border-[#2D6A4F] bg-[#E1F5EE] text-[#0F6E56]'
              : 'border-[#E5E0D5] bg-white focus:ring-navy/20 focus:border-navy'
          }`}
        />
        {isLoading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">Searching…</span>
        )}
        {selected && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy text-lg leading-none"
          >×</button>
        )}
      </div>

      {selected && (
        <div className="mt-2 px-3 py-2.5 bg-[#E1F5EE] border border-[#2D6A4F]/30 rounded-xl flex items-center gap-2">
          <span className="text-[#0F6E56] font-semibold text-sm">✓</span>
          <span className="text-sm text-[#0F6E56]">
            {selected.name} #{selected.number} · {selected.city}, {selected.state}
          </span>
        </div>
      )}

      {showResults && !selected && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-[#E5E0D5] rounded-xl shadow-lg max-h-72 overflow-y-auto">
          {results.length > 0 ? (
            <>
              {results.map((lodge, i) => (
                <button
                  key={lodge.id ?? `${lodge.number}-${lodge.state}`}
                  type="button"
                  onClick={() => handleSelect(lodge)}
                  className={`w-full text-left px-4 py-3 hover:bg-[#FAF3E0] transition-colors ${
                    i < results.length - 1 ? 'border-b border-[#F5F0E8]' : ''
                  }`}
                >
                  <div className="text-sm font-semibold text-navy" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    {lodge.name} #{lodge.number}
                  </div>
                  <div className="text-xs text-muted mt-0.5">{lodge.city}, {lodge.state}</div>
                </button>
              ))}
              <button
                type="button"
                onClick={handleManualEntry}
                className="w-full text-left px-4 py-3 border-t border-[#E5E0D5] bg-stone text-xs text-muted hover:text-navy transition-colors"
              >
                My lodge isn&apos;t listed → Enter manually
              </button>
            </>
          ) : query.length >= 2 && !isLoading ? (
            <div className="px-4 py-4">
              <p className="text-sm text-muted mb-2">No lodges found matching &ldquo;{query}&rdquo;{state ? ` in ${state}` : ''}.</p>
              <button
                type="button"
                onClick={handleManualEntry}
                className="text-sm text-navy font-semibold underline"
              >
                Enter my lodge details manually →
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function ManualLodgeEntry({
  onSelect,
  onBack,
  defaultState,
}: {
  onSelect: (lodge: LodgeResult) => void
  onBack: () => void
  defaultState: string
}) {
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState(defaultState)

  const canSubmit = name.trim() && number.trim() && state

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-muted hover:text-navy flex items-center gap-1 mb-3"
      >
        ← Back to search
      </button>

      <div className="bg-[#FAF3E0] border border-[#C9A84C]/30 rounded-xl px-3 py-2.5 text-xs text-[#7A5C00] mb-3">
        Your lodge will be added to our directory. Make sure the name and number match exactly what appears on your membership card.
      </div>

      <div className="space-y-2">
        <input
          placeholder="Lodge name (e.g. Acacia Lodge)"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
        />
        <input
          placeholder="Lodge number (e.g. 123)"
          value={number}
          onChange={e => setNumber(e.target.value)}
          className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
        />
        <input
          placeholder="City"
          value={city}
          onChange={e => setCity(e.target.value)}
          className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
        />
        <select
          value={state}
          onChange={e => setState(e.target.value)}
          className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
        >
          <option value="">Select state</option>
          {US_STATES.map(s => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => canSubmit && onSelect({ id: null, name: name.trim(), number: number.trim(), city: city.trim(), state, grand_lodge: null, isManualEntry: true })}
          disabled={!canSubmit}
          className="w-full py-3 bg-navy text-white text-sm font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-navy/90 transition-colors"
        >
          Use these details →
        </button>
      </div>
    </div>
  )
}
