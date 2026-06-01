import { Star } from "lucide-react";

interface Props {
  rating: number;
  reviewCount?: number;
  /** Shown after count, e.g. "member reviews". */
  countLabel?: string;
  size?: number;
  /** When true, hide stars when there are no reviews. */
  hideWhenEmpty?: boolean;
}

export default function StarRating({
  rating,
  reviewCount,
  countLabel = "member reviews",
  size = 14,
  hideWhenEmpty = false,
}: Props) {
  const count = reviewCount ?? 0;
  const hasReviews = count > 0 && rating > 0;

  if (hideWhenEmpty && !hasReviews) {
    return (
      <p className="text-sm text-muted">No member reviews yet</p>
    );
  }

  if (!hasReviews) {
    return (
      <p className="text-sm text-muted">No member reviews yet</p>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={star <= Math.round(rating) ? "text-gold fill-gold" : "text-gray-300"}
          />
        ))}
      </div>
      <span className="text-sm font-semibold text-[#1A1A1A]">{rating.toFixed(1)}</span>
      <span className="text-sm text-muted">
        ({count} {countLabel})
      </span>
    </div>
  );
}
