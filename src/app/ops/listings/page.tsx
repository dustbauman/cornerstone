import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { ChevronLeft } from 'lucide-react'
import ListingsOpsTable, { type ListingRow } from './ListingsOpsTable'

export const dynamic = 'force-dynamic'

export default async function OpsListings() {
  const result = await requirePlatformAdmin()
  if ('error' in result) redirect('/ops/login')

  const { admin } = result

  const { data: rows } = await admin
    .from('listings')
    .select(`
      id, business_name, trade_category, city, state, is_active, created_at,
      profiles:profile_id ( full_name, email, lodge_id,
        lodges:lodge_id ( name, number )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="bg-navy text-white py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/ops" className="inline-flex items-center gap-1 text-white/50 hover:text-white text-xs mb-3 transition-colors">
            <ChevronLeft size={14} /> Ops Dashboard
          </Link>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Listings
          </h1>
          <p className="text-white/60 mt-1 text-sm">Deactivate or reactivate member listings.</p>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <ListingsOpsTable rows={(rows ?? []) as unknown as ListingRow[]} />
      </div>
      <Footer />
    </div>
  )
}
