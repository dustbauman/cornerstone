'use client'

import { useState, useMemo, useEffect, Suspense, useCallback } from 'react'
import Link from 'next/link'
import { Search, SlidersHorizontal, Loader2 } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ListingCard from '@/components/directory/ListingCard'
import ActiveFilterChips from '@/components/requests/ActiveFilterChips'
import GuestBrowseSettingsModal from '@/components/requests/GuestBrowseSettingsModal'
import { CATEGORIES } from '@/lib/constants/categories'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDemoMode } from '@/lib/demo/context'
import { demoListings } from '@/lib/demo/data'
import {
  dbListingToListing,
  demoListingToListing,
  DB_LISTING_SELECT,
  STATE_CODE_TO_NAME,
  isVerifiedPublicListing,
} from '@/lib/db/listings'
import type { DbListingRow } from '@/lib/db/listings'
import type { Listing } from '@/lib/types'
import { haversineDistance } from '@/lib/geo/scoring'
import {
  DEFAULT_GUEST_AREA,
  resolveGuestArea,
  saveGuestAreaPrefs,
  loadMemberBrowseArea,
  saveMemberBrowseArea,
  clearMemberBrowseArea,
  type GuestAreaPrefs,
} from '@/lib/guest/area-prefs'
import { getCachedCityCoords, resolveCityCoordsBatch } from '@/lib/geo/city-coords-cache'

const NEAR_ME_RADIUS_MILES = 50
const NEAR_ME_STORAGE_KEY = 'tyrian_directory_near_me'

function ListingSkeleton() {
  return (
    <div className="tyrian-card p-5 animate-pulse">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="h-5 w-20 bg-warm rounded-full" />
        <div className="h-5 w-24 bg-warm rounded-full" />
      </div>
      <div className="h-5 w-3/4 bg-warm rounded mb-2" />
      <div className="h-4 w-1/2 bg-warm rounded mb-4" />
      <div className="h-4 w-32 bg-warm rounded mb-4" />
      <div className="pt-4 border-t border-warm flex items-center justify-between">
        <div className="h-3 w-24 bg-warm rounded" />
        <div className="h-3 w-28 bg-warm rounded" />
      </div>
    </div>
  )
}

function listingCoords(listing: Listing): { lat: number; lng: number } | null {
  if (listing.location.lat != null && listing.location.lng != null) {
    return { lat: listing.location.lat, lng: listing.location.lng }
  }
  return getCachedCityCoords(listing.location.city, listing.location.stateCode)
}

function DirectoryContent() {
  const searchParams = useSearchParams()
  const { isDemoMode } = useDemoMode()

  const [allListings, setAllListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') ?? '')
  const [selectedState, setSelectedState] = useState(searchParams.get('state') ?? '')
  const [selectedLodge, setSelectedLodge] = useState(searchParams.get('lodge') ?? '')
  const [lodgeOptions, setLodgeOptions] = useState<{ id: string; name: string; number: string }[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [browseArea, setBrowseArea] = useState<GuestAreaPrefs>(DEFAULT_GUEST_AREA)
  const [profileArea, setProfileArea] = useState<GuestAreaPrefs | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [nearMeOnly, setNearMeOnly] = useState(false)
  const [coordsTick, setCoordsTick] = useState(0)

  useEffect(() => {
    const stored = localStorage.getItem(NEAR_ME_STORAGE_KEY)
    if (stored === 'false') setNearMeOnly(false)
  }, [])

  useEffect(() => {
    async function initBrowseArea() {
      if (isDemoMode) {
        setBrowseArea({
          city: demoListings[0]?.city ?? DEFAULT_GUEST_AREA.city,
          state: demoListings[0]?.state ?? DEFAULT_GUEST_AREA.state,
          lat: demoListings[0]?.lat ?? DEFAULT_GUEST_AREA.lat,
          lng: demoListings[0]?.lng ?? DEFAULT_GUEST_AREA.lng,
          source: 'default',
        })
        setIsLoggedIn(true)
        return
      }

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setIsLoggedIn(true)
        const { data: profile } = await supabase
          .from('profiles')
          .select('city, state, lat, lng')
          .eq('id', user.id)
          .single()

        const memberProfileArea: GuestAreaPrefs = {
          city: profile?.city || DEFAULT_GUEST_AREA.city,
          state: profile?.state || DEFAULT_GUEST_AREA.state,
          lat: profile?.lat ?? DEFAULT_GUEST_AREA.lat,
          lng: profile?.lng ?? DEFAULT_GUEST_AREA.lng,
          source: 'profile',
        }
        setProfileArea(memberProfileArea)

        const saved = loadMemberBrowseArea()
        setBrowseArea(saved ?? memberProfileArea)
      } else {
        setIsLoggedIn(false)
        setProfileArea(null)
        const area = await resolveGuestArea()
        setBrowseArea(area)
      }
    }

    void initBrowseArea()
  }, [isDemoMode])

  useEffect(() => {
    setLoading(true)
    if (isDemoMode) {
      setAllListings(demoListings.map(demoListingToListing))
      setLoading(false)
      return
    }

    const supabase = createClient()
    supabase
      .from('listings')
      .select(DB_LISTING_SELECT)
      .eq('is_active', true)
      .eq('visibility', 'public')
      .then(({ data, error }) => {
        if (error) console.error('Directory fetch error:', error)
        const rows = (data ?? []) as unknown as DbListingRow[]
        setAllListings(rows.filter(isVerifiedPublicListing).map((row) => dbListingToListing(row)))
        setLoading(false)
      })

    supabase
      .from('lodges')
      .select('id, name, number')
      .eq('status', 'active')
      .order('name')
      .then(({ data }) => setLodgeOptions(data ?? []))
  }, [isDemoMode])

  useEffect(() => {
    if (isDemoMode || allListings.length === 0) return

    const pairs = allListings
      .filter((l) => l.location.lat == null || l.location.lng == null)
      .map((l) => ({ city: l.location.city, state: l.location.stateCode }))

    let cancelled = false
    void resolveCityCoordsBatch(pairs, () => {
      if (!cancelled) setCoordsTick((n) => n + 1)
    })

    return () => {
      cancelled = true
    }
  }, [allListings, isDemoMode])

  const locationOverridden =
    isLoggedIn &&
    profileArea != null &&
    (browseArea.city !== profileArea.city ||
      browseArea.state !== profileArea.state ||
      browseArea.lat !== profileArea.lat ||
      browseArea.lng !== profileArea.lng)

  const availableStates = useMemo(() => {
    const codes = Array.from(new Set(allListings.map((l) => l.location.stateCode).filter(Boolean)))
    return codes
      .map((code) => ({ code, label: STATE_CODE_TO_NAME[code] ?? code }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [allListings])

  const listingDistance = useCallback(
    (listing: Listing): number | null => {
      const coords = listingCoords(listing)
      if (!coords) return null
      return haversineDistance(browseArea.lat, browseArea.lng, coords.lat, coords.lng)
    },
    [browseArea, coordsTick]
  )

  const filtered = useMemo(() => {
    const results = allListings.filter((l) => {
      const matchSearch =
        !search ||
        l.businessName.toLowerCase().includes(search.toLowerCase()) ||
        l.ownerName.toLowerCase().includes(search.toLowerCase()) ||
        l.trade.toLowerCase().includes(search.toLowerCase())
      const matchCategory = !selectedCategory || l.trade === selectedCategory
      const matchState =
        !selectedState ||
        l.location.stateCode === selectedState ||
        l.location.state === selectedState
      const matchLodge = !selectedLodge || l.lodgeId === selectedLodge

      if (!matchSearch || !matchCategory || !matchState || !matchLodge) return false

      if (nearMeOnly) {
        const dist = listingDistance(l)
        if (dist != null) return dist <= NEAR_ME_RADIUS_MILES
        return l.location.stateCode === browseArea.state
      }

      return true
    })

    if (nearMeOnly) {
      return results.sort((a, b) => {
        const da = listingDistance(a)
        const db = listingDistance(b)
        if (da == null && db == null) return 0
        if (da == null) return 1
        if (db == null) return -1
        return da - db
      })
    }

    return results.sort((a, b) => a.businessName.localeCompare(b.businessName))
  }, [
    allListings,
    search,
    selectedCategory,
    selectedState,
    selectedLodge,
    nearMeOnly,
    browseArea.state,
    listingDistance,
  ])

  const nearMeCount = useMemo(
    () =>
      allListings.filter((l) => {
        const dist = listingDistance(l)
        if (dist != null) return dist <= NEAR_ME_RADIUS_MILES
        return l.location.stateCode === browseArea.state
      }).length,
    [allListings, browseArea.state, listingDistance]
  )

  const hasFilters =
    !!selectedCategory || !!selectedState || !!selectedLodge || !!search || nearMeOnly || !!locationOverridden
  const activeLodge = lodgeOptions.find((l) => l.id === selectedLodge)

  function clearFilters() {
    setSelectedCategory('')
    setSelectedState('')
    setSelectedLodge('')
    setSearch('')
    setNearMeOnly(false)
    localStorage.setItem(NEAR_ME_STORAGE_KEY, 'false')
    if (locationOverridden) handleUseProfileLocation()
  }

  function toggleNearMe() {
    setNearMeOnly((prev) => {
      const next = !prev
      localStorage.setItem(NEAR_ME_STORAGE_KEY, String(next))
      return next
    })
  }

  function handleBrowseAreaSave(prefs: GuestAreaPrefs) {
    if (isLoggedIn) {
      saveMemberBrowseArea(prefs)
    } else {
      saveGuestAreaPrefs(prefs)
    }
    setBrowseArea(prefs)
  }

  function handleUseProfileLocation() {
    if (!profileArea) return
    clearMemberBrowseArea()
    setBrowseArea(profileArea)
  }

  function buildActiveFilterChips() {
    const chips: { id: string; label: string; onRemove: () => void }[] = []

    if (nearMeOnly) {
      chips.push({
        id: 'near-me',
        label: `Within ${NEAR_ME_RADIUS_MILES} mi of ${browseArea.city}`,
        onRemove: () => {
          setNearMeOnly(false)
          localStorage.setItem(NEAR_ME_STORAGE_KEY, 'false')
        },
      })
    }
    if (search.trim()) {
      chips.push({
        id: 'search',
        label: `“${search.trim()}”`,
        onRemove: () => setSearch(''),
      })
    }
    if (selectedCategory) {
      chips.push({
        id: 'category',
        label: selectedCategory,
        onRemove: () => setSelectedCategory(''),
      })
    }
    if (selectedState) {
      chips.push({
        id: 'state',
        label: STATE_CODE_TO_NAME[selectedState] ?? selectedState,
        onRemove: () => setSelectedState(''),
      })
    }
    if (selectedLodge && activeLodge) {
      chips.push({
        id: 'lodge',
        label: `${activeLodge.name} #${activeLodge.number}`,
        onRemove: () => setSelectedLodge(''),
      })
    }
    if (locationOverridden) {
      chips.push({
        id: 'location',
        label: `Near ${browseArea.city}, ${browseArea.state}`,
        onRemove: handleUseProfileLocation,
      })
    }

    return chips
  }

  const filterChips = buildActiveFilterChips()

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="bg-navy text-white py-12 border-b border-gold/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1
            className="text-4xl font-bold mb-2"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Find a Verified Masonic Professional
          </h1>
          <p className="text-white/60 text-lg mb-3">
            Every listing is lodge-verified. Every professional is accountable to their community.
          </p>
          <p className="text-white/60 text-sm">
            {nearMeOnly ? (
              <>
                Showing professionals within {NEAR_ME_RADIUS_MILES} miles of{' '}
                <span className="text-white font-semibold">
                  {browseArea.city}, {browseArea.state}
                </span>
              </>
            ) : (
              <>
                Showing all verified professionals
                {!isLoggedIn && (
                  <>
                    {' '}
                    · browse center{' '}
                    <span className="text-white font-semibold">
                      {browseArea.city}, {browseArea.state}
                    </span>
                  </>
                )}
              </>
            )}
            {locationOverridden && <span className="text-white/40"> · custom area</span>}
            {browseArea.source === 'geolocation' && !isLoggedIn && (
              <span className="text-white/40"> · from your location</span>
            )}
            {' · '}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="text-gold font-semibold hover:underline"
            >
              Change area
            </button>
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="flex flex-col sm:flex-row gap-3 mb-4 rounded-lg border border-warm bg-white/75 p-3 shadow-card">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by trade, name, or profession..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#E5E0D5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C] transition"
            />
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-[#E5E0D5] bg-white text-navy text-sm font-medium hover:bg-stone transition"
          >
            <SlidersHorizontal size={16} />
            Browse settings
          </button>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-medium transition sm:hidden ${
              filtersOpen ? 'bg-navy text-white border-navy' : 'bg-white border-[#E5E0D5] text-navy'
            }`}
          >
            Filters
            {hasFilters && (
              <span className="bg-[#C9A84C] text-navy rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                !
              </span>
            )}
          </button>
        </div>

        <ActiveFilterChips
          chips={filterChips}
          onClearAll={filterChips.length > 1 ? clearFilters : undefined}
          className="mb-4"
        />

        <div className="flex gap-8">
          <aside className={`${filtersOpen ? 'block' : 'hidden'} sm:block w-full sm:w-56 flex-shrink-0`}>
            <div className="bg-white rounded-lg border border-[#E5E0D5] p-5 sticky top-20 space-y-5 shadow-card">
              <div className="bg-stone rounded-lg p-4 border border-[#E5E0D5] space-y-3">
                <button
                  type="button"
                  onClick={toggleNearMe}
                  className={`w-full flex items-center justify-between rounded-md px-2 py-1.5 -mx-2 transition-colors ${
                    nearMeOnly ? 'bg-navy/5 ring-1 ring-navy/10' : 'hover:bg-white/80'
                  }`}
                >
                  <span className="text-sm text-muted">Near {browseArea.city}</span>
                  <span className="font-serif font-bold text-navy text-lg">{nearMeCount}</span>
                </button>
                <p className="text-[11px] text-muted leading-relaxed">
                  {nearMeOnly
                    ? `Within ${NEAR_ME_RADIUS_MILES} miles of your browse area. Click to show all.`
                    : 'Showing all locations. Click to filter nearby.'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  Trade / Profession
                </p>
                <div className="flex flex-col gap-1">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                      className={`text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                        selectedCategory === cat
                          ? 'bg-navy text-white font-medium'
                          : 'text-[#1A1A1A] hover:bg-stone'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {availableStates.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">State</p>
                  <div className="flex flex-col gap-1">
                    {availableStates.map(({ code, label }) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setSelectedState(selectedState === code ? '' : code)}
                        className={`text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                          selectedState === code
                            ? 'bg-navy text-white font-medium'
                            : 'text-[#1A1A1A] hover:bg-stone'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {lodgeOptions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Lodge</p>
                  <select
                    value={selectedLodge}
                    onChange={(e) => setSelectedLodge(e.target.value)}
                    className="w-full text-sm border border-[#E5E0D5] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-navy/20"
                  >
                    <option value="">All Lodges</option>
                    {lodgeOptions.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} #{l.number}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {activeLodge && (
              <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted">
                  Showing listings from{' '}
                  <strong className="text-navy">
                    {activeLodge.name} #{activeLodge.number}
                  </strong>
                </span>
                <Link href={`/lodge/${activeLodge.id}`} className="text-navy font-semibold underline">
                  ← Back to lodge page
                </Link>
              </div>
            )}

            <Link
              href="/requests"
              className="flex items-center justify-between gap-3 bg-[#C9A84C]/10 border border-[#C9A84C]/25 rounded-lg px-4 py-3 mb-5 hover:bg-[#C9A84C]/15 transition-colors group"
            >
              <p className="text-sm text-navy">
                Can&apos;t find the right professional?{' '}
                <span className="font-semibold">Post a service request</span> and let the network come
                to you.
              </p>
              <span className="text-[#C9A84C] font-bold text-sm flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
                →
              </span>
            </Link>

            {!loading && (
              <p className="text-sm text-muted mb-5">
                Showing {filtered.length} verified professional{filtered.length !== 1 ? 's' : ''}
                {nearMeOnly ? ` near ${browseArea.city}` : ''}
              </p>
            )}

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ListingSkeleton key={i} />
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 px-5 text-muted rounded-lg border border-dashed border-warm bg-white/65">
                <Search size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-lg">
                  {hasFilters ? 'No professionals match your filters' : 'No verified professionals found.'}
                </p>
                <p className="text-sm mt-1 max-w-xs mx-auto">
                  {allListings.length === 0
                    ? 'The directory is loading. Refresh to try again.'
                    : 'Try different filters, change your browse area, or post a service request.'}
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 text-sm font-semibold text-navy underline"
                  >
                    Clear filters
                  </button>
                )}
                <Link href="/requests" className="mt-4 block text-sm font-semibold text-navy underline">
                  Post a Service Request →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />

      {settingsOpen && (
        <GuestBrowseSettingsModal
          current={browseArea}
          onClose={() => setSettingsOpen(false)}
          onSave={handleBrowseAreaSave}
          profileDefault={isLoggedIn ? profileArea : undefined}
          onUseProfile={isLoggedIn ? handleUseProfileLocation : undefined}
        />
      )}
    </div>
  )
}

export default function DirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <div className="flex-1 flex items-center justify-center bg-stone">
            <Loader2 size={32} className="text-navy animate-spin" />
          </div>
          <Footer />
        </div>
      }
    >
      <DirectoryContent />
    </Suspense>
  )
}
