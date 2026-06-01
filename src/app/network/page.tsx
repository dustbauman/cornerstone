'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { Search, SlidersHorizontal, Loader2 } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import LodgeCard, { type LodgeCardData } from '@/components/lodge/LodgeCard'
import UnlockLodgeBanner from '@/components/network/UnlockLodgeBanner'
import ActiveFilterChips from '@/components/requests/ActiveFilterChips'
import GuestBrowseSettingsModal from '@/components/requests/GuestBrowseSettingsModal'
import { STATE_CODE_TO_NAME } from '@/lib/db/listings'
import { distanceMiles, isWithinBrowseRadius } from '@/lib/geo/nearby'
import {
  DEFAULT_GUEST_AREA,
  resolveGuestArea,
  saveGuestAreaPrefs,
  loadMemberBrowseArea,
  saveMemberBrowseArea,
  clearMemberBrowseArea,
  type GuestAreaPrefs,
} from '@/lib/guest/area-prefs'
import { useDemoMode } from '@/lib/demo/context'
import { demoListings, demoLodges } from '@/lib/demo/data'
import { createClient } from '@/lib/supabase/client'

const NEAR_ME_RADIUS_MILES = 50
/** Separate from directory so "near me" on /directory doesn't hide all lodges here. */
const NEAR_ME_STORAGE_KEY = 'tyrian_network_near_me'

function demoNetworkLodges(): LodgeCardData[] {
  return [
    {
      id: demoLodges[0].id,
      slug: 'acacia-lodge-123',
      name: demoLodges[0].name,
      number: demoLodges[0].number,
      city: demoLodges[0].city,
      state: demoLodges[0].state,
      meetingAddress: '123 Main St',
      lat: 36.154,
      lng: -95.9928,
      tier: demoLodges[0].tier,
      memberCount: 8,
      listingCount: demoListings.filter((x) => x.lodge_id === demoLodges[0].id).length,
      requestCount: 1,
    },
    {
      id: demoLodges[1].id,
      slug: 'gulf-coast-lodge-441',
      name: demoLodges[1].name,
      number: demoLodges[1].number,
      city: demoLodges[1].city,
      state: demoLodges[1].state,
      meetingAddress: '441 Masonic Ave',
      lat: 27.9506,
      lng: -82.4572,
      tier: demoLodges[1].tier,
      memberCount: 6,
      listingCount: demoListings.filter((x) => x.lodge_id === demoLodges[1].id).length,
      requestCount: 1,
    },
    {
      id: demoLodges[2].id,
      slug: 'suncoast-lodge-217',
      name: demoLodges[2].name,
      number: demoLodges[2].number,
      city: demoLodges[2].city,
      state: demoLodges[2].state,
      meetingAddress: '217 Gulf Stream Ave',
      lat: 27.3364,
      lng: -82.5307,
      tier: demoLodges[2].tier,
      memberCount: 4,
      listingCount: demoListings.filter((x) => x.lodge_id === demoLodges[2].id).length,
      requestCount: 0,
    },
  ]
}

function NetworkContent() {
  const { isDemoMode } = useDemoMode()
  const [lodges, setLodges] = useState<LodgeCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedState, setSelectedState] = useState('')
  const [nearMeOnly, setNearMeOnly] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [browseArea, setBrowseArea] = useState<GuestAreaPrefs>(DEFAULT_GUEST_AREA)
  const [profileArea, setProfileArea] = useState<GuestAreaPrefs | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(NEAR_ME_STORAGE_KEY)
    if (stored === 'false') setNearMeOnly(false)
  }, [])

  useEffect(() => {
    async function initBrowseArea() {
      if (isDemoMode) {
        setBrowseArea({
          city: demoLodges[0]?.city ?? DEFAULT_GUEST_AREA.city,
          state: demoLodges[0]?.state ?? DEFAULT_GUEST_AREA.state,
          lat: DEFAULT_GUEST_AREA.lat,
          lng: DEFAULT_GUEST_AREA.lng,
          source: 'default',
        })
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
        setBrowseArea(loadMemberBrowseArea() ?? memberProfileArea)
      } else {
        setIsLoggedIn(false)
        setProfileArea(null)
        setBrowseArea(await resolveGuestArea())
      }
    }

    void initBrowseArea()
  }, [isDemoMode])

  useEffect(() => {
    setLoading(true)
    setFetchError('')
    if (isDemoMode) {
      setLodges(demoNetworkLodges())
      setLoading(false)
      return
    }

    fetch('/api/network/lodges')
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) {
          setFetchError(data.error || 'Could not load lodges. Try refreshing.')
          return { lodges: [] }
        }
        return data
      })
      .then((data) => setLodges(data.lodges ?? []))
      .catch(() => {
        setFetchError('Could not load lodges. Try refreshing.')
        setLodges([])
      })
      .finally(() => setLoading(false))
  }, [isDemoMode])

  const locationOverridden =
    isLoggedIn &&
    profileArea != null &&
    (browseArea.city !== profileArea.city ||
      browseArea.state !== profileArea.state ||
      browseArea.lat !== profileArea.lat ||
      browseArea.lng !== profileArea.lng)

  const lodgeDistance = (lodge: LodgeCardData) =>
    distanceMiles(
      { city: lodge.city, state: lodge.state, lat: lodge.lat, lng: lodge.lng },
      browseArea
    )

  const isLodgeNear = (lodge: LodgeCardData) =>
    isWithinBrowseRadius(
      { city: lodge.city, state: lodge.state, lat: lodge.lat, lng: lodge.lng },
      browseArea,
      NEAR_ME_RADIUS_MILES
    )

  const availableStates = useMemo(() => {
    const codes = Array.from(new Set(lodges.map((l) => l.state).filter(Boolean)))
    return codes
      .map((code) => ({ code, label: STATE_CODE_TO_NAME[code] ?? code }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [lodges])

  const filtered = useMemo(() => {
    const results = lodges.filter((lodge) => {
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        lodge.name.toLowerCase().includes(q) ||
        lodge.number.includes(q) ||
        lodge.city.toLowerCase().includes(q)
      const matchState = !selectedState || lodge.state === selectedState

      if (!matchSearch || !matchState) return false

      if (nearMeOnly) {
        return isLodgeNear(lodge)
      }

      return true
    })

    const withDistance = results.map((lodge) => ({
      ...lodge,
      distanceMiles: lodgeDistance(lodge),
    }))

    if (nearMeOnly) {
      return withDistance.sort((a, b) => {
        if (a.distanceMiles == null && b.distanceMiles == null) return 0
        if (a.distanceMiles == null) return 1
        if (b.distanceMiles == null) return -1
        return a.distanceMiles - b.distanceMiles
      })
    }

    return withDistance.sort((a, b) => {
      const aFounding = a.tier === 'founding' || a.tier === 'charter'
      const bFounding = b.tier === 'founding' || b.tier === 'charter'
      if (aFounding && !bFounding) return -1
      if (bFounding && !aFounding) return 1
      return b.memberCount - a.memberCount
    })
  }, [lodges, search, selectedState, nearMeOnly, browseArea])

  const nearMeCount = useMemo(
    () => lodges.filter((lodge) => isLodgeNear(lodge)).length,
    [lodges, browseArea, nearMeOnly]
  )

  function clearFilters() {
    setSearch('')
    setSelectedState('')
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
    if (isLoggedIn) saveMemberBrowseArea(prefs)
    else saveGuestAreaPrefs(prefs)
    setBrowseArea(prefs)
  }

  function handleUseProfileLocation() {
    if (!profileArea) return
    clearMemberBrowseArea()
    setBrowseArea(profileArea)
  }

  const filterChips = (() => {
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
      chips.push({ id: 'search', label: `“${search.trim()}”`, onRemove: () => setSearch('') })
    }
    if (selectedState) {
      chips.push({
        id: 'state',
        label: STATE_CODE_TO_NAME[selectedState] ?? selectedState,
        onRemove: () => setSelectedState(''),
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
  })()

  const hasFilters =
    !!search || !!selectedState || nearMeOnly || !!locationOverridden

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="bg-navy text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            The Network
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mb-3">
            Every lodge on Tyrian. Browse listings, open requests, and verified members from lodges
            across the country.
          </p>
          <p className="text-white/60 text-sm mb-4">
            {nearMeOnly ? (
              <>
                Lodges within {NEAR_ME_RADIUS_MILES} miles of{' '}
                <span className="text-white font-semibold">
                  {browseArea.city}, {browseArea.state}
                </span>
              </>
            ) : (
              <>Showing all lodges on the network</>
            )}
            {locationOverridden && <span className="text-white/40"> · custom area</span>}
            {' · '}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="text-gold font-semibold hover:underline"
            >
              Change area
            </button>
          </p>
          <Link
            href="/join"
            className="inline-flex text-sm font-semibold text-gold hover:text-gold-light transition-colors"
          >
            Don&apos;t see your lodge? Unlock it on Tyrian →
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search lodge name, number, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C] transition"
            />
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[#E5E0D5] bg-white text-navy text-sm font-medium hover:bg-stone transition"
          >
            <SlidersHorizontal size={16} />
            Browse settings
          </button>
        </div>

        <ActiveFilterChips
          chips={filterChips}
          onClearAll={filterChips.length > 1 ? clearFilters : undefined}
          className="mb-6"
        />

        <div className="flex gap-8">
          <aside className="hidden sm:block w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-[#E5E0D5] p-5 sticky top-20 space-y-5">
              <div className="bg-stone rounded-xl p-4 border border-[#E5E0D5] space-y-3">
                <button
                  type="button"
                  onClick={toggleNearMe}
                  className={`w-full flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2 transition-colors ${
                    nearMeOnly ? 'bg-navy/5 ring-1 ring-navy/10' : 'hover:bg-white/80'
                  }`}
                >
                  <span className="text-sm text-muted">Lodges near {browseArea.city}</span>
                  <span className="font-serif font-bold text-navy text-lg">{nearMeCount}</span>
                </button>
                <p className="text-[11px] text-muted leading-relaxed">
                  {nearMeOnly
                    ? 'Lodges in your browse radius. Click to show all.'
                    : 'Showing every active lodge. Click to filter nearby.'}
                </p>
              </div>

              {availableStates.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                    State / Jurisdiction
                  </p>
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
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
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {!loading && lodges.length > 0 && (
              <p className="text-sm text-muted mb-5">
                Showing {filtered.length} lodge{filtered.length !== 1 ? 's' : ''}
                {nearMeOnly ? ` near ${browseArea.city}` : ''}
              </p>
            )}

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 size={32} className="text-navy animate-spin" />
              </div>
            ) : lodges.length === 0 ? (
              <div className="text-center py-20">
                {fetchError ? (
                  <>
                    <p
                      className="text-lg font-semibold text-navy mb-2"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      Couldn&apos;t load the network
                    </p>
                    <p className="text-muted mb-6">{fetchError}</p>
                  </>
                ) : (
                  <>
                    <p
                      className="text-lg font-semibold text-navy mb-2"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      The network is growing.
                    </p>
                    <p className="text-muted mb-6">Your lodge could be the first.</p>
                  </>
                )}
                <Link
                  href="/join"
                  className="inline-flex bg-gold hover:bg-gold-dark text-navy font-bold px-6 py-3 rounded-xl transition-colors"
                >
                  Unlock your lodge →
                </Link>
              </div>
            ) : filtered.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filtered.map((lodge) => (
                    <LodgeCard key={lodge.id} lodge={lodge} />
                  ))}
                </div>
                <UnlockLodgeBanner />
              </>
            ) : (
              <div className="text-center py-20 text-muted">
                <Search size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-lg text-navy">
                  {hasFilters ? 'No lodges match your filters' : 'No lodges found'}
                </p>
                <p className="text-sm mt-1 max-w-sm mx-auto">
                  {nearMeOnly && lodges.length > 0
                    ? `No lodges within ${NEAR_ME_RADIUS_MILES} miles of ${browseArea.city}, ${browseArea.state}. Try showing all lodges or change your browse area.`
                    : 'Try a wider area, clear filters, or unlock your lodge on Tyrian.'}
                </p>
                {nearMeOnly && lodges.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setNearMeOnly(false)
                      localStorage.setItem(NEAR_ME_STORAGE_KEY, 'false')
                    }}
                    className="mt-4 inline-flex tyrian-btn-primary text-sm px-5 py-2.5"
                  >
                    Show all {lodges.length} lodges
                  </button>
                )}
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 text-sm font-semibold text-navy underline block mx-auto"
                  >
                    Clear filters
                  </button>
                )}
                <Link href="/join" className="mt-4 block text-sm font-semibold text-navy underline">
                  Unlock your lodge →
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

export default function NetworkPage() {
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
      <NetworkContent />
    </Suspense>
  )
}
