"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import type { Listing, PendingReviewTarget, ReviewEligibility } from "@/lib/types";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";
import LeaveReviewModal from "./LeaveReviewModal";

interface Props {
  listing: Pick<Listing, "id" | "businessName" | "ownerName" | "slug">;
  /** Open modal on load (e.g. from email deep link on profile). */
  autoOpen?: boolean;
  requestId?: string | null;
}

export default function ProfileLeaveReview({
  listing,
  autoOpen = false,
  requestId = null,
}: Props) {
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isDemoListing = listing.id.startsWith("demo-listing");

  const loadEligibility = useCallback(async () => {
    if (isDemoListing) {
      setEligibility({ canReview: false, reason: "sign_in" });
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const qs = requestId
        ? `?requestId=${encodeURIComponent(requestId)}`
        : "";
      const res = await fetch(
        `/api/listings/${listing.id}/review-eligibility${qs}`,
        { headers, credentials: "include" }
      );
      const data = (await res.json()) as ReviewEligibility;
      setEligibility(data);
      return data;
    } catch {
      setEligibility({ canReview: false, reason: "sign_in" });
      return null;
    } finally {
      setLoading(false);
    }
  }, [listing.id, requestId, isDemoListing]);

  useEffect(() => {
    loadEligibility();
  }, [loadEligibility]);

  useEffect(() => {
    if (!autoOpen || loading || submitted) return;
    if (eligibility?.canReview && eligibility.target) {
      setModalOpen(true);
    }
  }, [autoOpen, loading, eligibility, submitted]);

  if (loading || submitted) {
    return null;
  }

  if (!eligibility) return null;

  if (eligibility.reason === "already_reviewed") {
    return (
      <p className="text-sm text-[#2D6A4F] font-medium">
        You&apos;ve left a member review for this listing. Thank you.
      </p>
    );
  }

  if (eligibility.reason === "own_listing") {
    return null;
  }

  if (eligibility.reason === "sign_in") {
    const returnTo = `/directory/${listing.slug}?leaveReview=1${
      requestId ? `&requestId=${encodeURIComponent(requestId)}` : ""
    }`;
    return (
      <div className="rounded-xl border border-[#E5E0D5] bg-stone/50 p-4">
        <p className="text-sm text-muted mb-3">
          Hired {listing.ownerName.split(/\s+/)[0]}? Verified members can leave a
          review to help the network.
        </p>
        <Link
          href={`/login?redirect=${encodeURIComponent(returnTo)}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-navy hover:text-gold transition-colors"
        >
          <Star size={14} className="text-gold fill-gold" />
          Sign in to leave a review
        </Link>
      </div>
    );
  }

  if (eligibility.reason === "not_verified") {
    return (
      <p className="text-sm text-muted">
        Lodge verification is required before you can leave member reviews.
      </p>
    );
  }

  if (!eligibility.canReview || !eligibility.target) {
    return null;
  }

  const target: PendingReviewTarget = eligibility.target;

  return (
    <>
      <div className="rounded-xl border border-[#C9A84C]/40 bg-[#C9A84C]/10 p-4">
        <p className="text-sm text-navy mb-3">
          Worked with {listing.ownerName.split(/\s+/)[0]}? Leave a verified member
          review to help brothers find trusted professionals.
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 bg-navy text-[#C9A84C] text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-navy/90 transition-colors"
        >
          <Star size={14} className="fill-[#C9A84C]" />
          Leave a member review
        </button>
      </div>

      {modalOpen && (
        <LeaveReviewModal
          target={target}
          onClose={() => setModalOpen(false)}
          onSubmitted={() => {
            setSubmitted(true);
            setModalOpen(false);
          }}
        />
      )}
    </>
  );
}
