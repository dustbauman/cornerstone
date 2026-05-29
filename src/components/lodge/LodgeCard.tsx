import Link from 'next/link'
import { Users, Eye, Megaphone } from 'lucide-react'

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
}

export default function LodgeCard({ lodge }: { lodge: LodgeCardData }) {
  const href = `/lodge/${lodge.slug ?? lodge.id}`

  return (
    <Link href={href} className="group block">
      <div className="bg-white rounded-2xl border border-[#E5E0D5] p-6 shadow-sm hover:shadow-md hover:border-gold/30 transition-all h-full flex flex-col">
        {lodge.tier === 'founding' && (
          <span className="inline-flex self-start text-[10px] font-semibold uppercase tracking-wider text-[#92400E] bg-[#FEF3C7] border border-[#C9A84C]/40 px-2 py-0.5 rounded-full mb-3">
            ⭐ Founding Lodge
          </span>
        )}

        <h3
          className="text-xl font-bold text-navy group-hover:text-gold transition-colors mb-1"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {lodge.name}
        </h3>
        <p className="text-sm text-muted mb-4">
          #{lodge.number} · {lodge.city ? `${lodge.city}, ` : ''}{lodge.state}
        </p>

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
}: {
  name: string
  trade: string | null
  occupation: string | null
  hasListing: boolean
  listingId?: string | null
}) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const role = trade || occupation || 'Member'

  return (
    <div className="bg-white rounded-2xl border border-[#E5E0D5] p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-full bg-navy/10 text-navy font-bold flex items-center justify-center flex-shrink-0 text-sm"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {initials}
        </div>
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
