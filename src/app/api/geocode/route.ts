import { geocodeCityState, reverseGeocode } from '@/lib/geo/nominatim'
import { normalizeStateCode } from '@/lib/constants/states'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city')?.trim()
  const state = searchParams.get('state')?.trim()
  const latParam = searchParams.get('lat')
  const lngParam = searchParams.get('lng')

  if (latParam != null && lngParam != null) {
    const lat = parseFloat(latParam)
    const lng = parseFloat(lngParam)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return Response.json({ error: 'Invalid coordinates' }, { status: 400 })
    }

    const place = await reverseGeocode(lat, lng)
    if (!place) {
      return Response.json({ error: 'Could not resolve location' }, { status: 404 })
    }

    return Response.json({
      city: place.city,
      state: normalizeStateCode(place.state),
      lat,
      lng,
    })
  }

  if (!city || !state) {
    return Response.json({ error: 'city and state are required' }, { status: 400 })
  }

  const normalizedState = normalizeStateCode(state)
  const coords = await geocodeCityState(city, normalizedState)
  if (!coords) {
    return Response.json({ error: 'Could not geocode city and state' }, { status: 404 })
  }

  return Response.json({
    city,
    state: normalizedState,
    lat: coords.lat,
    lng: coords.lng,
  })
}
