import { Star, ShieldCheck } from "lucide-react";
import type { Listing, MemberReview } from "@/lib/types";
import StarRating from "./StarRating";
import ProfileLeaveReview from "./ProfileLeaveReview";

interface Props {
  listing: Listing;
  reviews: MemberReview[];
  autoOpenReview?: boolean;
  reviewRequestId?: string | null;
}

function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function MemberReviewsSection({
  listing,
  reviews,
  autoOpenReview = false,
  reviewRequestId = null,
}: Props) {
  const ownerFirst = listing.ownerName.split(/\s+/)[0] ?? "them";

  return (
    <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 md:p-8">
      <h2
        className="text-xl font-bold text-navy mb-2"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        Member reviews
      </h2>

      <div className="mb-6">
        <StarRating
          rating={listing.memberRating}
          reviewCount={listing.memberReviewCount}
          size={16}
          hideWhenEmpty
        />
      </div>

      <div className="mb-6">
        <ProfileLeaveReview
          listing={listing}
          autoOpen={autoOpenReview}
          requestId={reviewRequestId}
        />
      </div>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted leading-relaxed">
          No member reviews yet. Members who have hired {ownerFirst} can leave a
          verified review from their dashboard.
        </p>
      ) : (
        <ul className="space-y-6">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="border-t border-[#E5E0D5] pt-6 first:border-0 first:pt-0"
            >
              <div className="flex items-center gap-0.5 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={14}
                    className={
                      star <= review.rating
                        ? "text-gold fill-gold"
                        : "text-gray-300"
                    }
                  />
                ))}
              </div>
              {review.body && (
                <p className="text-[#1A1A1A] leading-relaxed mb-3">
                  &ldquo;{review.body}&rdquo;
                </p>
              )}
              <p className="text-sm text-muted">
                — {review.reviewerDisplayName}
                {review.reviewerLodge ? ` · ${review.reviewerLodge}` : ""}
                {" · "}
                {formatReviewDate(review.createdAt)}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#2D6A4F]">
                <ShieldCheck size={12} />
                Verified member review
                {review.requestId ? " · Hired via Tyrian request" : ""}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
