'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Copy, Check, Mail, Loader2 } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FoundingLodgeBadge from '@/components/brand/FoundingLodgeBadge'
import {
  foundingProgramTierFromLodgeTier,
  isFoundingProgramLodgeTier,
} from '@/lib/pricing/constants'

function SuccessContent() {
  const searchParams = useSearchParams()
  const [copied, setCopied] = useState(false)
  const [loadingSession, setLoadingSession] = useState(false)
  const [sessionError, setSessionError] = useState('')

  const sessionId = searchParams.get('session_id') || ''

  const [lodgeName, setLodgeName] = useState(searchParams.get('lodge') || '')
  const [lodgeNumber, setLodgeNumber] = useState(searchParams.get('number') || '')
  const [claimCode, setClaimCode] = useState(searchParams.get('code') || '')
  const [tier, setTier] = useState(searchParams.get('tier') || '')
  const [payerEmail, setPayerEmail] = useState(searchParams.get('email') || '')

  useEffect(() => {
    if (claimCode || !sessionId) return

    setLoadingSession(true)
    fetch(`/api/checkout/session?session_id=${encodeURIComponent(sessionId)}`)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) {
          setSessionError(data.error || 'Could not load your claim code yet.')
          return
        }
        setLodgeName(data.lodgeName || '')
        setLodgeNumber(data.lodgeNumber || '')
        setClaimCode(data.claimCode || '')
        setTier(data.tier || '')
        setPayerEmail(data.payerEmail || '')
      })
      .catch(() => setSessionError('Could not load your claim code. Check your email or use resend below.'))
      .finally(() => setLoadingSession(false))
  }, [claimCode, sessionId])

  const isFoundingProgram = isFoundingProgramLodgeTier(tier)
  const foundingProgram = foundingProgramTierFromLodgeTier(tier)

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

        {isFoundingProgram && (
          <div className="mb-5 p-4 bg-[#FEF3C7] border border-[#C9A84C]/40 rounded-xl">
            <FoundingLodgeBadge
              variant="callout"
              label={
                foundingProgram === 'charter'
                  ? "You're a Charter Founding Lodge — lifetime access secured."
                  : "You're a Pioneer Founding Lodge — one of the first nationally."
              }
            />
            <p className="text-sm text-[#78350F] mt-2">
              Your lodge carries permanent Founding Lodge designation with no annual renewal.
            </p>
          </div>
        )}

        {loadingSession && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted py-8">
            <Loader2 size={18} className="animate-spin" />
            Loading your claim code…
          </div>
        )}

        {sessionError && !claimCode && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-900">
            {sessionError} If you just paid, wait a moment and refresh — or check your email.
          </div>
        )}

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

        <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 mb-6">
          <p className="text-sm text-[#1A1A1A] leading-relaxed">
            This code unlocks your lodge&apos;s admin access on Tyrian. Forward it to your Worshipful Master or Secretary, or claim admin yourself if that&apos;s you.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Link
            href={claimCode ? `/claim?code=${claimCode}` : '/claim'}
            className={`flex-1 bg-navy text-[#C9A84C] font-bold py-3.5 rounded-xl text-sm text-center hover:bg-navy/90 transition-colors ${!claimCode ? 'pointer-events-none opacity-50' : ''}`}
          >
            Claim Admin Access →
          </Link>
          {claimCode && (
            <a
              href={mailtoLink}
              className="flex-1 flex items-center justify-center gap-2 border border-[#E5E0D5] text-navy text-sm font-medium py-3.5 rounded-xl hover:bg-stone transition-colors"
            >
              <Mail size={16} />
              Share via email
            </a>
          )}
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
