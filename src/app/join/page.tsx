'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, Clock, Search } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import LodgeSearch, { US_STATES, type LodgeResult } from '@/components/lodge/LodgeSearch'
import FoundingLodgeBadge from '@/components/brand/FoundingLodgeBadge'
import { FOUNDING_TIER_1_SLOTS } from '@/lib/pricing/constants'

const SIZE_OPTIONS = [
  { value: 'small',    label: 'Under 40 members',  price: 299 },
  { value: 'standard', label: '40–100 members',    price: 499 },
  { value: 'large',    label: '100+ members',      price: 799 },
]

type LookupStatus = 'idle' | 'checking' | 'active' | 'pending' | 'not_found' | 'error'

type FoundingStatus = {
  totalRemaining: number
  pioneerRemaining: number
  charterRemaining: number
  offer: {
    programTier: 'pioneer' | 'charter'
    priceDollars: number
    label: string
    callout: string
  } | null
}

function JoinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Lookup state
  const [lookupNumber, setLookupNumber] = useState(searchParams.get('number') || '')
  const [lookupState, setLookupState] = useState(searchParams.get('state') || '')
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle')
  const [foundLodgeName, setFoundLodgeName] = useState('')
  const [foundLodgeSlug, setFoundLodgeSlug] = useState('')

  // Form state (shown after lookup returns not_found)
  const [selectedLodge, setSelectedLodge] = useState<LodgeResult | null>(null)
  const [size, setSize] = useState('standard')
  const [payerName, setPayerName] = useState('')
  const [payerEmail, setPayerEmail] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [foundingStatus, setFoundingStatus] = useState<FoundingStatus | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const showForm = lookupStatus === 'not_found' || lookupStatus === 'error'

  useEffect(() => {
    if (showForm) {
      fetch('/api/lodge-lookup?_founding=1')
        .then(r => r.json())
        .then((d: FoundingStatus & { totalRemaining?: number }) => {
          if (typeof d.totalRemaining === 'number') {
            setFoundingStatus({
              totalRemaining: d.totalRemaining,
              pioneerRemaining: d.pioneerRemaining ?? 0,
              charterRemaining: d.charterRemaining ?? 0,
              offer: d.offer ?? null,
            })
          }
        })
        .catch(() => setFoundingStatus(null))
    }
  }, [showForm])

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    if (!lookupNumber.trim() || !lookupState) return
    setLookupStatus('checking')
    try {
      const res = await fetch(`/api/lodge-lookup?number=${encodeURIComponent(lookupNumber.trim())}&state=${lookupState}`)
      const data = await res.json()
      if (!data.found) {
        setLookupStatus('not_found')
      } else if (data.status === 'active') {
        setFoundLodgeName(data.name)
        setFoundLodgeSlug(data.slug || '')
        setLookupStatus('active')
      } else {
        setFoundLodgeName(data.name)
        setLookupStatus('pending')
      }
    } catch {
      setLookupStatus('error')
    }
  }

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedLodge || !size || !payerName.trim() || !payerEmail.trim() || !confirmed) return
    setSubmitting(true)
    setSubmitError('')

    const params = new URLSearchParams({
      lodgeName: selectedLodge.name,
      lodgeNumber: selectedLodge.number,
      state: selectedLodge.state,
      size,
      payerName: payerName.trim(),
      payerEmail: payerEmail.trim(),
      directoryId: selectedLodge.id || '',
      isManualEntry: selectedLodge.isManualEntry ? '1' : '0',
      ...(foundingOffer ? { foundingProgram: foundingOffer.programTier } : {}),
    })

    router.push(`/join/confirm?${params}`)
  }

  const selectedSize = SIZE_OPTIONS.find(o => o.value === size)
  const canSubmit = selectedLodge && size && payerName.trim() && payerEmail.trim() && confirmed
  const foundingOffer = foundingStatus?.offer ?? null
  const isFoundingEligible = foundingOffer !== null
  const foundingPrice = foundingOffer?.priceDollars ?? null

  return (
    <div className="flex flex-col min-h-screen bg-stone">
      <Navbar />

      <div className="bg-navy text-white py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Unlock Tyrian for your lodge
          </h1>
          <p className="text-white/60 text-lg">First, let&apos;s check if your lodge is already on the platform.</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full">

        {/* ── Step 1: Lookup ─────────────────────────────────────────── */}
        {!showForm && (
          <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 md:p-8">
            <form onSubmit={handleLookup} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Lodge number</label>
                  <input
                    type="text"
                    value={lookupNumber}
                    onChange={e => setLookupNumber(e.target.value)}
                    placeholder="e.g. 123"
                    required
                    className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">State</label>
                  <select
                    value={lookupState}
                    onChange={e => setLookupState(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  >
                    <option value="">Select…</option>
                    {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={lookupStatus === 'checking' || !lookupNumber.trim() || !lookupState}
                className="w-full bg-navy text-[#C9A84C] font-bold py-3 rounded-xl hover:bg-navy/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {lookupStatus === 'checking' ? (
                  <><span className="w-4 h-4 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" /> Checking…</>
                ) : (
                  <><Search size={16} /> Check my lodge →</>
                )}
              </button>
            </form>

            {/* Lookup outcomes */}
            {lookupStatus === 'active' && !foundLodgeSlug && (
              <div className="mt-5 p-4 bg-[#2D6A4F]/8 border border-[#2D6A4F]/20 rounded-xl">
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  {foundLodgeName} #{lookupNumber} is on Tyrian. Ask your lodge admin for an invite link.
                </p>
              </div>
            )}

            {lookupStatus === 'active' && foundLodgeSlug && (
              <div className="mt-5 p-4 bg-[#2D6A4F]/8 border border-[#2D6A4F]/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-[#2D6A4F] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      {foundLodgeName} #{lookupNumber} · {US_STATES.find(s => s.code === lookupState)?.name} is on Tyrian.
                    </p>
                    <p className="text-sm text-muted mt-1">
                      Join with your sponsor info — no search needed.
                    </p>
                    <div className="flex flex-wrap gap-3 mt-3 text-sm">
                      <Link
                        href={`/join/${foundLodgeSlug}`}
                        className="inline-flex font-semibold text-white bg-navy hover:bg-navy/90 px-4 py-2 rounded-lg transition-colors"
                      >
                        Join {foundLodgeName} →
                      </Link>
                      <Link href="/directory" className="font-semibold text-navy underline self-center">View directory</Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {lookupStatus === 'pending' && (
              <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Clock size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A]">
                      Someone from {foundLodgeName} #{lookupNumber} started the signup process recently.
                    </p>
                    <p className="text-sm text-muted mt-1">
                      If that was you, check your email for a receipt and claim code.
                    </p>
                    <Link href="mailto:hello@tyrian.work" className="text-sm text-muted hover:text-navy mt-2 inline-block">
                      Need help? Contact support →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Signup form ────────────────────────────────────── */}
        {showForm && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-3 bg-[#2D6A4F]/8 border border-[#2D6A4F]/20 rounded-xl">
              <CheckCircle2 size={16} className="text-[#2D6A4F] flex-shrink-0" />
              <p className="text-sm text-[#1A1A1A]">
                {lookupStatus === 'not_found'
                  ? "Your lodge isn't on Tyrian yet. You can be the one to unlock it."
                  : "Couldn't verify right now — you can proceed. We'll catch any duplicates before payment."}
              </p>
            </div>

            {/* Founding callout */}
            {foundingOffer && (
              <div className="p-4 bg-[#FEF3C7] border border-[#C9A84C]/40 rounded-xl">
                <FoundingLodgeBadge
                  variant="callout"
                  label={
                    foundingOffer.programTier === 'pioneer'
                      ? 'Pioneer Founding Lodge — $99 lifetime'
                      : 'Charter Founding Lodge — $299 lifetime'
                  }
                />
                <p className="text-sm text-[#78350F] mt-2">
                  {foundingOffer.programTier === 'pioneer' ? (
                    <>
                      {foundingStatus!.pioneerRemaining} of {FOUNDING_TIER_1_SLOTS} Pioneer slots remain.
                      Pay ${foundingOffer.priceDollars} once for lifetime access — no annual fee, ever.
                    </>
                  ) : (
                    <>
                      Pioneer slots are full. {foundingStatus!.charterRemaining} Charter{' '}
                      {foundingStatus!.charterRemaining === 1 ? 'slot' : 'slots'} remain at $
                      {foundingOffer.priceDollars} — still lifetime, still no annual fee.
                    </>
                  )}
                </p>
              </div>
            )}

            <form onSubmit={handleContinue} className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 md:p-8 space-y-5">

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Your lodge *</label>
                <LodgeSearch
                  onSelect={setSelectedLodge}
                  defaultState={lookupState}
                  defaultNumber={lookupNumber}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Lodge size *</label>
                <div className="space-y-2">
                  {SIZE_OPTIONS.map(opt => (
                    <label
                      key={opt.value}
                      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-colors ${
                        size === opt.value ? 'border-navy bg-navy/5' : 'border-[#E5E0D5] hover:border-navy/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input type="radio" name="size" value={opt.value} checked={size === opt.value} onChange={() => setSize(opt.value)} className="accent-navy" />
                        <span className="text-sm font-medium text-[#1A1A1A]">{opt.label}</span>
                      </div>
                      {isFoundingEligible && foundingPrice !== null ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted line-through">${opt.price}</span>
                          <span className="text-sm font-semibold text-[#92400E]">${foundingPrice}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-navy">${opt.price}</span>
                      )}
                    </label>
                  ))}
                </div>
                <p className="text-sm text-muted mt-2">
                  One-time platform fee:{' '}
                  {isFoundingEligible && foundingOffer ? (
                    <>
                      <span className="line-through text-muted">${selectedSize?.price}</span>{' '}
                      <span className="font-semibold text-[#92400E]">${foundingPrice}</span>
                      <span className="text-[#92400E] ml-2">
                        ({foundingOffer.label} — lifetime, one-time)
                      </span>
                    </>
                  ) : (
                    <span className="font-semibold text-navy">${selectedSize?.price}</span>
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Your name *</label>
                  <input
                    type="text"
                    value={payerName}
                    onChange={e => setPayerName(e.target.value)}
                    placeholder="Robert C. Ingram"
                    required
                    className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Your email *</label>
                  <input
                    type="email"
                    value={payerEmail}
                    onChange={e => setPayerEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  />
                </div>
              </div>
              <p className="text-xs text-muted -mt-3">The claim code for your lodge admin will be sent here.</p>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={e => setConfirmed(e.target.checked)}
                  className="mt-0.5 accent-navy w-4 h-4 flex-shrink-0"
                />
                <span className="text-sm text-[#1A1A1A]">
                  I confirm I am a current dues-paying member of{' '}
                  <span className="font-semibold">{selectedLodge?.name || 'my lodge'}</span> in good standing.
                </span>
              </label>

              {submitError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className="w-full bg-[#C9A84C] hover:bg-[#b8943d] text-navy font-bold py-3.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Continue to Payment →
              </button>
            </form>

            <button
              onClick={() => { setLookupStatus('idle'); setSelectedLodge(null) }}
              className="text-sm text-muted hover:text-navy"
            >
              ← Search a different lodge
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinContent />
    </Suspense>
  )
}
