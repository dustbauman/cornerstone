import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { DB_REQUEST_SELECT } from '@/lib/db/requests'

const VALID_TIMELINES = new Set(['ASAP', 'Within 1 week', 'Within 1 month', 'Flexible'])

function normalizeTimeline(timeline: string): string {
  if (VALID_TIMELINES.has(timeline)) return timeline
  return 'Flexible'
}

/** Public read — bypasses broken anon RLS on requests (see migrations/008) */
export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('requests')
    .select(DB_REQUEST_SELECT)
    .in('status', ['open', 'active', 'filled'])
    .order('created_at', { ascending: false })
    .limit(300)

  if (error) {
    console.error('Requests fetch error:', error)
    return Response.json({ error: 'Failed to load requests' }, { status: 500 })
  }

  return Response.json({ requests: data ?? [] })
}

async function geocode(city: string, state: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const params = new URLSearchParams({ city, state, country: 'US', format: 'json', limit: '1' })
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { 'User-Agent': 'Tyrian/1.0 (hello@tyrian.work)' },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data[0]) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const body = await request.json()
  const {
    title,
    category,
    city,
    state,
    budget,
    timeline,
    details,
    email,
    name,
    lat,
    lng,
    remoteEligible,
  } = body

  if (!title || !category || !city || !state || !email) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const admin = createAdminClient()

  let profileId: string | null = null
  let lodgeId: string | null = null
  let lodgeDisplay: string | null = null
  let postedByName = name || 'Tyrian Member'
  let isVerifiedMember = false
  let resolvedLat: number | null = lat ?? null
  let resolvedLng: number | null = lng ?? null
  const postedByEmail = user?.email
    ? user.email.toLowerCase()
    : String(email).toLowerCase()

  if (user) {
    const { data: profile } = await admin
      .from('profiles')
      .select('id, full_name, lodge_id, verification_status')
      .eq('id', user.id)
      .single()

    if (profile) {
      profileId = profile.id
      postedByName = profile.full_name || user.email?.split('@')[0] || postedByName
      isVerifiedMember = profile.verification_status === 'verified'
      lodgeId = profile.lodge_id

      if (profile.lodge_id) {
        const { data: lodge } = await admin
          .from('lodges')
          .select('name, number')
          .eq('id', profile.lodge_id)
          .single()
        if (lodge) lodgeDisplay = `${lodge.name} #${lodge.number}`
      }
    }
  } else {
    // Anonymous post — geocode the typed city/state so geo-scoring works correctly
    const geo = await geocode(city, state)
    if (geo) {
      resolvedLat = geo.lat
      resolvedLng = geo.lng
    }
  }

  const insertPayload = {
    posted_by_name: postedByName,
    posted_by_email: postedByEmail,
    profile_id: profileId,
    lodge_id: lodgeId,
    lodge_display: lodgeDisplay,
    category,
    title,
    details: details || null,
    city,
    state,
    lat: resolvedLat,
    lng: resolvedLng,
    budget: budget || null,
    timeline: normalizeTimeline(timeline || 'Flexible'),
    status: 'open',
    remote_eligible: remoteEligible ?? false,
    is_verified_member: isVerifiedMember,
  }

  let { data: row, error } = await admin
    .from('requests')
    .insert(insertPayload)
    .select('id, created_at, requester_notify_token')
    .single()

  if (error?.message?.includes('requester_notify_token')) {
    ;({ data: row, error } = await admin
      .from('requests')
      .insert(insertPayload)
      .select('id, created_at')
      .single())
  }

  if (error || !row) {
    console.error('Request insert error:', error)
    return Response.json({ error: 'Failed to post request' }, { status: 500 })
  }

  return Response.json({
    id: row.id,
    created_at: row.created_at,
    notify_token:
      'requester_notify_token' in row
        ? (row as { requester_notify_token?: string }).requester_notify_token ?? null
        : null,
  })
}
