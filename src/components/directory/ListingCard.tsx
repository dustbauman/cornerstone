"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
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
      <div className="tyrian-card-interactive p-5 h-full flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-3">
          <CategoryBadge trade={listing.trade} size="sm" />
          {listing.verified && <VerifiedBadge size="sm" />}
        </div>

        <h3 className="font-serif text-lg font-bold text-navy group-hover:text-gold transition-colors leading-tight mb-1">
          {listing.businessName}
        </h3>
        <p className="text-sm text-muted mb-3">{listing.ownerName}</p>

        <StarRating
          rating={listing.memberRating}
          reviewCount={listing.memberReviewCount}
          hideWhenEmpty
        />

        <div className="mt-auto pt-4 border-t border-warm flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-muted">
            <MapPin size={13} />
            <span>{listing.location.city}, {listing.location.stateCode}</span>
          </div>
          {listing.lodgeSlug ? (
            <Link
              href={`/lodge/${listing.lodgeSlug}`}
              className="text-xs text-muted/70 font-light hover:text-navy hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {listing.lodge} #{listing.lodgeNumber}
            </Link>
          ) : (
            <span className="text-xs text-muted/70 font-light">
              {listing.lodge} #{listing.lodgeNumber}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
