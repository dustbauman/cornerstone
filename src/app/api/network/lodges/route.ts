import { createAdminClient } from '@/lib/supabase/admin'
import type { LodgeCardData } from '@/components/lodge/LodgeCard'
import { enrichLodgeGeo } from '@/lib/lodges/geocode-lodge'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = createAdminClient()

  const { data: lodges, error } = await admin
    .from('lodges')
    .select(
      'id, name, number, city, state, tier, slug, created_at, meeting_address, lat, lng, directory_id'
    )
    .eq('status', 'active')
    .order('tier')
    .order('created_at')

  if (error) {
    console.error('Network lodges fetch error:', error)
    return Response.json({ error: 'Failed to load lodges' }, { status: 500 })
  }

  if (!lodges?.length) {
    return Response.json({ lodges: [] as LodgeCardData[] })
  }

  const results: LodgeCardData[] = []

  for (const lodge of lodges) {
    const [{ data: members }, geo] = await Promise.all([
      admin
        .from('profiles')
        .select('id')
        .eq('lodge_id', lodge.id)
        .eq('verification_status', 'verified'),
      enrichLodgeGeo(admin, lodge),
    ])

    const memberIds = (members ?? []).map((m) => m.id)
    let listingCount = 0
    if (memberIds.length) {
      const { count } = await admin
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .in('profile_id', memberIds)
        .eq('is_active', true)
      listingCount = count ?? 0
    }

    const { count: requestCount } = await admin
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('lodge_id', lodge.id)
      .in('status', ['open', 'active'])

    results.push({
      id: lodge.id,
      slug: lodge.slug,
      name: lodge.name,
      number: lodge.number,
      city: geo.city,
      state: geo.state,
      meetingAddress: geo.meeting_address,
      lat: geo.lat,
      lng: geo.lng,
      tier: lodge.tier,
      memberCount: memberIds.length,
      listingCount,
      requestCount: requestCount ?? 0,
    })
  }

  results.sort((a, b) => {
    const aFounding = a.tier === 'founding' || a.tier === 'charter'
    const bFounding = b.tier === 'founding' || b.tier === 'charter'
    if (aFounding && !bFounding) return -1
    if (bFounding && !aFounding) return 1
    return b.memberCount - a.memberCount
  })

  return Response.json({ lodges: results })
}
