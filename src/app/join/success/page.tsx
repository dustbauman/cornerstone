'use client'
import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Copy, Check, Mail } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

function SuccessContent() {
  const searchParams = useSearchParams()
  const [copied, setCopied] = useState(false)

  // Params from stub path
  const lodgeName   = searchParams.get('lodge') || ''
  const lodgeNumber = searchParams.get('number') || ''
  const claimCode   = searchParams.get('code') || ''
  const tier        = searchParams.get('tier') || ''
  const payerEmail  = searchParams.get('email') || ''
  // Stripe path uses session_id — in that case we'd fetch the session details
  const sessionId   = searchParams.get('session_id') || ''

  const isFounding = tier === 'founding'

  function copyCode() {
    navigator.clipboard.writeText(claimCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareBody = encodeURIComponent(
    `Hi,\n\n${lodgeName} #${lodgeNumber} is now on Tyrian — a verified directory for Masonic professionals.\n\nTo claim admin access, use this code:\n\n${claimCode}\n\nClaim here: ${process.env.NEXT_PUBLIC_APP_URL || ''}/claim?code=${claimCode}\n\nBuilt on trust. Proven by the craft.\nTyrian`
  )
  const shareSubject = encodeURIComponent(`Tyrian lodge admin claim code — ${claimCode}`)
  const mailtoLink = `mailto:?subject=${shareSubject}&body=${shareBody}`

  if (!claimCode && !sessionId) {
    return (
      <div className="flex flex-col min-h-screen bg-stone">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted mb-4">No claim code found.</p>
            <Link href="/join" className="text-navy font-semibold underline">← Back to join</Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-stone">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 sm:px-6 py-10 flex-1 w-full">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-[#2D6A4F]/10 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={24} className="text-[#2D6A4F]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {lodgeName ? `${lodgeName} #${lodgeNumber} is now on Tyrian.` : 'Your lodge is now on Tyrian.'}
            </h1>
          </div>
        </div>

        {isFounding && (
          <div className="mb-5 p-4 bg-[#FEF3C7] border border-[#C9A84C]/40 rounded-xl">
            <p className="text-sm font-semibold text-[#92400E]">⭐ You&apos;re a Founding Lodge — one of the first 10 nationally.</p>
            <p className="text-sm text-[#78350F] mt-1">Your lodge will carry the Founding Lodge designation permanently.</p>
          </div>
        )}

        {/* Claim code display */}
        {claimCode && (
          <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 mb-5">
            <p className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Your lodge claim code</p>
            <div className="flex items-center justify-between gap-3 bg-stone rounded-xl px-5 py-4 mb-3">
              <span className="text-3xl font-bold tracking-[6px] text-navy font-mono">{claimCode}</span>
              <button
                onClick={copyCode}
                className="flex items-center gap-1.5 text-sm font-medium text-navy hover:text-[#C9A84C] transition-colors"
              >
                {copied ? <Check size={16} className="text-[#2D6A4F]" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-muted">Expires in 30 days</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 mb-6">
          <p className="text-sm text-[#1A1A1A] leading-relaxed">
            This code unlocks your lodge&apos;s admin access on Tyrian. Forward it to your Worshipful Master or Secretary, or claim admin yourself if that&apos;s you.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Link
            href={claimCode ? `/claim?code=${claimCode}` : '/claim'}
            className="flex-1 bg-navy text-[#C9A84C] font-bold py-3.5 rounded-xl text-sm text-center hover:bg-navy/90 transition-colors"
          >
            Claim Admin Access →
          </Link>
          <a
            href={mailtoLink}
            className="flex-1 flex items-center justify-center gap-2 border border-[#E5E0D5] text-navy text-sm font-medium py-3.5 rounded-xl hover:bg-stone transition-colors"
          >
            <Mail size={16} />
            Share via email
          </a>
        </div>

        {payerEmail && (
          <p className="text-xs text-muted text-center">
            We&apos;ve also sent this code to <span className="font-medium">{payerEmail}</span>.{' '}
            Can&apos;t find the email?{' '}
            <Link href="/claim#resend" className="text-navy underline">Resend it →</Link>
          </p>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
