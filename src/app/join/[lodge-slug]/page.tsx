'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

interface LodgeInfo {
  id: string
  name: string
  number: string
  city: string
  state: string
  welcome_message: string | null
  meeting_schedule: string | null
  slug: string | null
  invite_cap: number | null
}

export default function MemberJoinPage() {
  const params = useParams()
  const lodgeSlug = params['lodge-slug'] as string

  const [lodge, setLodge] = useState<LodgeInfo | null>(null)
  const [atCap, setAtCap] = useState(false)
  const [loadingLodge, setLoadingLodge] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [emailNote, setEmailNote] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    sponsorName: '',
    sponsorContact: '',
  })

  useEffect(() => {
    async function loadLodge() {
      try {
        const res = await fetch(`/api/lodge-join-info?slug=${encodeURIComponent(lodgeSlug)}`)
        if (!res.ok) {
          setNotFound(true)
          return
        }
        const data = await res.json()
        setLodge(data.lodge as LodgeInfo)
        setAtCap(!!data.atCap)
      } catch {
        setNotFound(true)
      } finally {
        setLoadingLodge(false)
      }
    }
    loadLodge()
  }, [lodgeSlug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lodge) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/member-join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lodgeSlug: lodge.slug ?? lodge.id,
          fullName: form.fullName,
          email: form.email,
          sponsorName: form.sponsorName,
          sponsorContact: form.sponsorContact,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.message || data.error || 'Something went wrong. Please try again.')
        return
      }
      if (!data.emailsConfigured) {
        setEmailNote('Note: Tyrian email is not fully configured yet. Your lodge admin may need to resend your sign-in link.')
      } else if (data.emailWarnings?.length) {
        setEmailNote('Some emails may be delayed. Check spam, or ask your lodge admin if you don\'t hear back within a few minutes.')
      }
      setSuccess(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const field = 'w-full border border-[#E5E0D5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition bg-white'

  if (loadingLodge) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center bg-stone">
          <Loader2 size={32} className="text-navy animate-spin" />
        </div>
        <Footer />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex flex-col min-h-screen bg-stone">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <AlertCircle size={40} className="text-muted mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-navy mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Lodge not found
            </h1>
            <p className="text-sm text-muted mb-4">This invite link doesn&apos;t match an active lodge on Tyrian.</p>
            <Link href="/join" className="text-sm font-semibold text-navy underline">Unlock your lodge →</Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (atCap) {
    return (
      <div className="flex flex-col min-h-screen bg-stone">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <AlertCircle size={40} className="text-gold mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-navy mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Lodge is currently full
            </h1>
            <p className="text-sm text-muted mb-4 leading-relaxed">
              {lodge!.name} has reached its {lodge!.invite_cap}-verified member limit.
              Ask your lodge admin to upgrade the plan to continue adding members.
            </p>
            <Link href="/network" className="text-sm font-semibold text-navy underline">
              Browse the network →
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex flex-col min-h-screen bg-stone">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-8 max-w-md w-full text-center">
            <div className="w-14 h-14 rounded-full bg-[#E1F5EE] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-[#2D6A4F]" />
            </div>
            <h1 className="text-2xl font-bold text-navy mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              You&apos;re in — check your email
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              We sent a sign-in link to <strong>{form.email}</strong>. Click it to finish your profile.
              Your sponsor will receive a confirmation request. Verification usually takes under 24 hours.
            </p>
            {emailNote && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
                {emailNote}
              </p>
            )}
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-stone">
      <Navbar />

      <div className="max-w-lg mx-auto px-4 py-10 flex-1 w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <ShieldCheck size={24} className="text-gold" />
            <span className="text-sm font-semibold text-muted uppercase tracking-wider">Join your lodge</span>
          </div>
          <h1 className="text-3xl font-bold text-navy mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {lodge?.name} #{lodge?.number}
          </h1>
          {lodge?.city && (
            <p className="text-sm text-muted">{lodge.city}, {lodge.state}</p>
          )}
          {lodge?.meeting_schedule && (
            <p className="text-sm text-muted mt-1">{lodge.meeting_schedule}</p>
          )}
          {lodge?.welcome_message && (
            <p className="text-sm text-[#1A1A1A] mt-4 bg-white border border-[#E5E0D5] rounded-xl p-4 leading-relaxed">
              {lodge.welcome_message}
            </p>
          )}
        </div>

        <div
          className="rounded-xl p-4 mb-6 text-sm leading-relaxed text-[#1A1A1A]"
          style={{ background: '#FAF3E0', borderLeft: '3px solid #C9A84C' }}
        >
          <p className="font-semibold text-navy mb-1">You don&apos;t need a business to join.</p>
          <p className="text-muted">
            Every verified member can browse lodge listings, post service requests, and connect with brothers
            across the network. If you have a skill or trade, your listing takes 3 minutes — and you can add it later.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Full name <span className="text-red-400">*</span></label>
            <input
              type="text"
              required
              value={form.fullName}
              onChange={e => setForm({ ...form, fullName: e.target.value })}
              placeholder="Robert C. Ingram"
              className={field}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Email <span className="text-red-400">*</span></label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="you@email.com"
              className={field}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Sponsor name <span className="text-red-400">*</span></label>
            <input
              type="text"
              required
              value={form.sponsorName}
              onChange={e => setForm({ ...form, sponsorName: e.target.value })}
              placeholder="Brother who sponsored you"
              className={field}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Sponsor email <span className="text-red-400">*</span></label>
            <input
              type="email"
              required
              value={form.sponsorContact}
              onChange={e => setForm({ ...form, sponsorContact: e.target.value })}
              placeholder="sponsor@email.com"
              className={field}
            />
            <p className="text-xs text-muted mt-1">We&apos;ll email them to confirm they sponsored you.</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-navy hover:bg-navy/90 disabled:opacity-50 text-[#C9A84C] font-bold py-3 rounded-xl transition-colors text-sm"
          >
            {submitting ? 'Submitting…' : 'Join your lodge →'}
          </button>
        </form>
      </div>

      <Footer />
    </div>
  )
}
