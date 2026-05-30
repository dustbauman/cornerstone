'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowLeft, Building2 } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createClient } from '@/lib/supabase/client'
import { normalizeWebsiteUrl } from '@/lib/url'

function AdminSettingsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromOnboarding = searchParams.get('from') === 'onboarding'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lodgeId, setLodgeId] = useState<string | null>(null)
  const [form, setForm] = useState({
    city: '',
    meeting_address: '',
    meeting_schedule: '',
    website: '',
    welcome_message: '',
  })

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

      const { data: lodge } = await supabase
        .from('lodges')
        .select('id, city, meeting_address, meeting_schedule, website, welcome_message, directory_id')
        .eq('id', profile.lodge_id)
        .single()

      if (lodge) {
        let city = lodge.city || ''
        let meetingAddress = lodge.meeting_address || ''

        if (lodge.directory_id && (!city || !meetingAddress)) {
          const { data: dir } = await supabase
            .from('lodge_directory')
            .select('city, meeting_address')
            .eq('id', lodge.directory_id)
            .maybeSingle()
          if (dir) {
            if (!city) city = dir.city || ''
            if (!meetingAddress) meetingAddress = dir.meeting_address || ''
          }
        }

        setLodgeId(lodge.id)
        setForm({
          city,
          meeting_address: meetingAddress,
          meeting_schedule: lodge.meeting_schedule || '',
          website: lodge.website || '',
          welcome_message: lodge.welcome_message || '',
        })
      }
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lodgeId) return
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('lodges')
      .update({
        city: form.city.trim(),
        meeting_address: form.meeting_address.trim() || null,
        meeting_schedule: form.meeting_schedule.trim() || null,
        website: normalizeWebsiteUrl(form.website),
        welcome_message: form.welcome_message.trim() || null,
      })
      .eq('id', lodgeId)

    setSaving(false)
    if (!error) {
      router.push(fromOnboarding ? '/admin?onboarding=true' : '/admin')
    }
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
        <Link
          href={fromOnboarding ? '/admin?onboarding=true' : '/admin'}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-navy mb-6"
        >
          <ArrowLeft size={14} />
          Back to Lodge Admin
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-navy/5 flex items-center justify-center">
            <Building2 size={20} className="text-navy" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Lodge details
            </h1>
            <p className="text-sm text-muted">Location, meeting info, and welcome message for members.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">City</label>
            <input
              type="text"
              value={form.city}
              onChange={e => setForm({ ...form, city: e.target.value })}
              placeholder="Tampa"
              className={field}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Meeting address</label>
            <input
              type="text"
              value={form.meeting_address}
              onChange={e => setForm({ ...form, meeting_address: e.target.value })}
              placeholder="123 Main St"
              className={field}
            />
            <p className="text-xs text-muted mt-1">Prefilled from the lodge directory when available.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Meeting schedule</label>
            <input
              type="text"
              value={form.meeting_schedule}
              onChange={e => setForm({ ...form, meeting_schedule: e.target.value })}
              placeholder="1st & 3rd Tuesday, 7:30 PM"
              className={field}
            />
            <p className="text-xs text-muted mt-1">Shown on your lodge page and member invite link.</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Lodge website</label>
            <input
              type="text"
              inputMode="url"
              value={form.website}
              onChange={e => setForm({ ...form, website: e.target.value })}
              placeholder="yourlodge.org"
              className={field}
            />
            <p className="text-xs text-muted mt-1">https:// is added automatically if omitted.</p>
          </div>
          <div id="welcome">
            <label className="block text-sm font-semibold text-navy mb-1.5">Welcome message</label>
            <textarea
              value={form.welcome_message}
              onChange={e => setForm({ ...form, welcome_message: e.target.value })}
              placeholder="Welcome message shown to members joining your lodge…"
              rows={4}
              className={`${field} resize-none`}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-navy hover:bg-navy/90 disabled:opacity-50 text-[#C9A84C] font-bold py-3 rounded-xl transition-colors text-sm"
          >
            {saving ? 'Saving…' : 'Save lodge details'}
          </button>
        </form>
      </div>

      <Footer />
    </div>
  )
}

export default function AdminSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <div className="flex-1 flex items-center justify-center bg-stone">
            <Loader2 size={32} className="text-navy animate-spin" />
          </div>
          <Footer />
        </div>
      }
    >
      <AdminSettingsContent />
    </Suspense>
  )
}
