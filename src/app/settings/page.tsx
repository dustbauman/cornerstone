'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, ChevronRight, Loader2, User } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/constants/categories'
import { US_STATES } from '@/lib/constants/states'
import type { TradeCategory } from '@/lib/types'

const field =
  'w-full border border-[#E5E0D5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition bg-white'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [email, setEmail] = useState('')
  const [isLodgeAdmin, setIsLodgeAdmin] = useState(false)
  const [lodgeName, setLodgeName] = useState<string | null>(null)
  const [form, setForm] = useState({
    fullName: '',
    tradeCategory: '' as TradeCategory | '',
    occupation: '',
    city: '',
    state: 'OK',
    visibility: 'public' as 'public' | 'members_only',
  })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login?redirect=/settings'
        return
      }

      setEmail(user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select(
          'full_name, trade_category, occupation, city, state, visibility, is_lodge_admin, is_co_admin, lodge_id'
        )
        .eq('id', user.id)
        .single()

      if (profile) {
        setIsLodgeAdmin(!!(profile.is_lodge_admin || profile.is_co_admin))
        setForm({
          fullName: profile.full_name ?? '',
          tradeCategory: (profile.trade_category as TradeCategory) || '',
          occupation: profile.occupation ?? '',
          city: profile.city ?? '',
          state: profile.state ?? 'OK',
          visibility: profile.visibility === 'members_only' ? 'members_only' : 'public',
        })

        if (profile.lodge_id) {
          const { data: lodge } = await supabase
            .from('lodges')
            .select('name, number')
            .eq('id', profile.lodge_id)
            .maybeSingle()
          if (lodge) setLodgeName(`${lodge.name} #${lodge.number}`)
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.fullName.trim() || null,
        trade_category: form.tradeCategory || null,
        occupation: form.occupation.trim() || null,
        city: form.city.trim() || null,
        state: form.state || null,
        visibility: form.visibility,
      })
      .eq('id', user.id)

    setSaving(false)
    if (error) {
      setSaveError('Could not save your profile. Please try again.')
      return
    }
    setSaveSuccess(true)
    router.refresh()
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

  return (
    <div className="flex flex-col min-h-screen bg-stone">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full">
        <h1
          className="text-3xl font-bold text-navy mb-2"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Settings
        </h1>
        <p className="text-muted text-sm mb-8">Manage your account and lodge preferences.</p>

        {/* Account */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-navy/5 flex items-center justify-center">
              <User size={20} className="text-navy" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-navy" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Account
              </h2>
              <p className="text-sm text-muted">Your profile on Tyrian.</p>
            </div>
          </div>

          <form
            onSubmit={handleAccountSubmit}
            className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 space-y-4"
          >
            <div>
              <label className="block text-sm font-semibold text-navy mb-1.5">Full name</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Robert C. Ingram"
                className={field}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-1.5">Email</label>
              <input type="email" value={email} disabled className={`${field} bg-stone text-muted cursor-not-allowed`} />
              <p className="text-xs text-muted mt-1">Sign-in email cannot be changed here.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-1.5">Trade or skill (optional)</label>
              <select
                value={form.tradeCategory}
                onChange={(e) => setForm({ ...form, tradeCategory: e.target.value as TradeCategory })}
                className={`${field} bg-white`}
              >
                <option value="">Select if applicable</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-1.5">Occupation (optional)</label>
              <input
                type="text"
                value={form.occupation}
                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                placeholder="e.g. Teacher, Retired engineer"
                className={field}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className={field}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-navy mb-1.5">State</label>
                <select
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className={`${field} bg-white`}
                >
                  {US_STATES.map(([code]) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-2">Profile visibility</label>
              <div className="space-y-2">
                {[
                  {
                    val: 'public' as const,
                    label: 'Public',
                    desc: 'Visible to members and the public.',
                  },
                  {
                    val: 'members_only' as const,
                    label: 'Members only',
                    desc: 'Visible to verified Tyrian members only.',
                  },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setForm({ ...form, visibility: opt.val })}
                    className={`w-full text-left border rounded-xl p-3 transition-colors ${
                      form.visibility === opt.val
                        ? 'border-navy bg-navy/5'
                        : 'border-[#E5E0D5] hover:border-navy/30'
                    }`}
                  >
                    <p className="text-sm font-semibold text-navy">{opt.label}</p>
                    <p className="text-xs text-muted mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            {saveSuccess && <p className="text-sm text-trust font-medium">Profile saved.</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-navy hover:bg-navy/90 disabled:opacity-50 text-[#C9A84C] font-bold py-3 rounded-xl transition-colors text-sm"
            >
              {saving ? 'Saving…' : 'Save account'}
            </button>
          </form>
        </section>

        {/* Lodge */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-navy/5 flex items-center justify-center">
              <Building2 size={20} className="text-navy" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-navy" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Lodge
              </h2>
              <p className="text-sm text-muted">
                {lodgeName ? lodgeName : 'Lodge affiliation and public lodge page.'}
              </p>
            </div>
          </div>

          {isLodgeAdmin ? (
            <Link
              href="/admin/settings"
              className="flex items-center justify-between bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-5 hover:border-navy/20 transition-colors group"
            >
              <div>
                <p className="font-semibold text-navy">Lodge details</p>
                <p className="text-sm text-muted mt-1">
                  Welcome message, meeting info, website, and city for your public lodge page.
                </p>
              </div>
              <ChevronRight size={20} className="text-muted group-hover:text-navy transition-colors" />
            </Link>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-5">
              <p className="text-sm text-muted leading-relaxed">
                Lodge settings are managed by your lodge admin. If you need to update meeting
                details or your lodge&apos;s welcome message, contact your Worshipful Master or
                Secretary.
              </p>
              {!lodgeName && (
                <Link href="/network" className="inline-block mt-3 text-sm font-semibold text-navy underline">
                  Find your lodge on the network →
                </Link>
              )}
            </div>
          )}
        </section>
      </div>

      <Footer />
    </div>
  )
}
