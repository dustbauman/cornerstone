'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { TierNudge } from '@/components/TierNudge'
import { createClient } from '@/lib/supabase/client'

const SIZE_LABELS: Record<string, string> = {
  small:    'Under 40 members',
  standard: '40–100 members',
  large:    '100+ members',
}
const SIZE_PRICES: Record<string, number> = { small: 299, standard: 499, large: 799 }

const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',
  CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',
  IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',
  ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',
  MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',
  NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',
  OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',
  TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',
  WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',
}

function ConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [memberCount, setMemberCount] = useState<number | null>(null)

  const lodgeName    = searchParams.get('lodgeName') || ''
  const lodgeNumber  = searchParams.get('lodgeNumber') || ''
  const state        = searchParams.get('state') || ''
  const directoryId  = searchParams.get('directoryId') || ''
  const payerName    = searchParams.get('payerName') || ''
  const payerEmail   = searchParams.get('payerEmail') || ''
  const isManual     = searchParams.get('isManualEntry') === '1'
  const isFoundingEligible = searchParams.get('foundingEligible') === '1'

  // size is mutable — TierNudge may change it before checkout
  const [size, setSize] = useState(searchParams.get('size') || 'standard')

  const listPrice = SIZE_PRICES[size] ?? 499
  const price = isFoundingEligible ? 1 : listPrice

  // Fetch member count from lodge_directory when a directoryId is present
  useEffect(() => {
    if (!directoryId) return
    const supabase = createClient()
    supabase
      .from('lodge_directory')
      .select('member_count')
      .eq('id', directoryId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.member_count) setMemberCount(data.member_count)
      })
  }, [directoryId])

  if (!lodgeName || !lodgeNumber || !state) {
    return (
      <div className="flex flex-col min-h-screen bg-stone">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted mb-4">No lodge details found.</p>
            <button onClick={() => router.push('/join')} className="text-navy font-semibold underline">← Start over</button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  async function handlePayment() {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lodgeName, lodgeNumber, state, size, payerName, payerEmail, directoryId: directoryId || null }),
      })

      let data: { error?: string; message?: string; url?: string } = {}
      try {
        data = await res.json()
      } catch {
        setError('Server error — payment could not start. Check your connection and try again.')
        setSubmitting(false)
        return
      }

      if (!res.ok) {
        if (data.error === 'LODGE_ALREADY_EXISTS') {
          setError(`${data.message} Return to the directory or contact support.`)
        } else if (data.error === 'LODGE_PAYMENT_PENDING') {
          setError(data.message + ' Check your email for your receipt and claim code.')
        } else {
          setError(data.message || 'Something went wrong. Please try again.')
        }
        setSubmitting(false)
        return
      }

      if (!data.url) {
        setError('Checkout did not return a redirect URL. Please try again.')
        setSubmitting(false)
        return
      }

      window.location.href = data.url
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-stone">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 sm:px-6 py-10 flex-1 w-full">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-muted hover:text-navy mb-6 transition-colors">
          <ArrowLeft size={14} /> Edit details
        </button>

        <h1 className="text-3xl font-bold text-navy mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Confirm your lodge details
        </h1>
        <p className="text-muted text-sm mb-8">Please review before completing payment.</p>

        <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-5 space-y-3">
            {[
              ['Lodge name',   lodgeName],
              ['Lodge number', `#${lodgeNumber}`],
              ['State',        STATE_NAMES[state] ?? state],
              ['Lodge size',   SIZE_LABELS[size] ?? size],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-muted">{label}</span>
                <span className="font-medium text-[#1A1A1A]">{value}</span>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-[#E5E0D5] bg-stone/50 flex items-center justify-between">
            <span className="text-sm text-muted">Platform fee</span>
            <span className="text-lg font-bold text-navy" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {isFoundingEligible && (
                <span className="text-sm font-normal text-muted line-through mr-2">${listPrice}</span>
              )}
              ${price}{' '}
              <span className="text-sm font-normal text-muted">(one-time)</span>
              {isFoundingEligible && (
                <span className="block text-xs font-normal text-[#92400E] mt-0.5">Founding Lodge pricing</span>
              )}
            </span>
          </div>
          <div className="px-6 py-3 border-t border-[#E5E0D5] flex items-center justify-between text-sm">
            <span className="text-muted">Claim code sent to</span>
            <span className="font-medium text-[#1A1A1A]">{payerEmail}</span>
          </div>
        </div>

        {/* Tier nudge — only shows when member_count is available and there's a mismatch */}
        {!isFoundingEligible && (
          <TierNudge
            memberCount={memberCount}
            selectedSize={size}
            onTierChange={setSize}
          />
        )}

        {isManual && (
          <div className="mb-5 px-4 py-3 bg-[#FAF3E0] border border-[#C9A84C]/30 rounded-xl text-xs text-[#7A5C00]">
            Your lodge was entered manually and will be added to our directory after signup.
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => router.back()}
            className="flex-1 border border-[#E5E0D5] text-navy text-sm font-medium py-3 rounded-xl hover:bg-stone transition-colors"
          >
            ← Edit details
          </button>
          <button
            onClick={handlePayment}
            disabled={submitting}
            className="flex-[2] bg-[#C9A84C] hover:bg-[#b8943d] text-navy font-bold py-3 rounded-xl disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2"
          >
            {submitting
              ? <><span className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" /> Processing…</>
              : 'Complete Payment →'
            }
          </button>
        </div>
      </div>

      <Footer />
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  )
}
