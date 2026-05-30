import Link from 'next/link'
import { notFound } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ListingCard from '@/components/directory/ListingCard'
import RequestCard from '@/components/requests/RequestCard'
import { MemberCard } from '@/components/lodge/LodgeCard'
import LodgeAvatar from '@/components/ui/LodgeAvatar'
import FoundingLodgeBadge from '@/components/brand/FoundingLodgeBadge'
import { createClient } from '@/lib/supabase/server'
import { dbListingToListing, DB_LISTING_SELECT, type DbListingRow } from '@/lib/db/listings'
import { DB_REQUEST_SELECT, dbRequestToServiceRequest } from '@/lib/db/requests'

interface PageProps {
  params: { slug: string }
}

async function getLodge(slug: string) {
  const supabase = createClient()
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  let query = supabase
    .from('lodges')
    .select('id, name, number, city, state, tier, slug, paid_at, welcome_message, website, meeting_schedule, meeting_address, directory_id')
    .eq('status', 'active')

  if (uuidPattern.test(slug)) {
    query = query.eq('id', slug)
  } else {
    query = query.eq('slug', slug)
  }

  const { data } = await query.maybeSingle()
  return data
}

export async function generateMetadata({ params }: PageProps) {
  const lodge = await getLodge(params.slug)
  if (!lodge) return { title: 'Lodge not found · Tyrian' }

  const location = lodge.city ? `${lodge.city}, ${lodge.state}` : lodge.state
  return {
    title: `${lodge.name} #${lodge.number} · ${location} | Tyrian`,
    description: `Browse verified professionals, open service requests, and members from ${lodge.name} on Tyrian — the professional network for Freemasons.`,
  }
}

export default async function LodgeCommunityPage({ params }: PageProps) {
  const supabase = createClient()
  const lodge = await getLodge(params.slug)
  if (!lodge) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  let viewerProfile: {
    id: string
    lodge_id: string | null
    verification_status: string
  } | null = null

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('id, lodge_id, verification_status')
      .eq('id', user.id)
      .maybeSingle()
    viewerProfile = data
  }

  const isOwnLodge = viewerProfile?.lodge_id === lodge.id
  const isVerifiedViewer = viewerProfile?.verification_status === 'verified'

  const { data: memberRows } = await supabase
    .from('profiles')
    .select('id, full_name, trade_category, occupation, visibility')
    .eq('lodge_id', lodge.id)
    .eq('verification_status', 'verified')
    .order('full_name')

  const memberIds = (memberRows || []).map(m => m.id)

  let listings: ReturnType<typeof dbListingToListing>[] = []
  if (memberIds.length) {
    const { data: listingRows } = await supabase
      .from('listings')
      .select(DB_LISTING_SELECT)
      .in('profile_id', memberIds)
      .eq('is_active', true)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .limit(6)

    listings = (listingRows || []).map(row => dbListingToListing(row as unknown as DbListingRow))
  }

  const { data: requestRows } = await supabase
    .from('requests')
    .select(DB_REQUEST_SELECT)
    .eq('lodge_id', lodge.id)
    .in('status', ['open', 'active'])
    .order('created_at', { ascending: false })
    .limit(4)

  const requests = (requestRows || []).map(dbRequestToServiceRequest)

  const { data: memberListings } = memberIds.length
    ? await supabase.from('listings').select('id, profile_id').in('profile_id', memberIds).eq('is_active', true)
    : { data: [] }

  const listingByProfile = new Map((memberListings || []).map(l => [l.profile_id, l.id]))

  const visibleMembers = (memberRows || []).filter(m => {
    if (m.visibility === 'public') return true
    return isVerifiedViewer
  })

  const joinedDate = lodge.paid_at
    ? new Date(lodge.paid_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  const lodgeSlug = lodge.slug ?? lodge.id

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="bg-navy text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <LodgeAvatar number={lodge.number} tier={lodge.tier} size="lg" />
              <div>
              <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                {lodge.name}
              </h1>
              <p className="text-white/60">
                #{lodge.number} · {lodge.city ? `${lodge.city}, ` : ''}{lodge.state}
              </p>
              {(lodge.meeting_schedule || lodge.meeting_address) && (
                <p className="text-sm text-white/50 mt-2">
                  {lodge.meeting_schedule}
                  {lodge.meeting_schedule && lodge.meeting_address && ' · '}
                  {lodge.meeting_address}
                </p>
              )}
              {lodge.website && (
                <a
                  href={lodge.website.startsWith('http') ? lodge.website : `https://${lodge.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#C9A84C] hover:underline mt-1 inline-block"
                >
                  {lodge.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-white/70">
                {lodge.tier === 'founding' && (
                  <FoundingLodgeBadge variant="inline" />
                )}
                <span>{visibleMembers.length} verified members</span>
                <span>·</span>
                <span>{listings.length}{listings.length >= 6 ? '+' : ''} listings</span>
                {joinedDate && (
                  <>
                    <span>·</span>
                    <span>On Tyrian since {joinedDate}</span>
                  </>
                )}
              </div>
              {isOwnLodge && (
                <p className="mt-3 text-sm text-[#2D6A4F] font-semibold">✓ Your lodge</p>
              )}
              </div>
            </div>
            <Link
              href={`/admin`}
              className="text-sm text-white/60 hover:text-white underline hidden"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-12">
        {/* Listings */}
        <section>
          <h2 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Verified Professionals
          </h2>
          {listings.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map(l => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
              <Link
                href={`/directory?lodge=${lodge.id}`}
                className="inline-block mt-6 text-sm font-semibold text-navy hover:text-gold transition-colors"
              >
                View all listings from this lodge →
              </Link>
            </>
          ) : (
            <p className="text-muted text-sm">
              No listings yet. Members of this lodge haven&apos;t listed their businesses yet.
            </p>
          )}
        </section>

        {/* Requests */}
        <section>
          <h2 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Open Requests
          </h2>
          {requests.length > 0 ? (
            <>
              <div className="space-y-3 max-w-3xl">
                {requests.map(r => (
                  <RequestCard key={r.id} request={r} isLoggedIn={!!user} />
                ))}
              </div>
              <Link
                href={`/requests?lodge=${lodge.id}`}
                className="inline-block mt-6 text-sm font-semibold text-navy hover:text-gold transition-colors"
              >
                View all requests from this lodge →
              </Link>
            </>
          ) : (
            <p className="text-muted text-sm">No open requests from this lodge right now.</p>
          )}
        </section>

        {/* Members */}
        <section>
          <h2 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Verified Members ({visibleMembers.length})
          </h2>
          {!user ? (
            <div className="bg-stone rounded-2xl border border-[#E5E0D5] p-8 text-center">
              <p className="text-muted mb-3">{visibleMembers.length} verified members</p>
              <Link href="/login" className="text-sm font-semibold text-navy underline">
                Sign in to see members →
              </Link>
            </div>
          ) : !isVerifiedViewer ? (
            <div className="bg-stone rounded-2xl border border-[#E5E0D5] p-8 text-center">
              <p className="text-muted">Verify your membership to see lodge members.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleMembers.map(m => (
                <MemberCard
                  key={m.id}
                  name={m.full_name || 'Member'}
                  trade={m.trade_category}
                  occupation={m.occupation}
                  hasListing={listingByProfile.has(m.id)}
                  listingId={listingByProfile.get(m.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Contextual CTA */}
        <section className="bg-white rounded-2xl border border-[#E5E0D5] p-6">
          {!user ? (
            <>
              <p className="font-semibold text-navy mb-2">Are you a member of this lodge?</p>
              <p className="text-sm text-muted mb-4">
                Join through your lodge&apos;s invite form. You&apos;ll need a sponsor to confirm your membership.
              </p>
              <Link
                href={`/join/${lodgeSlug}`}
                className="inline-flex bg-navy text-[#C9A84C] font-bold px-5 py-2.5 rounded-xl text-sm"
              >
                Join your lodge →
              </Link>
            </>
          ) : isOwnLodge && listings.every(l => l.id) ? (
            <>
              <p className="font-semibold text-navy mb-2">You&apos;re a member of this lodge.</p>
              <p className="text-sm text-muted mb-4">List your business or services and let your brothers find you.</p>
              <Link href="/dashboard/listing/new" className="text-sm font-semibold text-navy underline">
                Create your listing →
              </Link>
            </>
          ) : isVerifiedViewer && !isOwnLodge ? (
            <>
              <p className="font-semibold text-navy mb-2">Know someone in this lodge?</p>
              <p className="text-sm text-muted mb-4">Share their invite link.</p>
              <Link href={`/join/${lodgeSlug}`} className="text-sm font-semibold text-navy underline">
                Member join link →
              </Link>
            </>
          ) : null}
        </section>
      </div>

      <Footer />
    </div>
  )
}
