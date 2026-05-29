import { demoListings } from '@/lib/demo/data'
import { demoListingToListing } from '@/lib/db/listings'
import type { Listing } from '@/lib/types'

export function getDemoListingBySlug(slug: string): Listing | undefined {
  const row = demoListings.find(l => l.slug === slug)
  return row ? demoListingToListing(row) : undefined
}

export function getDemoRelatedListings(listing: Listing, count = 3): Listing[] {
  return demoListings
    .filter(l => l.slug !== listing.slug && l.state === listing.location.stateCode)
    .slice(0, count)
    .map(demoListingToListing)
}

export const demoListingSlugs = demoListings.map(l => l.slug)
