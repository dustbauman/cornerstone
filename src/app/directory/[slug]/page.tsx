import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Phone, Mail, Globe, CheckCircle2, Share2, Users, ShieldCheck } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import VerifiedBadge from '@/components/directory/VerifiedBadge'
import CategoryBadge from '@/components/directory/CategoryBadge'
import StarRating from '@/components/directory/StarRating'
import ListingCard from '@/components/directory/ListingCard'
import { getDemoListingBySlug, getDemoRelatedListings, demoListingSlugs } from '@/lib/demo/listings'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { dbListingToListing, DB_LISTING_SELECT } from '@/lib/db/listings'
import type { DbListingRow } from '@/lib/db/listings'
import type { Listing } from '@/lib/types'

interface Props {
  params: { slug: string }
}

// Plain client for use in generateStaticParams and generateMetadata (no cookies needed)
function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function getListing(slug: string): Promise<Listing | null> {
  const demo = getDemoListingBySlug(slug)
  if (demo) return demo
  const supabase = adminClient()
  const { data } = await supabase
    .from('listings')
    .select(DB_LISTING_SELECT)
    .eq('id', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (data) return dbListingToListing(data as unknown as DbListingRow)
  return null
}

export async function generateStaticParams() {
  const demo = demoListingSlugs.map(slug => ({ slug }))

  try {
    const supabase = adminClient()
    const { data } = await supabase
      .from('listings')
      .select('id')
      .eq('is_active', true)
      .eq('visibility', 'public')

    const dbSlugs = (data ?? []).map(l => ({ slug: l.id }))
    return [...demo, ...dbSlugs]
  } catch {
    return demo
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await getListing(params.slug)
  if (!listing) return {}

  return {
    title: `${listing.businessName} · Verified Masonic ${listing.trade} in ${listing.location.city}, ${listing.location.stateCode} | Tyrian`,
    description: `${listing.ownerName} is a lodge-verified Masonic ${listing.trade.toLowerCase()} professional in ${listing.location.city}, ${listing.location.stateCode}. Verified through ${listing.lodge} #${listing.lodgeNumber}. Trusted by the Masonic network.`,
    openGraph: {
      title: `${listing.businessName} | Tyrian`,
      description: `Lodge-verified ${listing.trade.toLowerCase()} in ${listing.location.city}, ${listing.location.stateCode}`,
    },
  }
}

export default async function BusinessProfilePage({ params }: Props) {
  const listing = await getListing(params.slug)
  if (!listing) notFound()

  const related = getDemoRelatedListings(listing)

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Breadcrumb */}
        <nav className="inline-flex items-center gap-1.5 text-sm text-muted mb-6">
          <Link href="/directory" className="hover:text-navy transition-colors">Directory</Link>
          <span className="text-gray-300">›</span>
          <span className="text-muted">{listing.trade}</span>
          <span className="text-gray-300">›</span>
          <span className="text-[#1A1A1A] font-medium">{listing.businessName}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header card */}
            <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 md:p-8">
              <div className="flex flex-wrap items-start gap-3 mb-5">
                <CategoryBadge trade={listing.trade} />
                <VerifiedBadge size="md" />
              </div>

              <h1
                className="text-3xl md:text-4xl font-bold text-navy mb-1"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {listing.businessName}
              </h1>
              <p className="text-muted text-lg mb-1">{listing.ownerName}</p>
              <p className="text-sm text-muted mb-4">
                Member since {new Date(listing.joinedDate).getFullYear()}
              </p>

              <StarRating rating={listing.rating} reviewCount={listing.reviewCount} size={16} />

              <div className="mt-5 flex flex-wrap gap-4 text-sm text-muted">
                <span className="flex items-center gap-1.5">
                  <MapPin size={15} className="text-[#C9A84C]" />
                  {listing.location.city}, {listing.location.state}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={15} className="text-[#C9A84C]" />
                  {listing.lodge} #{listing.lodgeNumber} · {listing.location.city}, {listing.location.stateCode}
                </span>
              </div>
            </div>

            {/* Verification */}
            <div className="bg-[#2D6A4F]/5 border border-[#2D6A4F]/15 rounded-2xl p-5 flex items-start gap-3">
              <ShieldCheck size={18} className="text-[#2D6A4F] flex-shrink-0 mt-0.5" />
              <div>
                <p className="italic text-sm text-[#2D6A4F]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Lodge-verified member in good standing.
                </p>
                <p className="text-sm text-muted mt-0.5">Confirmed by a lodge sponsor and accountable to their Masonic community.</p>
              </div>
            </div>

            {/* About */}
            <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 md:p-8">
              <h2
                className="text-xl font-bold text-navy mb-4"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                About {listing.businessName}
              </h2>
              <p className="text-[#1A1A1A] leading-relaxed">{listing.description}</p>
            </div>

            {/* Services */}
            {listing.services.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 md:p-8">
                <h2
                  className="text-xl font-bold text-navy mb-4"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Services
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {listing.services.map(service => (
                    <li key={service} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle2 size={16} className="text-[#2D6A4F] flex-shrink-0" />
                      <span>{service}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Map */}
            <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm overflow-hidden">
              <div className="px-6 pt-6 pb-4">
                <h2
                  className="text-xl font-bold text-navy"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Location
                </h2>
                <p className="text-sm text-muted mt-1">{listing.location.city}, {listing.location.state}</p>
              </div>
              <div className="w-full h-56">
                <iframe
                  width="100%" height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU3e5o&q=${encodeURIComponent(listing.location.city + ', ' + listing.location.state)}`}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Contact */}
            <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6">
              <h3
                className="text-lg font-bold text-navy mb-4"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Get in touch
              </h3>
              <div className="space-y-3">
                {listing.phone && (
                  <a href={`tel:${listing.phone}`} className="flex items-center gap-3 text-sm hover:text-navy transition-colors group">
                    <div className="w-9 h-9 rounded-full bg-navy/5 flex items-center justify-center group-hover:bg-[#C9A84C]/10 transition-colors">
                      <Phone size={15} className="text-navy" />
                    </div>
                    <span>{listing.phone}</span>
                  </a>
                )}
                {listing.email && (
                  <a href={`mailto:${listing.email}`} className="flex items-center gap-3 text-sm hover:text-navy transition-colors group">
                    <div className="w-9 h-9 rounded-full bg-navy/5 flex items-center justify-center group-hover:bg-[#C9A84C]/10 transition-colors">
                      <Mail size={15} className="text-navy" />
                    </div>
                    <span className="truncate">{listing.email}</span>
                  </a>
                )}
                {listing.website && (
                  <a href={listing.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm hover:text-navy transition-colors group">
                    <div className="w-9 h-9 rounded-full bg-navy/5 flex items-center justify-center group-hover:bg-[#C9A84C]/10 transition-colors">
                      <Globe size={15} className="text-navy" />
                    </div>
                    <span className="truncate">{listing.website.replace('https://', '')}</span>
                  </a>
                )}
              </div>

              <button className="mt-5 w-full bg-[#C9A84C] hover:bg-[#b8943d] text-navy font-bold py-3 rounded-xl transition-colors text-sm">
                Contact {listing.ownerName.split(' ')[listing.ownerName.split(' ').length - 1]} →
              </button>
              <p className="text-xs text-muted text-center mt-2">
                Tyrian members are verified professionals accountable to their lodge community.
              </p>
            </div>

            {/* Verified info */}
            <div className="bg-[#2D6A4F]/5 border border-[#2D6A4F]/15 rounded-2xl p-5">
              <VerifiedBadge size="sm" />
              <p className="text-sm text-[#1A1A1A] mt-3 leading-relaxed">
                <span className="font-semibold">{listing.ownerName}</span> is a confirmed member of{' '}
                <span className="font-semibold">{listing.lodge} #{listing.lodgeNumber}</span>.
                Membership verified by lodge sponsor.
              </p>
              <p className="text-xs text-muted mt-2">
                Member since {new Date(listing.joinedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Referral */}
            <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-5">
              <div className="flex items-center gap-2 mb-2">
                <Share2 size={16} className="text-[#C9A84C]" />
                <h4 className="font-semibold text-navy text-sm">Referred by a member?</h4>
              </div>
              <p className="text-xs text-muted leading-relaxed mb-3">
                If a Tyrian member sent you here, mention their name when you reach out. Referrals are tracked and credited within the network.
              </p>
              <button className="text-xs text-navy font-semibold border border-navy/20 rounded-lg px-3 py-1.5 hover:bg-navy/5 transition-colors w-full">
                Enter Referral Code
              </button>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-12">
            <h2
              className="text-2xl font-bold text-navy mb-6"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Other verified professionals in {listing.location.state}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {related.map(r => (
                <ListingCard key={r.id} listing={r} />
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
