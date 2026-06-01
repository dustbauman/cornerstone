import type { SupabaseClient } from '@supabase/supabase-js'
import { geocodeAddress, geocodeCityState } from '@/lib/geo/nominatim'
import { normalizeStateCode } from '@/lib/constants/states'

export interface LodgeGeoInput {
  id: string
  number?: string
  city: string | null
  state: string
  meeting_address?: string | null
  lat?: number | null
  lng?: number | null
  directory_id?: string | null
}

export interface LodgeGeoResult {
  city: string
  state: string
  meeting_address: string | null
  lat: number | null
  lng: number | null
}

export async function enrichLodgeGeo(
  admin: SupabaseClient,
  lodge: LodgeGeoInput
): Promise<LodgeGeoResult> {
  let city = lodge.city?.trim() ?? ''
  const state = normalizeStateCode(lodge.state)
  let meetingAddress = lodge.meeting_address?.trim() || null
  let lat = lodge.lat ?? null
  let lng = lodge.lng ?? null

  if ((!meetingAddress || !city) && lodge.directory_id) {
    const { data: dirRow } = await admin
      .from('lodge_directory')
      .select('city, meeting_address, lat, lng')
      .eq('id', lodge.directory_id)
      .maybeSingle()

    if (dirRow) {
      if (!city && dirRow.city) city = dirRow.city.trim()
      if (!meetingAddress && dirRow.meeting_address) {
        meetingAddress = dirRow.meeting_address.trim()
      }
      if (lat == null && dirRow.lat != null) lat = dirRow.lat
      if (lng == null && dirRow.lng != null) lng = dirRow.lng
    }
  }

  if ((!meetingAddress || !city || lat == null || lng == null) && lodge.number) {
    const { data: dirRow } = await admin
      .from('lodge_directory')
      .select('city, meeting_address, lat, lng')
      .eq('number', lodge.number)
      .eq('state', state)
      .maybeSingle()

    if (dirRow) {
      if (!city && dirRow.city) city = dirRow.city.trim()
      if (!meetingAddress && dirRow.meeting_address) {
        meetingAddress = dirRow.meeting_address.trim()
      }
      if (lat == null && dirRow.lat != null) lat = dirRow.lat
      if (lng == null && dirRow.lng != null) lng = dirRow.lng
    }
  }

  if (lat == null || lng == null) {
    const coords =
      meetingAddress && city
        ? await geocodeAddress(meetingAddress, city, state)
        : city
          ? await geocodeCityState(city, state)
          : null

    if (coords) {
      lat = coords.lat
      lng = coords.lng
    }
  }

  const shouldPersist =
    (lat != null && lng != null && (lodge.lat == null || lodge.lng == null)) ||
    (meetingAddress && meetingAddress !== (lodge.meeting_address?.trim() || null)) ||
    (city && city !== (lodge.city?.trim() ?? ''))

  if (shouldPersist) {
    const patch: Record<string, string | number | null> = {}
    if (lat != null && lng != null) {
      patch.lat = lat
      patch.lng = lng
    }
    if (meetingAddress) patch.meeting_address = meetingAddress
    if (city) patch.city = city

    if (Object.keys(patch).length > 0) {
      void admin.from('lodges').update(patch).eq('id', lodge.id)
    }
  }

  return {
    city,
    state,
    meeting_address: meetingAddress,
    lat,
    lng,
  }
}
