import type { Listing, TradeCategory } from '@/lib/types'
import type { demoListings } from '@/lib/demo/data'
import { getDemoMemberStats } from '@/lib/demo/reviews'

export const STATE_CODE_TO_NAME: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
  CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
  KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
  OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
  VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming',
}

export type DbListingRow = {
  id: string
  business_name: string
  description: string | null
  trade_category: string
  city: string
  state: string
  phone: string | null
  email: string | null
  website: string | null
  google_rating: number | null
  google_rating_count: number | null
  member_rating: number | null
  member_review_count: number | null
  services: string[] | null
  visibility: string
  is_active: boolean
  views_count: number
  created_at: string
  profiles: {
    full_name: string | null
    verification_status: string
    lodge_id: string | null
    lodges: { id: string; name: string; number: string; slug: string | null } | null
  } | null
}

export function isVerifiedPublicListing(row: DbListingRow): boolean {
  return (
    row.profiles?.verification_status === 'verified' &&
    !!row.profiles?.lodge_id
  )
}

export function dbListingToListing(row: DbListingRow): Listing {
  return {
    id: row.id,
    slug: row.id,
    businessName: row.business_name,
    ownerName: row.profiles?.full_name ?? 'Member',
    trade: row.trade_category as TradeCategory,
    lodge: row.profiles?.lodges?.name ?? '',
    lodgeNumber: parseInt(row.profiles?.lodges?.number ?? '0'),
    lodgeSlug: row.profiles?.lodges?.slug ?? null,
    lodgeId: row.profiles?.lodges?.id ?? row.profiles?.lodge_id ?? null,
    location: {
      city: row.city,
      state: STATE_CODE_TO_NAME[row.state] ?? row.state,
      stateCode: row.state,
    },
    memberRating: row.member_rating ?? 0,
    memberReviewCount: row.member_review_count ?? 0,
    googleRating: row.google_rating,
    googleReviewCount: row.google_rating_count,
    description: row.description ?? '',
    services: row.services ?? [],
    phone: row.phone ?? '',
    email: row.email ?? '',
    website: row.website ?? '',
    verified: row.profiles?.verification_status === 'verified',
    visibility: 'public',
    joinedDate: row.created_at,
  }
}

export function demoListingToListing(dl: typeof demoListings[number]): Listing {
  const memberStats = getDemoMemberStats(dl.id)
  return {
    id: dl.id,
    slug: dl.slug,
    businessName: dl.business_name,
    ownerName: dl.owner_name,
    trade: dl.trade_category as TradeCategory,
    lodge: dl.lodge_name,
    lodgeNumber: parseInt(dl.lodge_number),
    lodgeSlug: `${dl.lodge_name.toLowerCase().replace(/\s+/g, '-')}-${dl.lodge_number}`,
    lodgeId: dl.lodge_id,
    location: {
      city: dl.city,
      state: STATE_CODE_TO_NAME[dl.state] ?? dl.state,
      stateCode: dl.state,
      lat: dl.lat,
      lng: dl.lng,
    },
    memberRating: memberStats.memberRating,
    memberReviewCount: memberStats.memberReviewCount,
    googleRating: dl.google_rating,
    googleReviewCount: dl.google_rating_count,
    description: dl.description,
    services: dl.services,
    phone: dl.phone,
    email: dl.email,
    website: dl.website,
    verified: true,
    visibility: 'public',
    joinedDate: dl.created_at,
  }
}

export const DB_LISTING_SELECT = `
  id, business_name, description, trade_category,
  city, state, phone, email, website,
  google_rating, google_rating_count,
  member_rating, member_review_count,
  services, visibility, is_active, views_count, created_at,
  profiles:profile_id (
    full_name, verification_status, lodge_id,
    lodges:lodge_id ( id, name, number, slug )
  )
` as const
