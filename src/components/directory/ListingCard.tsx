"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, ShieldCheck } from "lucide-react";
import { Listing } from "@/lib/types";
import VerifiedBadge from "./VerifiedBadge";
import CategoryBadge from "./CategoryBadge";
import StarRating from "./StarRating";

interface Props {
  listing: Listing;
}

export default function ListingCard({ listing }: Props) {
  const router = useRouter();
  const href = `/directory/${listing.slug}`;

  return (
    <div
      className="group block cursor-pointer"
      onClick={() => router.push(href)}
      onKeyDown={(e) => e.key === "Enter" && router.push(href)}
      role="link"
      tabIndex={0}
      aria-label={listing.businessName}
    >
      <article className="relative h-full overflow-hidden rounded-lg border border-warm bg-white shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/35 hover:shadow-card-hover">
        <div className="absolute inset-y-0 left-0 w-1 bg-gold" aria-hidden />

        <div className="relative p-5 h-full flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-5">
            <CategoryBadge trade={listing.trade} size="sm" />
            {listing.verified && <VerifiedBadge size="sm" />}
          </div>

          <h3 className="font-serif text-xl font-bold text-navy group-hover:text-gold transition-colors leading-tight mb-1">
            {listing.businessName}
          </h3>
          <p className="text-sm text-muted mb-4">{listing.ownerName}</p>

          <StarRating
            rating={listing.memberRating}
            reviewCount={listing.memberReviewCount}
            hideWhenEmpty
          />

          <div className="mt-auto pt-5 space-y-3">
            <div className="rounded-lg border border-warm bg-stone/45 px-3.5 py-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border border-trust/20 bg-white text-trust">
                  <ShieldCheck size={14} strokeWidth={2.4} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-trust">
                    Verified through
                  </p>
                  {listing.lodgeSlug ? (
                    <Link
                      href={`/lodge/${listing.lodgeSlug}`}
                      className="text-sm font-semibold text-navy hover:text-gold hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {listing.lodge} #{listing.lodgeNumber}
                    </Link>
                  ) : (
                    <p className="text-sm font-semibold text-navy">
                      {listing.lodge} #{listing.lodgeNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-sm text-muted">
              <div className="flex items-center gap-1.5">
                <MapPin size={13} className="text-gold" />
                <span>{listing.location.city}, {listing.location.stateCode}</span>
              </div>
              <span className="text-xs font-medium text-muted/80">Public listing</span>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
