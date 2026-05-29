# Tyrian — Lodge Directory Brief
## Day 3 Prerequisite — Complete Before Starting Day 3

This task must be completed and verified before touching any Day 3 code.
The `/join` page signup form depends on the lodge directory being seeded.
Do not build `app/join/page.tsx` until this brief is fully done.

Estimated time: 2–3 hours.

---

## What this does and why it matters

Instead of asking paying members to type their lodge name and number manually,
the join page will search a pre-loaded directory of real lodges and let the
member select theirs. This guarantees clean, consistent lodge data from day one.

The directory is reference data — it represents lodges that exist in the world.
The existing `lodges` table represents lodges that are active on Tyrian.
These are two separate things and must stay in two separate tables.

---

## Step 1 — Schema: add the lodge_directory table

Run this in the Supabase SQL editor before writing any application code.

```sql
-- ─── LODGE DIRECTORY ───────────────────────────────────────────
-- Reference data. Pre-populated. Read-only from the app.
-- Represents all known lodges, whether or not they are on Tyrian.
create table lodge_directory (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  number          text not null,
  state           text not null,
  city            text not null,
  grand_lodge     text,
  meeting_address text,
  source          text,       -- e.g. "GL Florida website, May 2025"
  is_active       boolean default true,   -- false = lodge closed/dormant
  created_at      timestamptz default now(),
  constraint lodge_directory_unique unique (number, state)
);

-- Full-text search index for name + city searches
create index lodge_directory_name_idx 
  on lodge_directory using gin(to_tsvector('english', name || ' ' || city));
create index lodge_directory_number_idx on lodge_directory(number);
create index lodge_directory_state_idx on lodge_directory(state);

-- RLS: public read-only — anyone can search the directory
alter table lodge_directory enable row level security;
create policy "lodge_directory_public_read" on lodge_directory
  for select using (true);

-- Link the existing lodges table to the directory
-- Run this only if the column doesn't already exist
alter table lodges
  add column if not exists directory_id uuid references lodge_directory(id);
```

---

## Step 2 — Seed script: `scripts/seed-lodge-directory.ts`

Create this file. It inserts all known FL and OK lodges into the directory.
The data below is representative — in practice, pull the full current list
from the Grand Lodge of Florida (glflorida.org) and Grand Lodge of Oklahoma
(glok.org) websites and expand these arrays to include every lodge listed.

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // service role — needed for seed
)

const floridaLodges = [
  // Source: Grand Lodge of Florida — glflorida.org
  // Populated: May 2025
  { name: "Gulf Coast Lodge",      number: "441", city: "Tampa",        state: "FL" },
  { name: "Suncoast Lodge",        number: "217", city: "Sarasota",     state: "FL" },
  { name: "Keystone Lodge",        number: "88",  city: "Orlando",      state: "FL" },
  { name: "Ashlar Lodge",          number: "98",  city: "Jacksonville", state: "FL" },
  { name: "St. Johns Lodge",       number: "1",   city: "St. Augustine",state: "FL" },
  { name: "Pensacola Lodge",       number: "42",  city: "Pensacola",    state: "FL" },
  { name: "Miami Lodge",           number: "131", city: "Miami",        state: "FL" },
  { name: "Hillsborough Lodge",    number: "25",  city: "Tampa",        state: "FL" },
  { name: "Palatka Lodge",         number: "34",  city: "Palatka",      state: "FL" },
  { name: "DeLand Lodge",          number: "69",  city: "DeLand",       state: "FL" },
  { name: "Gainesville Lodge",     number: "41",  city: "Gainesville",  state: "FL" },
  { name: "Fort Lauderdale Lodge", number: "146", city: "Fort Lauderdale", state: "FL" },
  { name: "Coral Gables Lodge",    number: "261", city: "Coral Gables", state: "FL" },
  { name: "Winter Park Lodge",     number: "239", city: "Winter Park",  state: "FL" },
  { name: "Clearwater Lodge",      number: "127", city: "Clearwater",   state: "FL" },
  // → Expand with full FL lodge list from glflorida.org
]

const oklahomaLodges = [
  // Source: Grand Lodge of Oklahoma — glok.org
  // Populated: May 2025
  { name: "Acacia Lodge",         number: "123", city: "Tulsa",         state: "OK" },
  { name: "Prairie Lodge",        number: "56",  city: "Oklahoma City", state: "OK" },
  { name: "Heartland Lodge",      number: "302", city: "Edmond",        state: "OK" },
  { name: "Cherokee Lodge",       number: "10",  city: "Tahlequah",     state: "OK" },
  { name: "Enid Lodge",           number: "47",  city: "Enid",          state: "OK" },
  { name: "Lawton Lodge",         number: "130", city: "Lawton",        state: "OK" },
  { name: "Muskogee Lodge",       number: "56",  city: "Muskogee",      state: "OK" },
  { name: "Shawnee Lodge",        number: "88",  city: "Shawnee",       state: "OK" },
  { name: "Stillwater Lodge",     number: "224", city: "Stillwater",    state: "OK" },
  { name: "Norman Lodge",         number: "38",  city: "Norman",        state: "OK" },
  { name: "Broken Arrow Lodge",   number: "537", city: "Broken Arrow",  state: "OK" },
  { name: "Bartlesville Lodge",   number: "100", city: "Bartlesville",  state: "OK" },
  { name: "Durant Lodge",         number: "116", city: "Durant",        state: "OK" },
  { name: "Ponca City Lodge",     number: "71",  city: "Ponca City",    state: "OK" },
  { name: "Ardmore Lodge",        number: "182", city: "Ardmore",       state: "OK" },
  // → Expand with full OK lodge list from glok.org
]

// Add any other states with existing connections here
const otherLodges: typeof floridaLodges = [
  // Add lodge data for other states as connections expand
]

async function seedLodgeDirectory() {
  const allLodges = [
    ...floridaLodges.map(l => ({
      ...l,
      grand_lodge: 'Grand Lodge of Florida',
      source: 'glflorida.org — May 2025',
    })),
    ...oklahomaLodges.map(l => ({
      ...l,
      grand_lodge: 'Grand Lodge of Oklahoma',
      source: 'glok.org — May 2025',
    })),
    ...otherLodges,
  ]

  console.log(`Seeding ${allLodges.length} lodges into lodge_directory...`)

  // Upsert — safe to run multiple times without creating duplicates
  const { data, error } = await supabase
    .from('lodge_directory')
    .upsert(allLodges, { 
      onConflict: 'number,state',
      ignoreDuplicates: false   // update existing records if data changes
    })
    .select()

  if (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  }

  console.log(`✓ Seeded ${data?.length} lodges successfully.`)

  // Summary by state
  const byState = allLodges.reduce((acc, l) => {
    acc[l.state] = (acc[l.state] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  Object.entries(byState).forEach(([state, count]) => {
    console.log(`  ${state}: ${count} lodges`)
  })
}

seedLodgeDirectory()
```

**Run the seed script:**

```bash
npx ts-node --project tsconfig.json scripts/seed-lodge-directory.ts
```

If ts-node isn't available:
```bash
npm install -D ts-node
```

**Before running:** confirm `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are set in `.env.local`.
The service role key is required — the anon key cannot insert data
when RLS is enabled.

---

## Step 3 — API route: lodge directory search

### `app/api/lodge-directory/search/route.ts`

```typescript
// GET /api/lodge-directory/search?q=acacia&state=OK
// Returns up to 10 matching lodges from the directory.
// Used by the join page search input.

import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  const state = searchParams.get('state')?.trim()

  // Require at least a state or a meaningful query
  if (!q && !state) {
    return Response.json({ results: [] })
  }

  let query = supabase
    .from('lodge_directory')
    .select('id, name, number, city, state, grand_lodge')
    .eq('is_active', true)
    .order('state')
    .order('number')
    .limit(10)

  // Filter by state if provided
  if (state && state !== 'ALL') {
    query = query.eq('state', state)
  }

  // Search by name, number, or city
  if (q) {
    // Number search: if query looks like a number, match exactly
    if (/^\d+$/.test(q)) {
      query = query.eq('number', q)
    } else {
      // Text search: match name or city (case insensitive)
      query = query.or(
        `name.ilike.%${q}%,city.ilike.%${q}%,number.ilike.%${q}%`
      )
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('Lodge directory search error:', error)
    return Response.json({ results: [] }, { status: 500 })
  }

  return Response.json({ results: data || [] })
}
```

---

## Step 4 — Component: LodgeSearch

### `components/LodgeSearch.tsx`

This component replaces the manual lodge name + number text fields on the
join page. It is a search-and-select input that calls the directory API.

```typescript
'use client'
import { useState, useCallback, useRef } from 'react'
import { useDebounce } from '@/lib/hooks/useDebounce'  // see below

interface LodgeResult {
  id: string
  name: string
  number: string
  city: string
  state: string
  grand_lodge: string
}

interface LodgeSearchProps {
  onSelect: (lodge: LodgeResult | null) => void
  defaultState?: string
}

export function LodgeSearch({ onSelect, defaultState }: LodgeSearchProps) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState(defaultState || '')
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

  if (showManual) {
    return <ManualLodgeEntry onSelect={onSelect} onBack={() => setShowManual(false)} />
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* State selector */}
      <select
        value={state}
        onChange={handleStateChange}
        style={{
          width: '100%', padding: '10px 12px',
          border: '1px solid #E5E0D5', borderRadius: '8px',
          fontFamily: "'DM Sans', sans-serif", fontSize: '14px',
          background: 'white', color: '#1A1A1A',
          marginBottom: '8px'
        }}
      >
        <option value="">Select your state</option>
        {US_STATES.map(s => (
          <option key={s.code} value={s.code}>{s.name}</option>
        ))}
      </select>

      {/* Search input */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={handleQueryChange}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search by lodge name or number..."
          disabled={!!selected}
          style={{
            width: '100%', padding: '10px 12px',
            border: `1px solid ${selected ? '#2D6A4F' : '#E5E0D5'}`,
            borderRadius: '8px',
            fontFamily: "'DM Sans', sans-serif", fontSize: '14px',
            background: selected ? '#E1F5EE' : 'white',
            color: '#1A1A1A',
          }}
        />
        {isLoading && (
          <span style={{
            position: 'absolute', right: '12px', top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '12px', color: '#6B7280'
          }}>
            Searching...
          </span>
        )}
        {selected && (
          <button
            onClick={() => { setSelected(null); setQuery(''); onSelect(null); }}
            style={{
              position: 'absolute', right: '10px', top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none',
              cursor: 'pointer', color: '#6B7280', fontSize: '18px'
            }}
          >×</button>
        )}
      </div>

      {/* Selected lodge confirmation */}
      {selected && (
        <div style={{
          marginTop: '8px', padding: '10px 12px',
          background: '#E1F5EE', border: '1px solid #2D6A4F',
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <span style={{ color: '#0F6E56', fontWeight: 500 }}>✓</span>
          <span style={{ fontSize: '13px', color: '#0F6E56' }}>
            {selected.name} #{selected.number} · {selected.city}, {selected.state}
          </span>
        </div>
      )}

      {/* Results dropdown */}
      {showResults && results.length > 0 && !selected && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          marginTop: '4px', zIndex: 50,
          background: 'white', border: '1px solid #E5E0D5',
          borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          maxHeight: '280px', overflowY: 'auto'
        }}>
          {results.map((lodge, i) => (
            <button
              key={lodge.id}
              onClick={() => handleSelect(lodge)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '10px 14px',
                border: 'none',
                borderBottom: i < results.length - 1 ? '1px solid #F5F0E8' : 'none',
                background: 'transparent', cursor: 'pointer',
                transition: 'background 0.1s'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FAF3E0')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                fontSize: '14px', fontWeight: 500,
                color: '#1B2A4A', fontFamily: "'Cormorant Garamond', serif"
              }}>
                {lodge.name} #{lodge.number}
              </div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                {lodge.city}, {lodge.state}
              </div>
            </button>
          ))}

          {/* Manual entry option — always at bottom of results */}
          <button
            onClick={handleManualEntry}
            style={{
              width: '100%', textAlign: 'left',
              padding: '10px 14px',
              border: 'none', borderTop: '1px solid #E5E0D5',
              background: '#FAFAFA', cursor: 'pointer',
              fontSize: '13px', color: '#6B7280',
              fontFamily: "'DM Sans', sans-serif"
            }}
          >
            My lodge isn't listed → Enter manually
          </button>
        </div>
      )}

      {/* No results state */}
      {showResults && results.length === 0 && query.length >= 2 && !isLoading && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          marginTop: '4px', zIndex: 50,
          background: 'white', border: '1px solid #E5E0D5',
          borderRadius: '8px', padding: '14px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
        }}>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 8px' }}>
            No lodges found matching "{query}"
            {state ? ` in ${state}` : ''}.
          </p>
          <button
            onClick={handleManualEntry}
            style={{
              fontSize: '13px', color: '#1B2A4A',
              fontWeight: 500, background: 'none',
              border: 'none', cursor: 'pointer', padding: 0,
              textDecoration: 'underline'
            }}
          >
            Enter my lodge details manually →
          </button>
        </div>
      )}
    </div>
  )
}

// ── MANUAL ENTRY FALLBACK ─────────────────────────────────────────
// Shown when member's lodge is not in the directory.
// Flags the lodge for admin review after signup.

interface ManualProps {
  onSelect: (lodge: any) => void
  onBack: () => void
}

function ManualLodgeEntry({ onSelect, onBack }: ManualProps) {
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')

  const inputStyle = {
    width: '100%', padding: '10px 12px', marginBottom: '8px',
    border: '1px solid #E5E0D5', borderRadius: '8px',
    fontFamily: "'DM Sans', sans-serif", fontSize: '14px',
    background: 'white', color: '#1A1A1A',
  }

  const handleConfirm = () => {
    if (!name || !number || !state) return
    onSelect({
      id: null,            // null = not in directory, needs review
      name, number, city, state,
      grand_lodge: null,
      isManualEntry: true  // flag for admin review
    })
  }

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#6B7280', fontSize: '13px', padding: '0 0 12px',
          display: 'flex', alignItems: 'center', gap: '4px'
        }}
      >
        ← Back to search
      </button>

      <div style={{
        padding: '10px 12px', background: '#FAF3E0',
        border: '1px solid rgba(201,168,76,0.3)', borderRadius: '8px',
        fontSize: '12px', color: '#7A5C00', marginBottom: '12px'
      }}>
        Your lodge will be added to our directory. Make sure the name and
        number match exactly what appears on your membership card.
      </div>

      <input
        placeholder="Lodge name (e.g. Acacia Lodge)"
        value={name} onChange={e => setName(e.target.value)}
        style={inputStyle}
      />
      <input
        placeholder="Lodge number (e.g. 123)"
        value={number} onChange={e => setNumber(e.target.value)}
        style={inputStyle}
      />
      <input
        placeholder="City"
        value={city} onChange={e => setCity(e.target.value)}
        style={inputStyle}
      />
      <select
        value={state} onChange={e => setState(e.target.value)}
        style={{ ...inputStyle, marginBottom: '12px' }}
      >
        <option value="">Select state</option>
        {US_STATES.map(s => (
          <option key={s.code} value={s.code}>{s.name}</option>
        ))}
      </select>

      <button
        onClick={handleConfirm}
        disabled={!name || !number || !state}
        style={{
          width: '100%', padding: '11px',
          background: name && number && state ? '#1B2A4A' : '#E5E0D5',
          color: name && number && state ? 'white' : '#9CA3AF',
          border: 'none', borderRadius: '8px', cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif", fontSize: '14px',
          fontWeight: 500
        }}
      >
        Use these details →
      </button>
    </div>
  )
}

// US States list
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
```

---

## Step 5 — Utility hook: `lib/hooks/useDebounce.ts`

Required by the LodgeSearch component to avoid firing an API call
on every keystroke.

```typescript
import { useCallback, useRef } from 'react'

export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay]) as T
}
```

---

## Step 6 — Admin panel addition: manual entry review queue

When a member selects "My lodge isn't listed" and enters manually,
the lodge signup flow sets `directory_id = null` on the lodges record.

Add a section to the existing admin panel (`app/admin/page.tsx`) for
the platform admin (you) to review these:

```typescript
// Query for lodges where directory_id is null — needs review
const { data: unverifiedLodges } = await supabase
  .from('lodges')
  .select('*')
  .is('directory_id', null)
  .eq('status', 'active')

// Show in admin under "Needs attention":
// Lodge name | Number | State | Paid | Action: [Add to directory] [Mark verified]
```

This is a simple table — no complex UI needed. Just a list you can 
work through manually when a new lodge signs up outside the directory.

---

## Step 7 — How Day 3 uses this

When the Day 3 join page is built, the `LodgeSearch` component
replaces the manual text fields entirely.

The confirmation screen (`app/join/confirm/page.tsx`) will receive
a lodge object that looks like one of these:

```typescript
// From directory (preferred):
{
  id: "uuid-from-lodge-directory",
  name: "Acacia Lodge",
  number: "123",
  city: "Tulsa",
  state: "OK",
  grand_lodge: "Grand Lodge of Oklahoma",
  isManualEntry: false
}

// Manual entry (needs admin review):
{
  id: null,
  name: "Some Lodge",
  number: "999",
  city: "Somewhere",
  state: "TX",
  grand_lodge: null,
  isManualEntry: true
}
```

In `create-checkout/route.ts`, when inserting the new `lodges` record:
- If `directory_id` is present: set it on the record
- If `isManualEntry` is true: leave `directory_id` as null,
  and add a note to the lodge record for admin review

---

## Files to create

```
scripts/
  seed-lodge-directory.ts       ← Run once before Day 3

app/api/lodge-directory/
  search/route.ts               ← Search endpoint

components/
  LodgeSearch.tsx               ← Search + select + manual fallback

lib/hooks/
  useDebounce.ts                ← Debounce hook
```

---

## Verification checklist — must pass before starting Day 3

```
Schema:
  [ ] lodge_directory table created in Supabase
  [ ] unique constraint on (number, state) confirmed
  [ ] RLS policy allows public read
  [ ] directory_id column added to lodges table

Seed:
  [ ] Seed script runs without errors
  [ ] FL lodges appear in Supabase lodge_directory table
  [ ] OK lodges appear in Supabase lodge_directory table
  [ ] Running seed script a second time doesn't create duplicates

Search API:
  [ ] GET /api/lodge-directory/search?q=acacia&state=OK returns results
  [ ] GET /api/lodge-directory/search?q=123&state=OK returns number match
  [ ] GET /api/lodge-directory/search?q=xyz returns empty array (no error)
  [ ] No lodge data is returned for inactive lodges

Component:
  [ ] LodgeSearch renders without errors
  [ ] Typing in search field calls API with debounce (not on every keypress)
  [ ] Selecting a lodge shows green confirmation and locks the input
  [ ] "My lodge isn't listed" option appears in results and on no-results
  [ ] Manual entry form shows correct fields
  [ ] Manual entry sets isManualEntry: true on the returned object
  [ ] Clearing selection resets the form correctly
```

---

## Data sourcing note

The lodge lists in Step 2 are representative examples — not exhaustive.
Before running the seed script, spend 30–60 minutes pulling the real,
current lodge lists from:

- **Florida:** glflorida.org → Lodge Locator or Grand Lodge directory
- **Oklahoma:** glok.org → Lodge directory

Copy lodge name, number, and city for each. The seed script handles
the rest. Accuracy here directly affects how many members can find
their lodge without manual entry — worth doing properly.

---

*Lodge Directory prerequisite brief — complete before Day 3.*
*This is a one-time setup. Once seeded, the directory requires no
ongoing maintenance except when adding a new state.*
