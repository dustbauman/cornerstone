"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import type { PendingReviewTarget } from "@/lib/types";
import LeaveReviewModal from "@/components/directory/LeaveReviewModal";

interface Props {
  targets: PendingReviewTarget[];
  demoMode?: boolean;
}

export default function PendingReviewsSection({
  targets,
  demoMode = false,
}: Props) {
  const [active, setActive] = useState<PendingReviewTarget | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const visible = targets.filter((t) => !dismissed.includes(t.listingId));

  if (visible.length === 0) return null;

  return (
    <>
      <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Star size={18} className="text-[#C9A84C] fill-[#C9A84C]" />
          <h2
            className="text-xl font-bold text-navy"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Reviews to leave
          </h2>
        </div>
        <p className="text-sm text-muted mb-4">
          You marked these requests as filled. Help brothers in the network by
          sharing your experience.
        </p>
        <ul className="space-y-3">
          {visible.map((target) => (
            <li
              key={`${target.requestId}-${target.listingId}`}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl border border-[#E5E0D5] p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-sm text-navy">
                  {target.businessName}
                </p>
                <p className="text-xs text-muted truncate">
                  &ldquo;{target.requestTitle}&rdquo;
                </p>
              </div>
              <button
                type="button"
                disabled={demoMode}
                onClick={() => !demoMode && setActive(target)}
                className="shrink-0 text-sm font-semibold bg-navy text-[#C9A84C] px-4 py-2 rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-50"
              >
                Leave review
              </button>
            </li>
          ))}
        </ul>
        {demoMode && (
          <p className="text-xs text-muted mt-3">
            Sign in with a live account to submit member reviews.
          </p>
        )}
      </div>

      {active && (
        <LeaveReviewModal
          target={active}
          onClose={() => setActive(null)}
          onSubmitted={() => {
            setDismissed((prev) => [...prev, active.listingId]);
            setActive(null);
          }}
        />
      )}
    </>
  );
}
