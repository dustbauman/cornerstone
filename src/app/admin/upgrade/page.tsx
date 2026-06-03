'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck, Loader2, AlertCircle } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createClient } from '@/lib/supabase/client'

const TIER_LABELS: Record<string, string> = {
  founding: 'Founding',
  charter:  'Charter',
  small:    'Small ($299)',
  standard: 'Standard ($499)',
  large:    'Large ($799)',
}

const UPGRADE_OPTIONS: Record<string, { to: string; label: string; price: number; features: string[] }[]> = {
  small: [
    {
      to: 'standard',
      label: 'Standard',
      price: 200,
      features: ['Up to 100 member invites', 'Lodge analytics dashboard', 'Priority placement in Network'],
    },
    {
      to: 'large',
      label: 'Large',
      price: 500,
      features: ['Unlimited member invites', 'Lodge analytics dashboard', 'Priority placement in Network', 'Dedicated onboarding support'],
    },
  ],
  standard: [
    {
      to: 'large',
      label: 'Large',
      price: 300,
      features: ['Unlimited member invites', 'Lodge analytics dashboard', 'Priority placement in Network', 'Dedicated onboarding support'],
    },
  ],
}

interface LodgeSummary {
  id: string
  name: string
  number: string
  tier: string
  invite_cap: number | null
}

interface LodgeUpgradeState {
  lodge: LodgeSummary
  verifiedCount: number
}

export default function UpgradePage() {
  const router = useRouter()
  const [lodgeState, setLodgeState] = useState<LodgeUpgradeState | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('lodge_id, is_lodge_admin, is_co_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.lodge_id || (!profile.is_lodge_admin && !profile.is_co_admin)) {
        router.push('/admin')
        return
      }

      if (!profile.is_lodge_admin) {
        router.push('/admin')
        return
      }

      const [{ data: lodgeData }, { count: verifiedCount }] = await Promise.all([
        supabase
          .from('lodges')
          .select('id, name, number, tier, invite_cap')
          .eq('id', profile.lodge_id)
          .single(),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('lodge_id', profile.lodge_id)
          .eq('verification_status', 'verified'),
      ])

      if (lodgeData) {
        setLodgeState({ lodge: lodgeData, verifiedCount: verifiedCount ?? 0 })
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function handleUpgrade(toTier: string, price: number) {
    if (!lodgeState) return
    const lodge = lodgeState.lodge
    setSubmitting(toTier)
    setError('')

    try {
      const res = await fetch('/api/create-upgrade-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lodgeId: lodge.id, fromTier: lodge.tier, toTier, price }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.message || 'Could not start checkout. Please try again.')
        setSubmitting(null)
        return
      }
      window.location.href = data.url
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(null)
    }
  }

  if (loading) {
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

  const lodge = lodgeState?.lodge ?? null
  const options = lodge ? UPGRADE_OPTIONS[lodge.tier] : null

  if (!lodgeState || !options) {
    return (
      <div className="flex flex-col min-h-screen bg-stone">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <ShieldCheck size={40} className="text-muted mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-navy mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              No upgrades available
            </h1>
            <p className="text-sm text-muted mb-4">
              {lodge?.tier === 'large' || lodge?.tier === 'founding' || lodge?.tier === 'charter'
                ? 'Your lodge is already on the highest tier with unlimited invites.'
                : 'Upgrade options are not available for your current plan.'}
            </p>
            <Link href="/admin" className="text-sm font-semibold text-navy underline">← Back to admin</Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const { lodge: activeLodge, verifiedCount: used } = lodgeState
  const cap = activeLodge.invite_cap

  return (
    <div className="flex flex-col min-h-screen bg-stone">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted hover:text-navy mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to admin
        </Link>

        <h1 className="text-3xl font-bold text-navy mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Upgrade your lodge
        </h1>
        <p className="text-muted text-sm mb-8">You only pay the difference from what you&apos;ve already paid.</p>

        {/* Current plan summary */}
        <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-5 mb-6">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Current plan</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-navy">{activeLodge.name} #{activeLodge.number}</p>
              <p className="text-sm text-muted capitalize">{TIER_LABELS[activeLodge.tier] ?? activeLodge.tier}</p>
            </div>
            {cap !== null && (
              <div className="text-right">
                <p className="text-sm font-semibold text-navy">{used} / {cap}</p>
                <p className="text-xs text-muted">verified members</p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          {options.map(opt => (
            <div key={opt.to} className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold text-navy" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    Upgrade to {opt.label}
                  </h2>
                  <p className="text-sm text-muted mt-0.5">Unlimited member invites and more</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-navy" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    ${opt.price}
                  </p>
                  <p className="text-xs text-muted">difference only</p>
                </div>
              </div>

              <ul className="space-y-1.5 mb-5">
                {opt.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[#1A1A1A]">
                    <ShieldCheck size={14} className="text-[#2D6A4F] flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(opt.to, opt.price)}
                disabled={submitting === opt.to}
                className="w-full py-3 bg-gold hover:bg-[#b8943d] text-navy font-bold rounded-xl transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting === opt.to
                  ? <><span className="w-4 h-4 border-2 border-navy border-t-transparent rounded-full animate-spin" /> Processing…</>
                  : `Upgrade now — $${opt.price} →`
                }
              </button>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  )
}
