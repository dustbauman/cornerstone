"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";
import type { PendingReviewTarget } from "@/lib/types";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

interface Props {
  target: PendingReviewTarget;
  onClose: () => void;
  onSubmitted: () => void;
}

export default function LeaveReviewModal({
  target,
  onClose,
  onSubmitted,
}: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      setError("Please select a star rating.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/listings/${target.listingId}/reviews`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          body: body.trim() || null,
          ...(target.requestId ? { requestId: target.requestId } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Could not submit review."
        );
        return;
      }

      onSubmitted();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-review-title"
    >
      <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2
              id="leave-review-title"
              className="text-xl font-bold text-navy"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Leave a member review
            </h2>
            <p className="text-sm text-muted mt-1">
              {target.businessName} · {target.ownerName}
            </p>
            {target.requestTitle && (
              <p className="text-xs text-muted mt-1 line-clamp-2">
                Request: &ldquo;{target.requestTitle}&rdquo;
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted hover:text-navy hover:bg-stone transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm font-medium text-navy mb-2">Your rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  className="p-0.5"
                  aria-label={`${star} stars`}
                >
                  <Star
                    size={28}
                    className={
                      star <= (hover || rating)
                        ? "text-gold fill-gold"
                        : "text-gray-300"
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="review-body"
              className="text-sm font-medium text-navy block mb-2"
            >
              Your experience (optional)
            </label>
            <textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="What was it like working with this brother?"
              className="w-full rounded-xl border border-[#E5E0D5] px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy/20"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[#E5E0D5] text-sm font-medium py-2.5 rounded-xl hover:bg-stone transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-navy text-[#C9A84C] text-sm font-semibold py-2.5 rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
