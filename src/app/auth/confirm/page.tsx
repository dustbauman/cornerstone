'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, CheckCircle, XCircle, Loader2 } from 'lucide-react'

type Status = 'loading' | 'confirmed' | 'denied' | 'error'

function SponsorConfirmContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const action = searchParams.get('action') as 'confirm' | 'deny' | null
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token || !action) {
      setStatus('error')
      setMessage('Invalid or missing confirmation link.')
      return
    }

    fetch(`/api/sponsor-confirm?token=${token}&action=${action}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setStatus('error')
          setMessage(data.error)
        } else if (action === 'confirm') {
          setStatus('confirmed')
        } else {
          setStatus('denied')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Something went wrong. Please try again or contact your lodge admin.')
      })
  }, [token, action])

  return (
    <>
      {status === 'loading' && (
        <>
          <Loader2 size={36} className="text-navy animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-navy" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Processing…
          </h2>
        </>
      )}

      {status === 'confirmed' && (
        <>
          <div className="w-14 h-14 rounded-full bg-[#E1F5EE] flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-[#2D6A4F]" />
          </div>
          <h2 className="text-2xl font-bold text-navy mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Sponsorship confirmed
          </h2>
          <p className="text-muted text-sm leading-relaxed mb-6">
            Thank you, Brother. The member has been verified and will receive a welcome email shortly.
          </p>
          <Link href="/" className="text-sm text-navy underline hover:no-underline">
            Return to Tyrian
          </Link>
        </>
      )}

      {status === 'denied' && (
        <>
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <XCircle size={28} className="text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-navy mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Sponsorship denied
          </h2>
          <p className="text-muted text-sm leading-relaxed mb-6">
            Thank you for letting us know. The lodge administrator has been notified and the membership request will not proceed.
          </p>
          <Link href="/" className="text-sm text-navy underline hover:no-underline">
            Return to Tyrian
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <XCircle size={28} className="text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-navy mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Link not found
          </h2>
          <p className="text-muted text-sm leading-relaxed mb-6">
            {message || 'This confirmation link is invalid or has already been used.'}
          </p>
          <Link href="/" className="text-sm text-navy underline hover:no-underline">
            Return to Tyrian
          </Link>
        </>
      )}
    </>
  )
}

export default function SponsorConfirmPage() {
  return (
    <div className="min-h-screen bg-stone flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-10 max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <ShieldCheck size={24} className="text-[#C9A84C]" />
          <span
            className="text-xl font-bold text-navy"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Tyrian
          </span>
        </div>
        <Suspense fallback={
          <Loader2 size={36} className="text-navy animate-spin mx-auto" />
        }>
          <SponsorConfirmContent />
        </Suspense>
      </div>
    </div>
  )
}
