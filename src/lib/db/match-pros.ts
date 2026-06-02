import type { SupabaseClient } from '@supabase/supabase-js'
import { haversineDistance } from '@/lib/geo/scoring'
import { sendNewRequestToPro } from '@/lib/email'

/** Most pros notified for a single request, to avoid blasting the whole base. */
const MAX_RECIPIENTS = 25
/** Trade matches reach further than generic local matches. */
const TRADE_MATCH_RADIUS_MI = 100
/** Fallback travel radius when a listing doesn't specify one. */
const DEFAULT_RADIUS_MI = 50

export interface NotifyRequest {
  id: string
  profile_id: string | null
  category: string
  title: string
  city: string
  state: string
  lat: number | null
  lng: number | null
  budget: string | null
  timeline: string | null
  details: string | null
  remote_eligible: boolean
}

interface ProfileJoin {
  id: string
  full_name: string | null
  email: string | null
  verification_status: string
  request_emails_enabled: boolean
  request_emails_unsubscribe_token: string | null
}

interface ListingRow {
  profile_id: string
  trade_category: string | null
  state: string | null
  lat: number | null
  lng: number | null
  remote_eligible: boolean | null
  travel_radius_miles: number | null
  profiles: ProfileJoin | null
}

interface ScoredPro {
  profileId: string
  email: string
  firstName: string
  unsubscribeToken: string
  score: number
}

/**
 * Email verified members who advertise a matching professional listing for a
 * newly-live request. A "pro" is anyone with an active listing — the explicit
 * "I offer this service" signal — so brothers without a listing are never pinged.
 *
 * Returns the number of emails sent. Never throws — individual send failures are
 * swallowed so the caller's request flow is never blocked.
 */
export async function notifyMatchingPros(
  admin: SupabaseClient,
  request: NotifyRequest
): Promise<number> {
  const { data: listings } = await admin
    .from('listings')
    .select(
      `profile_id, trade_category, state, lat, lng, remote_eligible, travel_radius_miles,
       profiles:profile_id!inner ( id, full_name, email, verification_status, request_emails_enabled, request_emails_unsubscribe_token )`
    )
    .eq('is_active', true)
    .eq('profiles.verification_status', 'verified')
    .eq('profiles.request_emails_enabled', true)
    .not('profiles.email', 'is', null)

  if (!listings?.length) return 0

  const hasGeo = request.lat != null && request.lng != null
  // One pro can own several listings; keep only their single best-scoring match.
  const bestByPro = new Map<string, ScoredPro>()

  for (const listing of listings as unknown as ListingRow[]) {
    const profile = listing.profiles
    if (!profile?.email) continue
    if (profile.id === request.profile_id) continue

    const tradeMatch =
      !!listing.trade_category && listing.trade_category === request.category
    const proRadius = listing.travel_radius_miles ?? DEFAULT_RADIUS_MI

    let score: number | null = null

    if (request.remote_eligible) {
      // Remote work — location is irrelevant; reach trade matches nationwide.
      if (tradeMatch) score = 60
    } else if (!hasGeo || listing.lat == null || listing.lng == null) {
      // Geocode failed (request or listing has no coords): same-state trade match.
      if (tradeMatch && listing.state === request.state) score = 40
    } else {
      const miles = haversineDistance(request.lat!, request.lng!, listing.lat, listing.lng)
      const qualifies =
        miles <= proRadius || (tradeMatch && miles <= TRADE_MATCH_RADIUS_MI)
      if (qualifies) {
        score = 0
        if (tradeMatch) score += 40
        if (miles <= 25) score += 30
        else if (miles <= DEFAULT_RADIUS_MI) score += 15
        else score += 5
      }
    }

    if (score == null) continue

    const existing = bestByPro.get(profile.id)
    if (existing && existing.score >= score) continue

    bestByPro.set(profile.id, {
      profileId: profile.id,
      email: profile.email,
      firstName: (profile.full_name || 'Brother').split(' ')[0] || 'Brother',
      unsubscribeToken: profile.request_emails_unsubscribe_token ?? '',
      score,
    })
  }

  if (!bestByPro.size) return 0

  const recipients = Array.from(bestByPro.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RECIPIENTS)

  const results = await Promise.allSettled(
    recipients.map((pro) =>
      sendNewRequestToPro({
        to: pro.email,
        proFirstName: pro.firstName,
        requestTitle: request.title,
        requestId: request.id,
        category: request.category,
        city: request.city,
        state: request.state,
        budget: request.budget,
        timeline: request.timeline,
        details: request.details,
        isRemote: request.remote_eligible,
        unsubscribeToken: pro.unsubscribeToken,
      })
    )
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.length - sent
  if (failed > 0) {
    console.error(`notifyMatchingPros: ${failed}/${results.length} pro emails failed for request ${request.id}`)
  }
  return sent
}
