import { normalizeStateCode } from '@/lib/constants/states'

export interface GuestAreaPrefs {
  city: string
  state: string
  lat: number
  lng: number
  source: 'saved' | 'geolocation' | 'default' | 'profile'
}

export const DEFAULT_GUEST_AREA: GuestAreaPrefs = {
  city: 'Tulsa',
  state: 'OK',
  lat: 36.154,
  lng: -95.9928,
  source: 'default',
}

const GUEST_STORAGE_KEY = 'tyrian_guest_area'
const MEMBER_STORAGE_KEY = 'tyrian_member_browse_area'

function parseStoredArea(raw: string): GuestAreaPrefs | null {
  try {
    const parsed = JSON.parse(raw) as Partial<GuestAreaPrefs>
    if (
      typeof parsed.city !== 'string' ||
      typeof parsed.state !== 'string' ||
      typeof parsed.lat !== 'number' ||
      typeof parsed.lng !== 'number'
    ) {
      return null
    }
    const source = parsed.source
    return {
      city: parsed.city,
      state: normalizeStateCode(parsed.state),
      lat: parsed.lat,
      lng: parsed.lng,
      source:
        source === 'geolocation'
          ? 'geolocation'
          : source === 'profile'
            ? 'profile'
            : 'saved',
    }
  } catch {
    return null
  }
}

export function loadGuestAreaPrefs(): GuestAreaPrefs | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(GUEST_STORAGE_KEY)
  if (!raw) return null
  return parseStoredArea(raw)
}

export function saveGuestAreaPrefs(prefs: Omit<GuestAreaPrefs, 'source'> & { source?: GuestAreaPrefs['source'] }) {
  if (typeof window === 'undefined') return
  const payload: GuestAreaPrefs = {
    city: prefs.city.trim(),
    state: normalizeStateCode(prefs.state),
    lat: prefs.lat,
    lng: prefs.lng,
    source: prefs.source ?? 'saved',
  }
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(payload))
}

export function loadMemberBrowseArea(): GuestAreaPrefs | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(MEMBER_STORAGE_KEY)
  if (!raw) return null
  return parseStoredArea(raw)
}

export function saveMemberBrowseArea(prefs: Omit<GuestAreaPrefs, 'source'> & { source?: GuestAreaPrefs['source'] }) {
  if (typeof window === 'undefined') return
  const payload: GuestAreaPrefs = {
    city: prefs.city.trim(),
    state: normalizeStateCode(prefs.state),
    lat: prefs.lat,
    lng: prefs.lng,
    source: prefs.source ?? 'saved',
  }
  localStorage.setItem(MEMBER_STORAGE_KEY, JSON.stringify(payload))
}

export function clearMemberBrowseArea() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(MEMBER_STORAGE_KEY)
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation unavailable'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 300_000,
    })
  })
}

/** Saved prefs first, then browser geolocation + reverse geocode, then Tulsa default. */
export async function resolveGuestArea(): Promise<GuestAreaPrefs> {
  const saved = loadGuestAreaPrefs()
  if (saved) return saved

  try {
    const position = await getCurrentPosition()
    const { latitude, longitude } = position.coords
    const res = await fetch(
      `/api/geocode?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`
    )
    if (res.ok) {
      const data = await res.json()
      if (data.city && data.state && data.lat != null && data.lng != null) {
        const prefs: GuestAreaPrefs = {
          city: data.city,
          state: normalizeStateCode(data.state),
          lat: data.lat,
          lng: data.lng,
          source: 'geolocation',
        }
        saveGuestAreaPrefs(prefs)
        return prefs
      }
    }
  } catch {
    // Permission denied, timeout, or reverse geocode failure — fall through.
  }

  return DEFAULT_GUEST_AREA
}
