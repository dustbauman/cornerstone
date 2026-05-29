import type { ServiceRequest, RequestStatus, RequestTimeline } from '@/lib/demo/requests'
import type { TradeCategory } from '@/lib/types'

export interface DbRequestRow {
  id: string
  posted_by_name: string
  posted_by_email: string
  profile_id: string | null
  lodge_id: string | null
  lodge_display: string | null
  category: string
  title: string
  details: string | null
  city: string
  state: string
  lat: number | null
  lng: number | null
  budget: string | null
  timeline: string | null
  status: string
  remote_eligible: boolean
  is_verified_member: boolean
  responses_count: number
  created_at: string
}

export const DB_REQUEST_SELECT = `
  id, posted_by_name, posted_by_email, profile_id, lodge_id, lodge_display,
  category, title, details, city, state, lat, lng, budget, timeline,
  status, remote_eligible, is_verified_member, responses_count, created_at
`

function hoursAgo(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60)))
}

export function dbRequestToServiceRequest(row: DbRequestRow): ServiceRequest {
  const timeline = (row.timeline ?? 'Flexible') as RequestTimeline
  const status = (['open', 'active', 'filled'].includes(row.status)
    ? row.status
    : 'open') as RequestStatus

  return {
    id: row.id,
    title: row.title,
    category: row.category as TradeCategory,
    name: row.posted_by_name,
    lodge: row.lodge_display ?? 'Tyrian Member',
    lodgeId: row.lodge_id,
    city: row.city,
    state: row.state,
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    budget: row.budget ?? 'Flexible',
    timeline,
    details: row.details ?? undefined,
    responses: row.responses_count ?? 0,
    postedHoursAgo: hoursAgo(row.created_at),
    status,
    remoteEligible: row.remote_eligible,
    verifiedMember: row.is_verified_member,
  }
}
