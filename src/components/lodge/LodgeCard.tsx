import Link from 'next/link'
import { Users, Eye, Megaphone } from 'lucide-react'
import LodgeAvatar from '@/components/ui/LodgeAvatar'
import ProfileAvatar from '@/components/ui/ProfileAvatar'
import FoundingLodgeBadge from '@/components/brand/FoundingLodgeBadge'

export interface LodgeCardData {
  id: string
  slug: string | null
  name: string
  number: string
  city: string
  state: string
  tier: string
  memberCount: number
  listingCount: number
  requestCount: number
  meetingAddress?: string | null
  lat?: number | null
  lng?: number | null
  distanceMiles?: number | null
}

function formatCity(city: string) {
  if (!city) return city
  return city
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function LodgeCard({ lodge }: { lodge: LodgeCardData }) {
  const href = `/lodge/${lodge.slug ?? lodge.id}`

  return (
    <Link href={href} className="group block">
      <div className="tyrian-card-interactive p-6 h-full flex flex-col">
        <div className="flex items-start gap-3 mb-3">
          <LodgeAvatar number={lodge.number} tier={lodge.tier} size="sm" />
          <div className="min-w-0 flex-1">
        {lodge.tier === 'founding' && (
          <FoundingLodgeBadge variant="pill" className="mb-2" />
        )}

        <h3
          className="text-xl font-bold text-navy group-hover:text-gold transition-colors mb-1"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {lodge.name}
        </h3>
        <p className="text-sm text-muted">
          #{lodge.number} · {lodge.city ? `${formatCity(lodge.city)}, ` : ''}{lodge.state}
          {lodge.distanceMiles != null && (
            <span className="text-navy/70"> · {Math.round(lodge.distanceMiles)} mi</span>
          )}
        </p>
        {lodge.meetingAddress && (
          <p className="text-xs text-muted mt-1 leading-snug">{lodge.meetingAddress}</p>
        )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted mt-auto pt-4 border-t border-gray-50">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {lodge.memberCount} verified
          </span>
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {lodge.listingCount} listings
          </span>
          <span className="flex items-center gap-1">
            <Megaphone size={12} />
            {lodge.requestCount} open
          </span>
        </div>

        <span className="mt-4 text-sm font-semibold text-navy group-hover:text-gold transition-colors flex items-center gap-1">
          View Lodge →
        </span>
      </div>
    </Link>
  )
}

export function MemberCard({
  name,
  trade,
  occupation,
  hasListing,
  listingId,
  imageUrl,
}: {
  name: string
  trade: string | null
  occupation: string | null
  hasListing: boolean
  listingId?: string | null
  imageUrl?: string | null
}) {
  const role = trade || occupation || 'Member'

  return (
    <div className="bg-white rounded-2xl border border-[#E5E0D5] p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <ProfileAvatar name={name} imageUrl={imageUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-navy truncate">{name}</p>
          <p className="text-sm text-muted truncate">{role}</p>
          <span className="inline-flex mt-2 text-[10px] font-semibold uppercase tracking-wider text-[#0F6E56] bg-[#E1F5EE] px-2 py-0.5 rounded-full">
            ✓ Lodge-Verified Member
          </span>
          {hasListing && listingId && (
            <Link
              href={`/directory/${listingId}`}
              className="block mt-2 text-xs font-semibold text-navy hover:text-gold transition-colors"
            >
              View listing →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
