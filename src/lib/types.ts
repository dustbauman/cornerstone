export type TradeCategory =
  | "Roofing"
  | "Electrical"
  | "Legal"
  | "Plumbing"
  | "Landscaping"
  | "Automotive"
  | "HVAC"
  | "Financial"
  | "General Contractor"
  | "Technology"
  | "Home Inspection"
  | "Painting"
  | "Other";

export interface MemberReview {
  id: string;
  listingId: string;
  rating: number;
  body: string | null;
  reviewerDisplayName: string;
  reviewerLodge: string | null;
  requestId: string | null;
  createdAt: string;
}

export interface Listing {
  id: string;
  slug: string;
  businessName: string;
  ownerName: string;
  trade: TradeCategory;
  lodge: string;
  lodgeNumber: number;
  location: {
    city: string;
    state: string;
    stateCode: string;
    lat?: number;
    lng?: number;
  };
  /** Member review aggregate (primary trust signal). */
  memberRating: number;
  memberReviewCount: number;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  description: string;
  services: string[];
  phone: string;
  email: string;
  website: string;
  verified: boolean;
  visibility: "public" | "members_only";
  joinedDate: string;
  lodgeSlug?: string | null;
  lodgeId?: string | null;
}

export interface MockUser {
  id: string;
  name: string;
  email: string;
  lodge: string;
  lodgeNumber: number;
  location: string;
  verified: boolean;
  listingSlug: string;
}

export interface PendingReviewTarget {
  listingId: string;
  businessName: string;
  ownerName: string;
  requestId?: string;
  requestTitle?: string;
}

export type ReviewEligibilityReason =
  | "ok"
  | "sign_in"
  | "not_verified"
  | "own_listing"
  | "already_reviewed"
  | "not_found";

export interface ReviewEligibility {
  canReview: boolean;
  reason: ReviewEligibilityReason;
  target?: PendingReviewTarget;
}
