'use client'
import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Eye, Users, Share2, Edit3, Lock, Globe, Copy,
  TrendingUp, MessageSquare, ShieldCheck, ChevronRight,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import VerifiedBadge from '@/components/directory/VerifiedBadge'
import VerificationStatusCard from '@/components/member/VerificationStatusCard'
import CategoryBadge from '@/components/directory/CategoryBadge'
import { getMemberAccessState } from '@/lib/auth/member-access'
import type { MemberAccessState } from '@/lib/auth/member-access'
import { responseStatusLabel } from '@/components/requests/ResponseCard'
import StarRating from '@/components/directory/StarRating'
import { createClient } from '@/lib/supabase/client'
import { useDemoMode } from '@/lib/demo/context'
import { demoUser, demoListings } from '@/lib/demo/data'
import { getDemoListingBySlug } from '@/lib/demo/listings'
import { computeProfileCompletion } from '@/lib/profile/completion'
import MyRequestsSection, { type MyRequestRow } from '@/components/dashboard/MyRequestsSection'
import RequestEmailsToggle from '@/components/dashboard/RequestEmailsToggle'
import PendingReviewsSection from '@/components/dashboard/PendingReviewsSection'
import DashboardReviewLauncher from '@/components/dashboard/DashboardReviewLauncher'
import { getAuthHeaders } from '@/lib/supabase/auth-headers'
import type { Listing, PendingReviewTarget, TradeCategory } from '@/lib/types'

interface DbListing {
  id: string
  business_name: string
  trade_category: string
  description: string | null
  phone: string | null
  google_rating: number | null
  google_rating_count: number | null
  member_rating: number | null
  member_review_count: number | null
  views_count: number
}

interface DisplayUser {
  fullName: string
  email: string
  lodge: string
  lodgeNumber: string
  lodgeSlug: string | null
  location: string
  listingSlug: string | null
  referralCode: string
}

const DEMO_DISPLAY_USER: DisplayUser = {
  fullName: demoUser.full_name,
  email: demoUser.email,
  lodge: demoUser.lodge_name,
  lodgeNumber: demoUser.lodge_number,
  lodgeSlug: 'acacia-lodge-123',
  location: `${demoUser.city}, ${demoUser.state}`,
  listingSlug: 'plumb-line-plumbing',
  referralCode: demoUser.referral_code,
}

interface SentResponse {
  id: string
  message: string | null
  status: string
  created_at: string
  request: {
    id: string
    title: string
    posted_by_name: string
    city: string
    state: string
    lodge_display: string | null
    status: string
  } | null
}

const DEMO_MY_REQUESTS: MyRequestRow[] = [
  {
    id: 'demo-my-request',
    title: 'Need electrician for panel upgrade — 200 amp service',
    category: 'Electrical',
    city: 'Tulsa',
    state: 'OK',
    status: 'active',
    responses_count: 2,
    new_responses_count: 1,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

const DEMO_SENT_RESPONSES: SentResponse[] = [
  {
    id: 'demo-resp-1',
    message: 'Happy to help with this — I specialize in bathroom remodels across Tulsa.',
    status: 'viewed',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    request: {
      id: '2',
      title: 'Licensed plumber for bathroom remodel',
      posted_by_name: 'M. Torres',
      city: 'Tulsa',
      state: 'OK',
      lodge_display: 'Acacia Lodge #123',
      status: 'active',
    },
  },
]

function formatRespondedAt(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(ms / (1000 * 60 * 60))
  if (hours < 24) return hours < 1 ? 'Just now' : `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

const MOCK_LEADS = [
  { id: 1, name: 'Patricia Monroe', email: 'p.monroe@email.com', message: 'Interested in getting a quote for a bathroom remodel.', date: '2 days ago', source: 'Direct' },
  { id: 2, name: 'David Kowalski', email: 'dkowalski@email.com', message: 'My neighbor recommended you. Can we schedule an estimate?', date: '4 days ago', source: 'Referral' },
  { id: 3, name: 'Sunrise Properties LLC', email: 'info@sunriseprops.com', message: 'We have 3 properties that need plumbing work. Looking for a partner.', date: '1 week ago', source: 'Directory' },
]

export default function DashboardPage() {
  const { isDemoMode } = useDemoMode()
  const [displayUser, setDisplayUser] = useState<DisplayUser | null>(null)
  const [dbListing, setDbListing] = useState<DbListing | null>(null)
  const [accessState, setAccessState] = useState<MemberAccessState>('unaffiliated')
  const [sentResponses, setSentResponses] = useState<SentResponse[]>([])
  const [myRequests, setMyRequests] = useState<MyRequestRow[]>([])
  const [pendingReviews, setPendingReviews] = useState<PendingReviewTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [profileFields, setProfileFields] = useState<{
    city: string | null
    state: string | null
    tradeCategory: string | null
    occupation: string | null
  } | null>(null)

  useEffect(() => {
    if (isDemoMode) {
      setDisplayUser(DEMO_DISPLAY_USER)
      setMyRequests(DEMO_MY_REQUESTS)
      setSentResponses(DEMO_SENT_RESPONSES)
      setLoading(false)
      return
    }

    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        window.location.href = '/login'
        return
      }

      const [{ data: profile }, { data: listingRow }] = await Promise.all([
        supabase
          .from('profiles')
          .select(
            'full_name, city, state, referral_code, lodge_id, verification_status, trade_category, occupation'
          )
          .eq('id', user.id)
          .single(),
        supabase
          .from('listings')
          .select(
            'id, business_name, trade_category, description, phone, google_rating, google_rating_count, member_rating, member_review_count, views_count'
          )
          .eq('profile_id', user.id)
          .eq('is_active', true)
          .maybeSingle(),
      ])

      let lodgeName = ''
      let lodgeNumber = ''
      let lodgeSlug: string | null = null
      let paidByName: string | null = null

      if (profile?.lodge_id) {
        const { data: lodgeRow } = await supabase
          .from('lodges')
          .select('name, number, slug, paid_by_name')
          .eq('id', profile.lodge_id)
          .maybeSingle()
        if (lodgeRow) {
          lodgeName = lodgeRow.name
          lodgeNumber = lodgeRow.number
          lodgeSlug = lodgeRow.slug
          if (!profile?.full_name?.trim()) paidByName = lodgeRow.paid_by_name ?? null
        }
      }

      if (listingRow) setDbListing(listingRow as DbListing)

      setProfileFields({
        city: profile?.city ?? null,
        state: profile?.state ?? null,
        tradeCategory: profile?.trade_category ?? null,
        occupation: profile?.occupation ?? null,
      })

      const metaName =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        ''

      setDisplayUser({
        fullName:
          profile?.full_name?.trim() ||
          metaName.trim() ||
          paidByName?.trim() ||
          'Member',
        email: user.email ?? '',
        lodge: lodgeName,
        lodgeNumber,
        lodgeSlug,
        location: profile ? [profile.city, profile.state].filter(Boolean).join(', ') : '',
        listingSlug: listingRow ? listingRow.id : null,
        referralCode: profile?.referral_code ?? '',
      })
      setAccessState(
        isDemoMode
          ? 'verified'
          : getMemberAccessState({
              lodge_id: profile?.lodge_id ?? null,
              verification_status: profile?.verification_status ?? 'pending',
            })
      )

      getAuthHeaders().then((authHeaders) => {
        const fetchOpts: RequestInit = { credentials: 'include', headers: authHeaders }

        fetch('/api/me/requests', fetchOpts)
          .then((r) => (r.ok ? r.json() : { requests: [] }))
          .then((data) => setMyRequests(data.requests ?? []))
          .catch(() => setMyRequests([]))

        if (profile?.verification_status === 'verified') {
          fetch('/api/me/responses', fetchOpts)
            .then((r) => (r.ok ? r.json() : { responses: [] }))
            .then((data) => setSentResponses(data.responses ?? []))
            .catch(() => setSentResponses([]))

          fetch('/api/me/pending-reviews', fetchOpts)
            .then((r) => (r.ok ? r.json() : { targets: [] }))
            .then((data) => setPendingReviews(data.targets ?? []))
            .catch(() => setPendingReviews([]))
        }
      })

      setLoading(false)
    })
  }, [isDemoMode])

  const listing: Listing | undefined = displayUser?.listingSlug
    ? getDemoListingBySlug(displayUser.listingSlug)
    : undefined

  const demoListing = isDemoMode
    ? demoListings.find(l => l.slug === 'plumb-line-plumbing')
    : null

  const completion = useMemo(() => {
    if (!displayUser) {
      return computeProfileCompletion({
        fullName: '',
        hasActiveListing: false,
      })
    }
    if (isDemoMode) {
      return computeProfileCompletion({
        fullName: displayUser.fullName,
        city: demoUser.city,
        state: demoUser.state,
        tradeCategory: demoUser.trade_category,
        occupation: 'Plumber',
        hasActiveListing: true,
        listingHasDescription: true,
        listingHasPhone: true,
      })
    }
    const result = computeProfileCompletion({
      fullName: displayUser.fullName,
      city: profileFields?.city,
      state: profileFields?.state,
      tradeCategory: profileFields?.tradeCategory,
      occupation: profileFields?.occupation,
      hasActiveListing: !!dbListing,
      listingHasDescription: !!dbListing?.description?.trim(),
      listingHasPhone: !!dbListing?.phone?.trim(),
    })
    if (dbListing?.id) {
      const details = result.steps.find(s => s.id === 'listing_details')
      if (details && !details.done) {
        details.href = `/dashboard/listing/edit/${dbListing.id}`
      }
    }
    return result
  }, [isDemoMode, displayUser, profileFields, dbListing])

  const listingViews = isDemoMode ? 312 : (dbListing?.views_count ?? 0)

  const stats = [
    {
      label: 'Listing views',
      value: isDemoMode ? '312' : String(listingViews),
      delta: isDemoMode ? 'demo data' : listingViews > 0 ? 'all time' : 'not tracked yet',
      icon: Eye,
    },
    {
      label: 'Referrals received',
      value: isDemoMode ? '17' : '0',
      delta: isDemoMode ? 'demo data' : 'tracking not live yet',
      icon: Users,
    },
    {
      label: 'Profile completion',
      value: `${completion.percent}%`,
      delta: completion.isComplete
        ? 'Profile complete'
        : completion.nextStep?.label ?? completion.summary,
      icon: TrendingUp,
      href: completion.isComplete ? undefined : completion.nextStep?.href,
    },
  ]

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center bg-stone">
          <div className="w-8 h-8 border-2 border-navy border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    )
  }

  if (!displayUser) return null

  const canList = isDemoMode || accessState === 'verified'

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <Suspense fallback={null}>
        <DashboardReviewLauncher />
      </Suspense>

      <div className="bg-navy text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-white/50 text-sm mb-1">Welcome back,</p>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {displayUser.fullName || displayUser.email}
          </h1>
          {displayUser.lodge && (
            <p className="text-white/60 mt-1 text-sm">
              {displayUser.lodge}{displayUser.lodgeNumber ? ` #${displayUser.lodgeNumber}` : ''}{displayUser.location ? ` · ${displayUser.location}` : ''}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {stats.map(({ label, value, delta, icon: Icon, href }) => {
            const inner = (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted font-medium">{label}</p>
                  <div className="w-9 h-9 rounded-full bg-navy/5 flex items-center justify-center">
                    <Icon size={18} className="text-navy" />
                  </div>
                </div>
                <div
                  className="text-3xl font-bold text-navy"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {value}
                </div>
                <p className={`text-xs mt-1 ${completion.isComplete && label === 'Profile completion' ? 'text-muted' : 'text-[#2D6A4F]'}`}>
                  {delta}
                </p>
              </>
            )
            if (href) {
              return (
                <Link
                  key={label}
                  href={href}
                  className="block bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-5 hover:border-gold/40 hover:shadow-md transition-all"
                >
                  {inner}
                </Link>
              )
            }
            return (
              <div key={label} className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-5">
                {inner}
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Listing card */}
            {(listing || demoListing || dbListing) ? (
              <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2
                    className="text-xl font-bold text-navy"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    Your listing
                  </h2>
                  <Link
                    href={`/directory/${listing?.slug ?? demoListing?.slug ?? dbListing?.id}`}
                    className="text-sm text-muted hover:text-navy transition-colors"
                  >
                    Preview Public Profile →
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <CategoryBadge trade={(listing?.trade ?? demoListing?.trade_category ?? dbListing?.trade_category) as TradeCategory} size="sm" />
                  {canList && <VerifiedBadge size="sm" />}
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    <Globe size={11} />
                    Public
                  </span>
                </div>

                <h3
                  className="text-xl font-bold text-navy"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {listing?.businessName ?? demoListing?.business_name ?? dbListing?.business_name}
                </h3>
                <p className="text-muted text-sm mt-0.5 mb-3">
                  {listing?.ownerName ?? demoListing?.owner_name ?? displayUser.fullName}
                </p>

                {listing && (
                  <StarRating
                    rating={listing.memberRating}
                    reviewCount={listing.memberReviewCount}
                    hideWhenEmpty
                  />
                )}
                {demoListing && !listing && (
                  <StarRating
                    rating={5}
                    reviewCount={3}
                  />
                )}
                {dbListing && !listing && !demoListing && (
                  <StarRating
                    rating={dbListing.member_rating ?? 0}
                    reviewCount={dbListing.member_review_count ?? 0}
                    hideWhenEmpty
                  />
                )}

                <p className="text-sm text-muted mt-3 line-clamp-2 leading-relaxed">
                  {listing?.description ?? demoListing?.description ?? dbListing?.description ?? ''}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/dashboard/listing/edit/${listing?.slug ?? dbListing?.id}`}
                    className="inline-flex items-center gap-2 bg-navy text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-navy/90 transition-colors"
                  >
                    <Edit3 size={15} />
                    Edit Listing
                  </Link>
                  <button className="inline-flex items-center gap-2 border border-[#E5E0D5] text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-stone transition-colors">
                    <Lock size={15} />
                    Members only
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 text-center">
                <ShieldCheck size={36} className="text-navy/20 mx-auto mb-3" />
                <h3
                  className="text-lg font-bold text-navy mb-1"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  No listing yet
                </h3>
                <p className="text-sm text-muted mb-4">
                  {canList
                    ? 'Create your business listing to appear in the Tyrian directory.'
                    : accessState === 'pending'
                      ? 'Your listing will be available once your sponsor confirms your membership.'
                      : 'Join a lodge on Tyrian to create a verified business listing.'}
                </p>
                {canList ? (
                  <Link
                    href="/dashboard/listing/new"
                    className="inline-flex items-center gap-2 bg-navy text-[#C9A84C] text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-navy/90 transition-colors"
                  >
                    Create your listing
                  </Link>
                ) : (
                  <Link
                    href={accessState === 'unaffiliated' ? '/network' : '/dashboard'}
                    className="inline-flex items-center gap-2 border border-[#E5E0D5] text-navy text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-stone transition-colors"
                  >
                    {accessState === 'unaffiliated' ? 'Find your lodge' : 'View verification status'}
                  </Link>
                )}
              </div>
            )}

            {!isDemoMode && pendingReviews.length > 0 && (
              <PendingReviewsSection targets={pendingReviews} />
            )}

            <MyRequestsSection requests={myRequests} demoMode={isDemoMode} />

            <RequestEmailsToggle demoMode={isDemoMode} />

            {/* Your responses */}
            {(isDemoMode || accessState === 'verified') && (
              <div id="your-responses" className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2
                    className="text-xl font-bold text-navy"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    Your responses
                  </h2>
                  <Link href="/requests" className="text-sm text-muted hover:text-navy transition-colors">
                    Browse requests →
                  </Link>
                </div>
                {sentResponses.length > 0 ? (
                  <div className="space-y-4">
                    {sentResponses.map((row) => (
                      <div key={row.id} className="pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                        <p className="font-semibold text-sm text-navy">
                          &ldquo;{row.request?.title ?? 'Request'}&rdquo;
                        </p>
                        {row.request && (
                          <p className="text-xs text-muted mt-1">
                            {row.request.posted_by_name}
                            {row.request.lodge_display ? ` · ${row.request.lodge_display}` : ''}
                            {' · '}
                            {row.request.city}, {row.request.state}
                          </p>
                        )}
                        <p className="text-xs text-muted mt-1">
                          Responded {formatRespondedAt(row.created_at)} · Status:{' '}
                          {responseStatusLabel(row.status)}
                        </p>
                        {row.status === 'accepted' && (
                          <p className="text-xs text-trust font-medium mt-2">
                            ✓ They&apos;re interested. Reach out to close the job.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted text-center py-4">
                    You haven&apos;t responded to any requests yet.{' '}
                    <Link href="/requests" className="text-navy underline">
                      Find open requests →
                    </Link>
                  </p>
                )}
              </div>
            )}

            {/* Recent inquiries */}
            <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2
                  className="text-xl font-bold text-navy"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Recent inquiries
                </h2>
                {isDemoMode && (
                  <span className="text-xs bg-[#C9A84C]/10 text-[#9A7A2C] font-semibold px-2.5 py-1 rounded-full">
                    {MOCK_LEADS.length} new
                  </span>
                )}
              </div>
              {isDemoMode ? (
                <div className="space-y-4">
                  {MOCK_LEADS.map(lead => (
                    <div key={lead.id} className="flex items-start gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                      <div className="w-9 h-9 rounded-full bg-navy/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <MessageSquare size={16} className="text-navy" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{lead.name}</span>
                          <span className="text-xs text-muted">{lead.date}</span>
                        </div>
                        <p className="text-xs text-muted mt-0.5 mb-1">{lead.email}</p>
                        <p className="text-sm text-[#1A1A1A] line-clamp-2">{lead.message}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${
                          lead.source === 'Referral' ? 'bg-[#2D6A4F]/10 text-[#2D6A4F]' : 'bg-gray-100 text-gray-500'
                        }`}>
                          via {lead.source}
                        </span>
                      </div>
                      <ChevronRight size={16} className="text-muted flex-shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted text-center py-6">
                  Inquiries will appear here once your listing is live.
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Referral link */}
            <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-5">
              <div className="flex items-center gap-2 mb-1">
                <Share2 size={16} className="text-[#C9A84C]" />
                <h3 className="font-semibold text-navy text-sm">Grow the network</h3>
              </div>
              <p className="text-xs text-muted mb-3 leading-relaxed">
                Know a fellow lodge member with a business? Invite them to list on Tyrian.
              </p>
              <p className="text-xs text-muted mb-1.5 font-medium">Your referral link:</p>
              <div className="flex items-center gap-2 bg-stone rounded-lg px-3 py-2">
                <span className="text-xs text-muted flex-1 truncate font-mono">
                  tyrian.work/join?ref={displayUser.referralCode || 'loading'}
                </span>
                <button
                  onClick={() => navigator.clipboard.writeText(`https://tyrian.work/join?ref=${displayUser.referralCode}`)}
                  className="flex-shrink-0 text-navy hover:text-[#C9A84C] transition-colors"
                >
                  <Copy size={14} />
                </button>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(`https://tyrian.work/join?ref=${displayUser.referralCode}`)}
                className="mt-3 w-full bg-navy hover:bg-navy/90 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                Copy referral link
              </button>
            </div>

            {/* Verification status */}
            <VerificationStatusCard
              state={accessState}
              lodgeName={displayUser.lodge || undefined}
              lodgeNumber={displayUser.lodgeNumber || undefined}
            />

            {!completion.isComplete && (
              <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-5">
                <h3 className="font-semibold text-navy text-sm mb-3">Profile completion</h3>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                  <div
                    className="bg-[#2D6A4F] h-2 rounded-full transition-all"
                    style={{ width: `${completion.percent}%` }}
                  />
                </div>
                <ul className="space-y-2 mb-3">
                  {completion.steps.map(step => (
                    <li key={step.id} className="flex items-start gap-2 text-xs">
                      <span className={step.done ? 'text-trust' : 'text-muted'}>
                        {step.done ? '✓' : '○'}
                      </span>
                      {step.href && !step.done ? (
                        <Link href={step.href} className="text-navy font-medium hover:underline">
                          {step.label}
                        </Link>
                      ) : (
                        <span className={step.done ? 'text-muted line-through' : 'text-[#1A1A1A]'}>
                          {step.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted">{completion.summary}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
