import type { MemberReview, PendingReviewTarget } from '@/lib/types'

export type DbReviewRow = {
  id: string
  listing_id: string
  reviewer_id: string
  rating: number
  body: string | null
  request_id: string | null
  created_at: string
  profiles: {
    full_name: string | null
    lodges: { name: string; number: string } | null
  } | null
}

export const REVIEW_SELECT = `
  id, listing_id, reviewer_id, rating, body, request_id, created_at,
  profiles:reviewer_id (
    full_name,
    lodges:lodge_id ( name, number )
  )
` as const

export function dbReviewToMemberReview(row: DbReviewRow): MemberReview {
  const lodge = row.profiles?.lodges
  const lodgeLabel = lodge ? `${lodge.name} #${lodge.number}` : null
  const fullName = row.profiles?.full_name?.trim() ?? 'Member'
  const parts = fullName.split(/\s+/)
  const display =
    parts.length >= 2
      ? `${parts[0][0]}. ${parts[parts.length - 1]}`
      : fullName

  return {
    id: row.id,
    listingId: row.listing_id,
    rating: row.rating,
    body: row.body,
    reviewerDisplayName: display,
    reviewerLodge: lodgeLabel,
    requestId: row.request_id,
    createdAt: row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapReviewRows(data: unknown): MemberReview[] {
  if (!Array.isArray(data)) return []
  return (data as DbReviewRow[]).map(dbReviewToMemberReview)
}

export type PendingReviewRow = {
  request_id: string
  request_title: string
  listing_id: string
  business_name: string
  owner_name: string
}

export function mapPendingReviewRows(rows: PendingReviewRow[]): PendingReviewTarget[] {
  return rows.map((r) => ({
    listingId: r.listing_id,
    businessName: r.business_name,
    ownerName: r.owner_name,
    requestId: r.request_id,
    requestTitle: r.request_title,
  }))
}
