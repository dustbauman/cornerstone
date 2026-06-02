// One-time backfill: geocode city/state → lat/lng for listings missing coordinates.
// Push-to-pro distance matching reads listings.lat/lng (see lib/db/match-pros.ts).
// Idempotent: only touches rows where lat or lng is null. Safe to re-run.
//
// Run: node --env-file=.env.local scripts/backfill-listing-coords.mjs
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing Supabase env'); process.exit(1)
}
const admin = createClient(url, key, { auth: { persistSession: false } })

async function geocodeCityState(city, state) {
  const q = `${city.trim()}, ${state.trim()}, USA`
  const params = new URLSearchParams({ q, format: 'json', limit: '1', countrycodes: 'us' })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': 'Tyrian/backfill (listings geocode)' },
  })
  if (!res.ok) return null
  const data = await res.json()
  if (!data?.[0]) return null
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
}

const { data: listings, error } = await admin
  .from('listings')
  .select('id, city, state, lat, lng')
  .or('lat.is.null,lng.is.null')

if (error) { console.error('Query failed:', error.message); process.exit(1) }

if (!listings?.length) {
  console.log('No listings need backfilling. Done.')
  process.exit(0)
}

console.log(`Backfilling ${listings.length} listing(s)...`)
let updated = 0
let skipped = 0

for (const l of listings) {
  if (!l.city || !l.state) {
    console.log(`  skip ${l.id} — missing city/state`)
    skipped++
    continue
  }
  const coords = await geocodeCityState(l.city, l.state)
  if (!coords) {
    console.log(`  skip ${l.id} — geocode failed for ${l.city}, ${l.state}`)
    skipped++
  } else {
    const { error: upErr } = await admin
      .from('listings')
      .update({ lat: coords.lat, lng: coords.lng })
      .eq('id', l.id)
    if (upErr) {
      console.log(`  fail ${l.id} — ${upErr.message}`)
      skipped++
    } else {
      console.log(`  ok   ${l.id} — ${l.city}, ${l.state} → ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`)
      updated++
    }
  }
  await new Promise((r) => setTimeout(r, 1100)) // Nominatim rate limit
}

console.log(`\nDone. Updated ${updated}, skipped ${skipped}.`)
process.exit(0)
