/**
 * Geocode lodge_directory rows and active lodges from official JSON sources.
 * Run after applying scripts/migrations/010_lodge_coordinates.sql
 *
 *   pnpm tsx scripts/backfill-lodge-coords.ts
 */
import { createClient } from '@supabase/supabase-js'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { geocodeAddress, geocodeCityState } from '../src/lib/geo/nominatim'
import { normalizeStateCode } from '../src/lib/constants/states'

const envPath = resolve(process.cwd(), '.env.local')
const envContent = readFileSync(envPath, 'utf8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  const val = trimmed.slice(eqIdx + 1).trim()
  if (!process.env[key]) process.env[key] = val
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const dataDir = resolve(process.cwd(), 'data/lodges')
const rawFL = JSON.parse(readFileSync(resolve(dataDir, 'florida_lodges.json'), 'utf8')) as Array<{
  number: number
  name: string
  city: string
  address?: string
  state: string
}>
const oklahomaLodges = JSON.parse(
  readFileSync(resolve(dataDir, 'oklahoma_lodges.json'), 'utf8')
) as Array<{ number: string; name: string; city: string; state: string; address?: string }>

async function geocodeRow(city: string, state: string, address?: string | null) {
  const normalizedState = normalizeStateCode(state)
  if (address?.trim() && city?.trim()) {
    const byAddress = await geocodeAddress(address, city, normalizedState)
    if (byAddress) return byAddress
  }
  if (city?.trim()) {
    return geocodeCityState(city, normalizedState)
  }
  return null
}

async function main() {
  console.log('\n📍 Backfilling lodge coordinates...\n')

  let directoryUpdated = 0
  let lodgesUpdated = 0

  for (const row of rawFL) {
    const number = String(row.number)
    const state = 'FL'
    const city = row.city?.trim() ?? ''
    const meeting_address = row.address?.trim() ?? null

    const coords = await geocodeRow(city, state, meeting_address)
    if (!coords) {
      console.warn(`   ✗ Could not geocode FL #${number} ${row.name}`)
      await new Promise((r) => setTimeout(r, 1100))
      continue
    }

    const { error } = await supabase
      .from('lodge_directory')
      .update({
        meeting_address,
        city,
        lat: coords.lat,
        lng: coords.lng,
      })
      .eq('number', number)
      .eq('state', state)

    if (!error) directoryUpdated++
    await new Promise((r) => setTimeout(r, 1100))
  }

  for (const row of oklahomaLodges) {
    const number = String(row.number)
    const state = normalizeStateCode(row.state)
    const city = row.city?.trim() ?? ''
    const meeting_address = row.address?.trim() ?? null

    const coords = await geocodeRow(city, state, meeting_address)
    if (!coords) {
      console.warn(`   ✗ Could not geocode ${state} #${number} ${row.name}`)
      await new Promise((r) => setTimeout(r, 1100))
      continue
    }

    const { error } = await supabase
      .from('lodge_directory')
      .update({
        meeting_address,
        city,
        lat: coords.lat,
        lng: coords.lng,
      })
      .eq('number', number)
      .eq('state', state)

    if (!error) directoryUpdated++
    await new Promise((r) => setTimeout(r, 1100))
  }

  const { data: activeLodges } = await supabase
    .from('lodges')
    .select('id, number, state, city, meeting_address, lat, lng, directory_id')
    .eq('status', 'active')

  for (const lodge of activeLodges ?? []) {
    let city = lodge.city?.trim() ?? ''
    let meeting_address = lodge.meeting_address?.trim() ?? null
    let lat = lodge.lat
    let lng = lodge.lng

    if (lodge.directory_id) {
      const { data: dirRow } = await supabase
        .from('lodge_directory')
        .select('city, meeting_address, lat, lng')
        .eq('id', lodge.directory_id)
        .maybeSingle()

      if (dirRow) {
        if (!city && dirRow.city) city = dirRow.city.trim()
        if (!meeting_address && dirRow.meeting_address) {
          meeting_address = dirRow.meeting_address.trim()
        }
        if (lat == null && dirRow.lat != null) lat = dirRow.lat
        if (lng == null && dirRow.lng != null) lng = dirRow.lng
      }
    }

    if (lat == null || lng == null) {
      const coords = await geocodeRow(city, lodge.state, meeting_address)
      if (coords) {
        lat = coords.lat
        lng = coords.lng
      }
      await new Promise((r) => setTimeout(r, 1100))
    }

    const { error } = await supabase
      .from('lodges')
      .update({
        city: city || lodge.city,
        meeting_address,
        lat,
        lng,
      })
      .eq('id', lodge.id)

    if (!error) lodgesUpdated++
  }

  console.log(`✅ lodge_directory rows updated: ${directoryUpdated}`)
  console.log(`✅ active lodges updated: ${lodgesUpdated}\n`)
}

main().catch((err) => {
  console.error('\n💥 Backfill failed:', err)
  process.exit(1)
})
