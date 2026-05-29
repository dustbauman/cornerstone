"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { Listing } from "@/lib/types";
import VerifiedBadge from "./VerifiedBadge";
import CategoryBadge from "./CategoryBadge";
import StarRating from "./StarRating";

interface Props {
  listing: Listing;
}

export default function ListingCard({ listing }: Props) {
  return (
    <Link href={`/directory/${listing.slug}`} className="group block">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-gold/30 transition-all duration-200 h-full flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-3">
          <CategoryBadge trade={listing.trade} size="sm" />
          {listing.verified && <VerifiedBadge size="sm" />}
        </div>

        <h3 className="font-serif text-lg font-bold text-navy group-hover:text-gold transition-colors leading-tight mb-1">
          {listing.businessName}
        </h3>
        <p className="text-sm text-muted mb-3">{listing.ownerName}</p>

        <StarRating rating={listing.rating} reviewCount={listing.reviewCount} />

        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-muted">
            <MapPin size={13} />
            <span>{listing.location.city}, {listing.location.stateCode}</span>
          </div>
          {listing.lodgeSlug ? (
            <span
              onClick={(e) => e.preventDefault()}
              className="text-xs text-muted/70 font-light"
            >
              <Link
                href={`/lodge/${listing.lodgeSlug}`}
                className="hover:text-navy hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {listing.lodge} #{listing.lodgeNumber}
              </Link>
            </span>
          ) : (
            <span className="text-xs text-muted/70 font-light">
              {listing.lodge} #{listing.lodgeNumber}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
