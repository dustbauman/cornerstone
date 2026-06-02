// Read-only probe: replicates lib/db/match-pros matching against the live DB.
// Sends NO emails. Reports blast radius for sample requests.
// A "pro" = an active listing owned by a verified, opted-in member.
// Run: node --env-file=.env.local scripts/test-match-probe.mjs
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing Supabase env'); process.exit(1)
}
const admin = createClient(url, key, { auth: { persistSession: false } })

const MAX_RECIPIENTS = 25
const TRADE_MATCH_RADIUS_MI = 100
const DEFAULT_RADIUS_MI = 50

function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function mask(email) {
  if (!email) return '(none)'
  const [u, d] = email.split('@')
  return `${u.slice(0, 2)}***@${d ?? '?'}`
}

function match(listings, request) {
  const hasGeo = request.lat != null && request.lng != null
  const bestByPro = new Map()
  for (const l of listings) {
    const p = l.profiles
    if (!p?.email) continue
    if (p.id === request.profile_id) continue
    const tradeMatch = !!l.trade_category && l.trade_category === request.category
    const proRadius = l.travel_radius_miles ?? DEFAULT_RADIUS_MI
    let score = null
    let why = ''
    if (request.remote_eligible) {
      if (tradeMatch) { score = 60; why = 'remote+trade' }
    } else if (!hasGeo || l.lat == null || l.lng == null) {
      if (tradeMatch && l.state === request.state) { score = 40; why = 'no-geo trade+state' }
    } else {
      const miles = haversine(request.lat, request.lng, l.lat, l.lng)
      const qualifies = miles <= proRadius || (tradeMatch && miles <= TRADE_MATCH_RADIUS_MI)
      if (qualifies) {
        score = 0
        if (tradeMatch) score += 40
        if (miles <= 25) score += 30
        else if (miles <= DEFAULT_RADIUS_MI) score += 15
        else score += 5
        why = `${tradeMatch ? 'trade ' : ''}${Math.round(miles)}mi`
      }
    }
    if (score == null) continue
    const existing = bestByPro.get(p.id)
    if (existing && existing.score >= score) continue
    bestByPro.set(p.id, { email: p.email, trade: l.trade_category, state: l.state, score, why })
  }
  return [...bestByPro.values()].sort((a, b) => b.score - a.score).slice(0, MAX_RECIPIENTS)
}

const { data: listings } = await admin
  .from('listings')
  .select(
    `profile_id, trade_category, state, lat, lng, remote_eligible, travel_radius_miles,
     profiles:profile_id!inner ( id, full_name, email, verification_status, request_emails_enabled )`
  )
  .eq('is_active', true)
  .eq('profiles.verification_status', 'verified')
  .eq('profiles.request_emails_enabled', true)
  .not('profiles.email', 'is', null)

const eligible = listings ?? []
const distinctPros = new Set(eligible.map((l) => l.profile_id))

console.log('=== Pro pool (active listings, verified + opted-in owners) ===')
console.log(`Eligible listings:        ${eligible.length}`)
console.log(`Distinct pros:            ${distinctPros.size}`)
console.log(`  ...listings with coords:${eligible.filter((l) => l.lat != null && l.lng != null).length}`)
console.log('')

const trades = {}
for (const l of eligible) trades[l.trade_category ?? '(none)'] = (trades[l.trade_category ?? '(none)'] ?? 0) + 1
console.log('=== Eligible listings by trade ===')
console.log(trades)
console.log('')

const samples = [
  { label: 'Plumbing in Tulsa, OK', category: 'Plumbing', state: 'OK', lat: 36.154, lng: -95.9928, remote_eligible: false, profile_id: null },
  { label: 'Electrical in Tampa, FL', category: 'Electrical', state: 'FL', lat: 27.9506, lng: -82.4572, remote_eligible: false, profile_id: null },
  { label: 'Accounting (remote)', category: 'Accounting', state: 'OK', lat: null, lng: null, remote_eligible: true, profile_id: null },
]

for (const s of samples) {
  const recips = match(eligible, s)
  console.log(`=== ${s.label} → ${recips.length} recipient(s) ===`)
  for (const r of recips.slice(0, 10)) {
    console.log(`  ${mask(r.email)}  ${r.trade ?? '?'}  ${r.state ?? '?'}  [${r.why}] score=${r.score}`)
  }
  console.log('')
}

process.exit(0)
