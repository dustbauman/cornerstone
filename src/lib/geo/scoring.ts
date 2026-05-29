import { ServiceRequest } from '@/lib/demo/requests'

export interface MockUserProfile {
  trade: string;
  lodge: string;
  lat: number;
  lng: number;
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export function getMatchScore(request: ServiceRequest, user: MockUserProfile): number {
  let score = 0;
  if (request.category === user.trade) score += 40;
  const miles = haversineDistance(user.lat, user.lng, request.lat, request.lng);
  if (miles <= 25) score += 30;
  else if (miles <= 50) score += 15;
  if (request.lodge === user.lodge) score += 20;
  if (request.responses === 0) score += 15;
  if (request.postedHoursAgo <= 48) score += 12;
  if (request.budget && request.budget !== "Flexible") score += 8;
  if (request.timeline === "ASAP") score += 8;
  if (request.verifiedMember) score += 5;
  return score;
}
