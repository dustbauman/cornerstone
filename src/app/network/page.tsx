import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import LodgeCard, { type LodgeCardData } from '@/components/lodge/LodgeCard'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'The Network · Tyrian',
  description: 'Browse lodges on Tyrian — verified professionals, open requests, and members from lodges across the country.',
}

async function getLodges(): Promise<LodgeCardData[]> {
  const supabase = createClient()

  const { data: lodges } = await supabase
    .from('lodges')
    .select('id, name, number, city, state, tier, slug, created_at')
    .eq('status', 'active')
    .order('tier')
    .order('created_at')

  if (!lodges?.length) return []

  const results: LodgeCardData[] = []

  for (const lodge of lodges) {
    const { data: members } = await supabase
      .from('profiles')
      .select('id')
      .eq('lodge_id', lodge.id)
      .eq('verification_status', 'verified')

    const memberIds = (members || []).map(m => m.id)
    let listingCount = 0
    if (memberIds.length) {
      const { count } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .in('profile_id', memberIds)
        .eq('is_active', true)
      listingCount = count ?? 0
    }

    const { count: requestCount } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('lodge_id', lodge.id)
      .in('status', ['open', 'active'])

    results.push({
      id: lodge.id,
      slug: lodge.slug,
      name: lodge.name,
      number: lodge.number,
      city: lodge.city,
      state: lodge.state,
      tier: lodge.tier,
      memberCount: memberIds.length,
      listingCount,
      requestCount: requestCount ?? 0,
    })
  }

  return results.sort((a, b) => {
    if (a.tier === 'founding' && b.tier !== 'founding') return -1
    if (b.tier === 'founding' && a.tier !== 'founding') return 1
    return b.memberCount - a.memberCount
  })
}

export default async function NetworkPage() {
  const lodges = await getLodges()

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="bg-navy text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            The Network
          </h1>
          <p className="text-white/60 text-lg max-w-2xl">
            Every lodge on Tyrian. Browse listings, open requests, and verified members from lodges across the country.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {lodges.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-lg font-semibold text-navy mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              The network is growing.
            </p>
            <p className="text-muted mb-6">Your lodge could be the first.</p>
            <Link
              href="/join"
              className="inline-flex bg-gold hover:bg-gold-dark text-navy font-bold px-6 py-3 rounded-xl transition-colors"
            >
              Unlock your lodge →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {lodges.map(lodge => (
              <LodgeCard key={lodge.id} lodge={lodge} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
