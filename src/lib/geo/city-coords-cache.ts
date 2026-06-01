import { normalizeStateCode } from '@/lib/constants/states'

export interface CityCoords {
  lat: number
  lng: number
}

const MEMORY = new Map<string, CityCoords>()
const LS_KEY = 'tyrian_city_coords'

function cacheKey(city: string, state: string) {
  return `${city.trim().toLowerCase()}|${normalizeStateCode(state)}`
}

function readPersistedCache(): Record<string, CityCoords> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, CityCoords>
  } catch {
    return {}
  }
}

function persistCache(key: string, coords: CityCoords) {
  if (typeof window === 'undefined') return
  const stored = readPersistedCache()
  stored[key] = coords
  localStorage.setItem(LS_KEY, JSON.stringify(stored))
}

export function getCachedCityCoords(city: string, state: string): CityCoords | null {
  const key = cacheKey(city, state)
  if (MEMORY.has(key)) return MEMORY.get(key)!
  const stored = readPersistedCache()[key]
  if (stored && typeof stored.lat === 'number' && typeof stored.lng === 'number') {
    MEMORY.set(key, stored)
    return stored
  }
  return null
}

export async function resolveCityCoords(city: string, state: string): Promise<CityCoords | null> {
  const key = cacheKey(city, state)
  const cached = getCachedCityCoords(city, state)
  if (cached) return cached

  try {
    const params = new URLSearchParams({ city: city.trim(), state: normalizeStateCode(state) })
    const res = await fetch(`/api/geocode?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.lat == null || data.lng == null) return null
    const coords = { lat: data.lat, lng: data.lng }
    MEMORY.set(key, coords)
    persistCache(key, coords)
    return coords
  } catch {
    return null
  }
}

/** Geocode unique city/state pairs sequentially (respects Nominatim rate limits). */
export async function resolveCityCoordsBatch(
  pairs: Array<{ city: string; state: string }>,
  onResolved?: () => void
) {
  const seen = new Set<string>()
  for (const { city, state } of pairs) {
    const key = cacheKey(city, state)
    if (seen.has(key) || getCachedCityCoords(city, state)) {
      seen.add(key)
      continue
    }
    seen.add(key)
    await resolveCityCoords(city, state)
    onResolved?.()
    await new Promise((r) => setTimeout(r, 1100))
  }
}
