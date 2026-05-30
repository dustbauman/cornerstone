'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createClient } from '@/lib/supabase/client'

type ClaimState = 'idle' | 'submitting' | 'success' | 'error'
type ClaimError = 'not_found' | 'expired' | 'claimed' | 'unknown'

function ClaimContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [code, setCode] = useState((searchParams.get('code') || '').toUpperCase())
  const [claimState, setClaimState] = useState<ClaimState>('idle')
  const [claimError, setClaimError] = useState<ClaimError | null>(null)
  const [claimedLodge, setClaimedLodge] = useState<{ name: string; number: string } | null>(null)
  const [autoAttempted, setAutoAttempted] = useState(false)

  const [resendEmail, setResendEmail] = useState('')
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle')

  const submitClaim = useCallback(async (claimCode: string) => {
    const trimmed = claimCode.trim().toUpperCase()
    if (!trimmed) return

    setClaimState('submitting')
    setClaimError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      sessionStorage.setItem('tyrian_claim_code', trimmed)
      router.push(`/login?redirect=${encodeURIComponent('/claim')}&code=${encodeURIComponent(trimmed)}&mode=claim`)
      setClaimState('idle')
      return
    }

    const res = await fetch('/api/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimCode: trimmed }),
    })

    const data = await res.json()

    if (res.status === 401) {
      sessionStorage.setItem('tyrian_claim_code', trimmed)
      router.push(`/login?redirect=${encodeURIComponent('/claim')}&code=${encodeURIComponent(trimmed)}&mode=claim`)
      setClaimState('idle')
      return
    }

    if (!res.ok) {
      setClaimState('error')
      if (data.error === 'NOT_FOUND') setClaimError('not_found')
      else if (data.error === 'EXPIRED') setClaimError('expired')
      else if (data.error === 'ALREADY_CLAIMED') setClaimError('claimed')
      else setClaimError('unknown')
      return
    }

    setClaimedLodge(data.lodge)
    setClaimState('success')
    sessionStorage.removeItem('tyrian_claim_code')
  }, [router])

  // Restore code from sessionStorage / URL, auto-claim after login
  useEffect(() => {
    if (autoAttempted) return

    const storedCode = sessionStorage.getItem('tyrian_claim_code')
    const urlCode = searchParams.get('code')
    const codeToUse = (storedCode || urlCode || '').toUpperCase()

    if (codeToUse) {
      setCode(codeToUse)
      setAutoAttempted(true)
      submitClaim(codeToUse)
    }
  }, [autoAttempted, searchParams, submitClaim])

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault()
    await submitClaim(code)
  }

  async function handleResend(e: React.FormEvent) {
    e.preventDefault()
    if (!resendEmail.trim()) return
    setResendState('sending')
    await fetch('/api/resend-claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: resendEmail.trim().toLowerCase() }),
    })
    setResendState('sent')
  }

  return (
    <div className="flex flex-col min-h-screen bg-stone">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 sm:px-6 py-10 flex-1 w-full space-y-8">

        <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-navy/5 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={20} className="text-navy" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Claim your lodge admin access
              </h1>
              <p className="text-sm text-muted mt-0.5">Enter the claim code from your payment confirmation email.</p>
            </div>
          </div>

          {claimState === 'success' && claimedLodge ? (
            <div className="text-center py-4">
              <CheckCircle2 size={40} className="text-[#2D6A4F] mx-auto mb-3" />
              <p className="text-lg font-bold text-navy mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                You&apos;re now the admin for {claimedLodge.name} #{claimedLodge.number}.
              </p>
              <p className="text-sm text-muted mb-5">Let&apos;s get your lodge set up.</p>
              <Link
                href="/admin?onboarding=true"
                className="inline-block bg-navy text-[#C9A84C] font-bold px-6 py-3 rounded-xl hover:bg-navy/90 transition-colors text-sm"
              >
                Go to Lodge Admin →
              </Link>
            </div>
          ) : (
            <form onSubmit={handleClaim} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="ACE-4471"
                  maxLength={8}
                  disabled={claimState === 'submitting'}
                  className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-lg font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy uppercase disabled:opacity-50"
                />
              </div>

              {claimState === 'error' && claimError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>
                    {claimError === 'not_found' && "That code doesn't match any lodge. Double-check the code or resend it below."}
                    {claimError === 'expired' && "This code has expired. Enter the email used at payment below to receive a new one."}
                    {claimError === 'claimed' && (
                      <>This lodge has already been claimed. If you need admin access, contact your lodge admin or <Link href="mailto:hello@tyrian.work" className="underline">reach out to support</Link>.</>
                    )}
                    {claimError === 'unknown' && "Something went wrong. Please try again or contact support."}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={claimState === 'submitting' || !code.trim()}
                className="w-full bg-navy text-[#C9A84C] font-bold py-3 rounded-xl disabled:opacity-50 hover:bg-navy/90 transition-colors flex items-center justify-center gap-2"
              >
                {claimState === 'submitting'
                  ? <><Loader2 size={16} className="animate-spin" /> Verifying…</>
                  : 'Claim Access →'
                }
              </button>
            </form>
          )}
        </div>

        <div id="resend" className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 md:p-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-px bg-[#E5E0D5]" />
            <span className="text-xs text-muted font-medium px-3">Lost your claim code?</span>
            <div className="flex-1 h-px bg-[#E5E0D5]" />
          </div>

          <p className="text-sm text-muted mt-4 mb-4">
            Enter the email address you used when you paid the lodge fee. We&apos;ll resend the code if we find an active lodge.
          </p>

          {resendState === 'sent' ? (
            <div className="flex items-start gap-2 p-3 bg-[#2D6A4F]/8 border border-[#2D6A4F]/20 rounded-xl text-sm text-[#1A1A1A]">
              <CheckCircle2 size={16} className="text-[#2D6A4F] flex-shrink-0 mt-0.5" />
              If we have an active lodge for that email, the claim code is on its way. Check your inbox and spam folder.
            </div>
          ) : (
            <form onSubmit={handleResend} className="flex gap-2">
              <input
                type="email"
                value={resendEmail}
                onChange={e => setResendEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="flex-1 px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
              />
              <button
                type="submit"
                disabled={resendState === 'sending' || !resendEmail.trim()}
                className="px-4 py-3 bg-navy text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-navy/90 transition-colors flex-shrink-0"
              >
                {resendState === 'sending' ? <Loader2 size={16} className="animate-spin" /> : 'Resend →'}
              </button>
            </form>
          )}
        </div>

      </div>

      <Footer />
    </div>
  )
}

export default function ClaimPage() {
  return (
    <Suspense>
      <ClaimContent />
    </Suspense>
  )
}
