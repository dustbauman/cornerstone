'use client'

import Link from 'next/link'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import type { MemberAccessState } from '@/lib/auth/member-access'

interface Props {
  state: MemberAccessState
  backHref?: string
  backLabel?: string
}

export default function ListingAccessGate({
  state,
  backHref = '/dashboard',
  backLabel = 'Back to dashboard',
}: Props) {
  return (
    <div className="flex flex-col min-h-screen bg-stone">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-16 flex-1 w-full text-center">
        <ShieldCheck size={40} className="text-navy/30 mx-auto mb-4" />
        <h1
          className="text-2xl font-bold text-navy mb-2"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Listing requires verification
        </h1>
        {state === 'unaffiliated' && (
          <p className="text-sm text-muted leading-relaxed mb-6">
            You need to join a lodge on Tyrian before you can list a business.
            Ask your lodge admin for an invite link, or browse lodges on the network.
          </p>
        )}
        {state === 'pending' && (
          <p className="text-sm text-muted leading-relaxed mb-6">
            Your sponsor hasn&apos;t confirmed your membership yet. Once verified,
            you&apos;ll be able to create your listing.
          </p>
        )}
        {(state === 'rejected' || state === 'flagged') && (
          <p className="text-sm text-muted leading-relaxed mb-6">
            Your account isn&apos;t eligible to publish a listing right now.
            Contact your lodge admin or Tyrian support for help.
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={backHref}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-navy border border-[#E5E0D5] bg-white px-5 py-2.5 rounded-xl hover:bg-stone transition-colors"
          >
            <ArrowLeft size={14} />
            {backLabel}
          </Link>
          {state === 'unaffiliated' && (
            <Link
              href="/network"
              className="inline-flex items-center justify-center text-sm font-semibold bg-navy text-[#C9A84C] px-5 py-2.5 rounded-xl hover:bg-navy/90 transition-colors"
            >
              Explore the network
            </Link>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
