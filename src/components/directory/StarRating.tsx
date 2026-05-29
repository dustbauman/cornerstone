import { Star } from "lucide-react";

interface Props {
  rating: number;
  reviewCount?: number;
  size?: number;
}

export default function StarRating({ rating, reviewCount, size = 14 }: Props) {
  return (
    <div className="flex items-center gap-1">
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
      {reviewCount !== undefined && (
        <span className="text-sm text-muted">({reviewCount})</span>
      )}
    </div>
  );
}
