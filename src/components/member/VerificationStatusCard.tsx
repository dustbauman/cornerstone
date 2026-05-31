'use client'

import Link from 'next/link'
import { Clock, AlertCircle, ShieldCheck } from 'lucide-react'
import VerifiedBadge from '@/components/directory/VerifiedBadge'
import type { MemberAccessState } from '@/lib/auth/member-access'

interface Props {
  state: MemberAccessState
  lodgeName?: string
  lodgeNumber?: string
}

export default function VerificationStatusCard({ state, lodgeName, lodgeNumber }: Props) {
  const lodgeLabel = lodgeName
    ? `${lodgeName}${lodgeNumber ? ` #${lodgeNumber}` : ''}`
    : 'your lodge'

  if (state === 'verified') {
    return (
      <div className="bg-[#2D6A4F]/5 border border-[#2D6A4F]/15 rounded-2xl p-5">
        <VerifiedBadge size="sm" />
        <p className="text-sm mt-3 leading-relaxed text-[#1A1A1A]">
          Your membership is verified through{' '}
          <span className="font-semibold">{lodgeLabel}</span>.
        </p>
        <p className="text-xs text-muted mt-2">Verification renews annually with your lodge dues.</p>
      </div>
    )
  }

  if (state === 'pending') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={16} className="text-amber-700" />
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
            Pending verification
          </span>
        </div>
        <p className="text-sm leading-relaxed text-[#1A1A1A]">
          We&apos;re waiting for your sponsor to confirm your membership at {lodgeLabel}.
          You can browse Tyrian, but you can&apos;t publish a listing until verification completes.
        </p>
        <p className="text-xs text-muted mt-2">This usually takes under 24 hours.</p>
      </div>
    )
  }

  if (state === 'unaffiliated') {
    return (
      <div className="bg-stone border border-[#E5E0D5] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={16} className="text-navy" />
          <span className="text-xs font-semibold uppercase tracking-wider text-navy">
            Not affiliated with a lodge
          </span>
        </div>
        <p className="text-sm leading-relaxed text-[#1A1A1A] mb-4">
          Tyrian is lodge-gated. Join through your lodge&apos;s invite link to get verified —
          or unlock your lodge if it&apos;s not on Tyrian yet.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href="/network"
            className="inline-flex items-center justify-center bg-navy hover:bg-navy-dark text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Find your lodge
          </Link>
          <Link
            href="/join"
            className="inline-flex items-center justify-center border border-[#E5E0D5] hover:bg-stone text-navy font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Unlock your lodge
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle size={16} className="text-red-600" />
        <span className="text-xs font-semibold uppercase tracking-wider text-red-700">
          {state === 'rejected' ? 'Verification declined' : 'Account flagged'}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-[#1A1A1A]">
        {state === 'rejected'
          ? 'Your sponsor did not confirm your membership. Contact your lodge admin if this is a mistake.'
          : 'Your account requires review. Contact support if you need help.'}
      </p>
    </div>
  )
}
