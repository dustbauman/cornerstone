import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLodgeMemberCapacity } from '@/lib/invites'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  const slug = new URL(request.url).searchParams.get('slug')?.trim()
  if (!slug) {
    return Response.json({ error: 'Missing slug' }, { status: 400 })
  }

  const supabase = createAdminClient()
  let query = supabase
    .from('lodges')
    .select('id, name, number, city, state, welcome_message, meeting_schedule, slug, invite_cap, status')
    .eq('status', 'active')

  if (UUID_PATTERN.test(slug)) {
    query = query.eq('id', slug)
  } else {
    query = query.eq('slug', slug)
  }

  const { data: lodge } = await query.maybeSingle()
  if (!lodge) {
    return Response.json({ found: false }, { status: 404 })
  }

  const capacity = await getLodgeMemberCapacity(lodge.id)

  return Response.json({
    found: true,
    lodge: {
      id: lodge.id,
      name: lodge.name,
      number: lodge.number,
      city: lodge.city,
      state: lodge.state,
      welcome_message: lodge.welcome_message,
      meeting_schedule: lodge.meeting_schedule,
      slug: lodge.slug,
      invite_cap: lodge.invite_cap,
    },
    verifiedCount: capacity.verifiedCount,
    atCap: lodge.invite_cap !== null && !capacity.allowed,
    remaining: capacity.remaining,
  })
}
