import { demoReviews } from '@/lib/demo/data'
import type { MemberReview } from '@/lib/types'

export function getDemoMemberStats(listingId: string): {
  memberRating: number
  memberReviewCount: number
} {
  const rows = demoReviews.filter((r) => r.listing_id === listingId)
  if (rows.length === 0) {
    return { memberRating: 0, memberReviewCount: 0 }
  }
  const sum = rows.reduce((acc, r) => acc + r.rating, 0)
  return {
    memberRating: Math.round((sum / rows.length) * 10) / 10,
    memberReviewCount: rows.length,
  }
}

export function getDemoReviewsForListing(listingId: string): MemberReview[] {
  return demoReviews
    .filter((r) => r.listing_id === listingId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .map((r) => ({
      id: r.id,
      listingId: r.listing_id,
      rating: r.rating,
      body: r.body,
      reviewerDisplayName: r.reviewer_name,
      reviewerLodge: r.reviewer_lodge ?? null,
      requestId: null,
      createdAt: r.created_at,
    }))
}
