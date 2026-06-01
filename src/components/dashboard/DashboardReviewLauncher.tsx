"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { PendingReviewTarget, ReviewEligibility } from "@/lib/types";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";
import LeaveReviewModal from "@/components/directory/LeaveReviewModal";

/** Opens leave-review modal from ?leaveReview=&requestId= (e.g. review prompt email). */
export default function DashboardReviewLauncher() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [target, setTarget] = useState<PendingReviewTarget | null>(null);

  const listingId = searchParams.get("leaveReview");
  const requestId = searchParams.get("requestId");

  useEffect(() => {
    if (!listingId) return;

    let cancelled = false;

    (async () => {
      try {
        const headers = await getAuthHeaders();
        const qs = requestId
          ? `?requestId=${encodeURIComponent(requestId)}`
          : "";
        const res = await fetch(
          `/api/listings/${listingId}/review-eligibility${qs}`,
          { headers, credentials: "include" }
        );
        const data = (await res.json()) as ReviewEligibility;
        if (!cancelled && data.canReview && data.target) {
          setTarget(data.target);
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listingId, requestId]);

  function clearQuery() {
    router.replace("/dashboard", { scroll: false });
  }

  if (!target) return null;

  return (
    <LeaveReviewModal
      target={target}
      onClose={() => {
        setTarget(null);
        clearQuery();
      }}
      onSubmitted={() => {
        setTarget(null);
        clearQuery();
      }}
    />
  );
}
