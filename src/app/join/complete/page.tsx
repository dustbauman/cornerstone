'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/lib/constants/categories'
import type { TradeCategory } from '@/lib/types'

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

export default function JoinCompletePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    tradeCategory: '' as TradeCategory | '',
    occupation: '',
    city: '',
    state: 'OK',
  })

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        window.location.href = '/login?redirect=/join/complete'
        return
      }
      createClient()
        .from('profiles')
        .select('city, state, trade_category, occupation')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setForm({
              tradeCategory: (data.trade_category as TradeCategory) || '',
              occupation: data.occupation || '',
              city: data.city || '',
              state: data.state || 'OK',
            })
          }
          setLoading(false)
        })
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      trade_category: form.tradeCategory || null,
      occupation: form.occupation || null,
      city: form.city || null,
      state: form.state || null,
    }).eq('id', user.id)

    setSaving(false)
    router.push('/dashboard')
  }

  const field = 'w-full border border-[#E5E0D5] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition bg-white'

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

      <div className="max-w-lg mx-auto px-4 py-10 flex-1 w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-navy mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Finish your profile
          </h1>
          <p className="text-sm text-muted">Tell your brothers a little about yourself.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Trade or skill (optional)</label>
            <select
              value={form.tradeCategory}
              onChange={e => setForm({ ...form, tradeCategory: e.target.value as TradeCategory })}
              className={`${field} bg-white`}
            >
              <option value="">Select if applicable</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Occupation (optional)</label>
            <input
              type="text"
              value={form.occupation}
              onChange={e => setForm({ ...form, occupation: e.target.value })}
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
                onChange={e => setForm({ ...form, city: e.target.value })}
                placeholder="Tulsa"
                className={field}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-1.5">State</label>
              <select
                value={form.state}
                onChange={e => setForm({ ...form, state: e.target.value })}
                className={`${field} bg-white`}
              >
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-navy hover:bg-navy/90 disabled:opacity-50 text-[#C9A84C] font-bold py-3 rounded-xl transition-colors text-sm"
          >
            {saving ? 'Saving…' : 'Continue to dashboard →'}
          </button>
        </form>

        <div className="mt-6 bg-white rounded-2xl border border-[#E5E0D5] p-5 text-center">
          <p className="text-sm font-semibold text-navy mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            List your business?
          </p>
          <p className="text-xs text-muted mb-3">Takes about 3 minutes. You can always do this later.</p>
          <Link
            href="/dashboard/listing/new"
            className="text-sm font-semibold text-navy underline hover:no-underline"
          >
            Create your listing →
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}
