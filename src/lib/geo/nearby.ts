import { normalizeStateCode } from '@/lib/constants/states'
import { haversineDistance } from '@/lib/geo/scoring'

export function normalizeCity(city: string): string {
  return city.trim().toLowerCase().replace(/\s+/g, ' ')
}

export interface GeoPoint {
  city: string
  state: string
  lat?: number | null
  lng?: number | null
}

export function isWithinBrowseRadius(
  target: GeoPoint,
  browseArea: { city: string; state: string; lat: number; lng: number },
  radiusMiles: number
): boolean {
  const targetState = normalizeStateCode(target.state)
  const browseState = normalizeStateCode(browseArea.state)

  if (
    target.city &&
    browseArea.city &&
    normalizeCity(target.city) === normalizeCity(browseArea.city) &&
    targetState === browseState
  ) {
    return true
  }

  if (target.lat != null && target.lng != null) {
    return haversineDistance(browseArea.lat, browseArea.lng, target.lat, target.lng) <= radiusMiles
  }

  return targetState === browseState
}

export function distanceMiles(
  target: GeoPoint,
  browseArea: { lat: number; lng: number }
): number | null {
  if (target.lat == null || target.lng == null) return null
  return haversineDistance(browseArea.lat, browseArea.lng, target.lat, target.lng)
}
