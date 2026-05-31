import Link from 'next/link'
import LodgeAvatar from '@/components/ui/LodgeAvatar'
import FoundingLodgeBadge from '@/components/brand/FoundingLodgeBadge'

export interface LodgeHeroContentProps {
  name: string
  number: string
  city: string | null
  state: string
  tier: string
  website: string | null
  meetingSchedule: string | null
  meetingAddress: string | null
  welcomeMessage?: string | null
  joinedDate: string | null
  memberCount: number
  listingCount: number
  listingsShowPlus: boolean
  isOwnLodge: boolean
  isFounding?: boolean
}

export default function LodgeHeroContent({
  name,
  number,
  city,
  state,
  tier,
  website,
  meetingSchedule,
  meetingAddress,
  welcomeMessage,
  joinedDate,
  memberCount,
  listingCount,
  listingsShowPlus,
  isOwnLodge,
  isFounding = false,
}: LodgeHeroContentProps) {
  const welcome = welcomeMessage?.trim() ?? ''

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-4 min-w-0 flex-1 relative z-10">
        <LodgeAvatar number={number} tier={tier} size="lg" />
        <div className="min-w-0">
          {isFounding && (
            <div className="mb-3">
              <FoundingLodgeBadge variant="hero" />
              <p className="text-xs text-white/45 mt-1.5 tracking-wide">
                Among the first lodges on Tyrian
              </p>
            </div>
          )}

          <h1
            className="text-4xl md:text-5xl font-bold mb-2"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {name}
          </h1>

          <p className="text-white/65 text-base md:text-lg">
            #{number} · {city ? `${city}, ` : ''}
            {state}
          </p>

          {welcome && (
            <blockquote
              className="mt-4 text-white/85 text-base md:text-lg max-w-2xl leading-relaxed border-l-2 border-gold/50 pl-4 whitespace-pre-wrap"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {welcome}
            </blockquote>
          )}

          {(meetingSchedule || meetingAddress) && (
            <p className="text-sm text-white/50 mt-3">
              {meetingSchedule}
              {meetingSchedule && meetingAddress && ' · '}
              {meetingAddress}
            </p>
          )}

          {website && (
            <a
              href={website.startsWith('http') ? website : `https://${website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gold hover:text-gold-light hover:underline mt-1 inline-block"
            >
              {website.replace(/^https?:\/\//, '')}
            </a>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-4 text-sm text-white/70">
            <span>{memberCount} verified members</span>
            <span className="text-white/30" aria-hidden>
              ·
            </span>
            <span>
              {listingCount}
              {listingsShowPlus ? '+' : ''} listings
            </span>
            {joinedDate && (
              <>
                <span className="text-white/30" aria-hidden>
                  ·
                </span>
                <span>
                  {isFounding ? 'Founding member since' : 'On Tyrian since'} {joinedDate}
                </span>
              </>
            )}
          </div>

          {isOwnLodge && (
            <p className="mt-3 text-sm text-[#6EE7B7] font-semibold">✓ Your lodge</p>
          )}
        </div>
      </div>

      <Link href="/admin" className="text-sm text-white/60 hover:text-white underline hidden">
        Admin
      </Link>
    </div>
  )
}
