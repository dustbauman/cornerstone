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
  | "Painting";

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
  };
  rating: number;
  reviewCount: number;
  description: string;
  services: string[];
  phone: string;
  email: string;
  website: string;
  verified: boolean;
  visibility: "public" | "brothers_only";
  joinedDate: string;
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
