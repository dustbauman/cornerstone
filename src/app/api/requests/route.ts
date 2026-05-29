import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const VALID_TIMELINES = new Set(['ASAP', 'Within 1 week', 'Within 1 month', 'Flexible'])

function normalizeTimeline(timeline: string): string {
  if (VALID_TIMELINES.has(timeline)) return timeline
  if (timeline === 'Within 2 weeks') return 'Within 1 month'
  return 'Flexible'
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
  const { data: { user } } = await supabase.auth.getUser()

  let profileId: string | null = null
  let lodgeId: string | null = null
  let lodgeDisplay: string | null = null
  let postedByName = name || 'Tyrian Member'
  let isVerifiedMember = false

  if (user) {
    const admin = adminClient()
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
  }

  const admin = adminClient()
  const { data: row, error } = await admin
    .from('requests')
    .insert({
      posted_by_name: postedByName,
      posted_by_email: email.toLowerCase(),
      profile_id: profileId,
      lodge_id: lodgeId,
      lodge_display: lodgeDisplay,
      category,
      title,
      details: details || null,
      city,
      state,
      lat: lat ?? null,
      lng: lng ?? null,
      budget: budget || null,
      timeline: normalizeTimeline(timeline || 'Flexible'),
      status: 'open',
      remote_eligible: remoteEligible ?? false,
      is_verified_member: isVerifiedMember,
    })
    .select('id, created_at')
    .single()

  if (error) {
    console.error('Request insert error:', error)
    return Response.json({ error: 'Failed to post request' }, { status: 500 })
  }

  return Response.json({ id: row.id, created_at: row.created_at })
}
