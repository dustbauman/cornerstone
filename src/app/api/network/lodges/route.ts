import { createAdminClient } from '@/lib/supabase/admin'
import type { LodgeCardData } from '@/components/lodge/LodgeCard'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = createAdminClient()

  const { data: lodges, error } = await admin
    .from('lodges')
    .select('id, name, number, city, state, tier, slug, created_at')
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
    const { data: members } = await admin
      .from('profiles')
      .select('id')
      .eq('lodge_id', lodge.id)
      .eq('verification_status', 'verified')

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
      city: lodge.city ?? '',
      state: lodge.state ?? '',
      tier: lodge.tier,
      memberCount: memberIds.length,
      listingCount,
      requestCount: requestCount ?? 0,
    })
  }

  results.sort((a, b) => {
    if (a.tier === 'founding' && b.tier !== 'founding') return -1
    if (b.tier === 'founding' && a.tier !== 'founding') return 1
    return b.memberCount - a.memberCount
  })

  return Response.json({ lodges: results })
}
