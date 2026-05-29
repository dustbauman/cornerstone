'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ListingCard from '@/components/ListingCard'
import { CATEGORIES } from '@/data/listings'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useDemoMode } from '@/lib/demo-context'
import { demoListings } from '@/data/demo'
import { dbListingToListing, demoListingToListing, DB_LISTING_SELECT, STATE_CODE_TO_NAME } from '@/lib/db-utils'
import type { DbListingRow } from '@/lib/db-utils'
import type { Listing } from '@/lib/types'

function ListingSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="h-5 w-20 bg-gray-100 rounded-full" />
        <div className="h-5 w-24 bg-gray-100 rounded-full" />
      </div>
      <div className="h-5 w-3/4 bg-gray-100 rounded mb-2" />
      <div className="h-4 w-1/2 bg-gray-100 rounded mb-4" />
      <div className="h-4 w-32 bg-gray-100 rounded mb-4" />
      <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
        <div className="h-3 w-24 bg-gray-100 rounded" />
        <div className="h-3 w-28 bg-gray-100 rounded" />
      </div>
    </div>
  )
}

function DirectoryContent() {
  const searchParams = useSearchParams()
  const { isDemoMode } = useDemoMode()

  const [allListings, setAllListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') ?? '')
  const [selectedState, setSelectedState] = useState(searchParams.get('state') ?? '')
  const [filtersOpen, setFiltersOpen] = useState(false)

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
        setAllListings((data ?? []).map(row => dbListingToListing(row as unknown as DbListingRow)))
        setLoading(false)
      })
  }, [isDemoMode])

  // Derive available states from fetched listings
  const availableStates = useMemo(() => {
    const codes = Array.from(new Set(allListings.map(l => l.location.stateCode).filter(Boolean)))
    return codes.map(code => ({ code, label: STATE_CODE_TO_NAME[code] ?? code })).sort((a, b) => a.label.localeCompare(b.label))
  }, [allListings])

  const filtered = useMemo(() => {
    return allListings.filter(l => {
      const matchSearch =
        !search ||
        l.businessName.toLowerCase().includes(search.toLowerCase()) ||
        l.ownerName.toLowerCase().includes(search.toLowerCase()) ||
        l.trade.toLowerCase().includes(search.toLowerCase())
      const matchCategory = !selectedCategory || l.trade === selectedCategory
      const matchState = !selectedState || l.location.stateCode === selectedState || l.location.state === selectedState
      return matchSearch && matchCategory && matchState
    })
  }, [allListings, search, selectedCategory, selectedState])

  const hasFilters = selectedCategory || selectedState

  function clearFilters() {
    setSelectedCategory('')
    setSelectedState('')
    setSearch('')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="bg-navy text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1
            className="text-4xl font-bold mb-2"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Find a Verified Masonic Professional
          </h1>
          <p className="text-white/60 text-lg">
            Every listing is lodge-verified. Every professional is accountable to their community.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Search bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search by trade, name, or profession..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/40 focus:border-[#C9A84C] transition"
            />
          </div>
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition sm:hidden ${
              filtersOpen ? 'bg-navy text-white border-navy' : 'bg-white border-[#E5E0D5] text-navy'
            }`}
          >
            <SlidersHorizontal size={16} />
            Filters {hasFilters && <span className="bg-[#C9A84C] text-navy rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">!</span>}
          </button>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className={`${filtersOpen ? 'block' : 'hidden'} sm:block w-full sm:w-56 flex-shrink-0`}>
            <div className="bg-white rounded-2xl border border-[#E5E0D5] p-5 sticky top-20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-navy text-sm uppercase tracking-wide">Filter results</h3>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-xs text-muted hover:text-navy flex items-center gap-1">
                    <X size={12} /> Clear
                  </button>
                )}
              </div>

              <div className="mb-5">
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Trade / Profession</p>
                <div className="flex flex-col gap-1">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                      className={`text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                        selectedCategory === cat ? 'bg-navy text-white font-medium' : 'text-[#1A1A1A] hover:bg-stone'
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
                        onClick={() => setSelectedState(selectedState === code ? '' : code)}
                        className={`text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                          selectedState === code ? 'bg-navy text-white font-medium' : 'text-[#1A1A1A] hover:bg-stone'
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

          {/* Grid */}
          <div className="flex-1 min-w-0">
            <Link
              href="/requests"
              className="flex items-center justify-between gap-3 bg-[#C9A84C]/10 border border-[#C9A84C]/25 rounded-xl px-4 py-3 mb-5 hover:bg-[#C9A84C]/15 transition-colors group"
            >
              <p className="text-sm text-navy">
                Can&apos;t find the right professional?{' '}
                <span className="font-semibold">Post a service request</span>{' '}
                and let the network come to you.
              </p>
              <span className="text-[#C9A84C] font-bold text-sm flex-shrink-0 group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>

            {(hasFilters || search) && !loading && (
              <div className="flex items-center gap-2 mb-5 flex-wrap">
                <span className="text-sm text-muted">Showing {filtered.length} verified professional{filtered.length !== 1 ? 's' : ''}</span>
                {selectedCategory && (
                  <span className="inline-flex items-center gap-1 bg-navy/10 text-navy text-xs font-medium px-2.5 py-1 rounded-full">
                    {selectedCategory}
                    <button onClick={() => setSelectedCategory('')}><X size={11} /></button>
                  </span>
                )}
                {selectedState && (
                  <span className="inline-flex items-center gap-1 bg-navy/10 text-navy text-xs font-medium px-2.5 py-1 rounded-full">
                    {STATE_CODE_TO_NAME[selectedState] ?? selectedState}
                    <button onClick={() => setSelectedState('')}><X size={11} /></button>
                  </span>
                )}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => <ListingSkeleton key={i} />)}
              </div>
            ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map(listing => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-muted">
                <Search size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-lg">No verified professionals found.</p>
                <p className="text-sm mt-1 max-w-xs mx-auto">
                  {allListings.length === 0
                    ? 'The directory is loading. Refresh to try again.'
                    : 'Try different filters or post a service request.'}
                </p>
                <Link href="/requests" className="mt-4 inline-block text-sm font-semibold text-navy underline">
                  Post a Service Request →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default function DirectoryPage() {
  return (
    <Suspense>
      <DirectoryContent />
    </Suspense>
  )
}
