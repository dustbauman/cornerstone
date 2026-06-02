'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, X, Loader2 } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import ListingAccessGate from '@/components/member/ListingAccessGate'
import RemoteToggle from '@/components/ui/RemoteToggle'
import PhoneInput from '@/components/ui/PhoneInput'
import { createClient } from '@/lib/supabase/client'
import { resolveCityCoords } from '@/lib/geo/city-coords-cache'
import { CATEGORIES } from '@/lib/constants/categories'
import { US_STATES } from '@/lib/constants/states'
import { validatePhone, validateEmail, validateWebsite, formatPhoneDisplay } from '@/lib/contact-fields'
import { getMemberAccessState, canCreateListing } from '@/lib/auth/member-access'
import type { MemberAccessState } from '@/lib/auth/member-access'

export default function EditListingPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [serviceInput, setServiceInput] = useState('')
  const [accessState, setAccessState] = useState<MemberAccessState | null>(null)
  const [contactErrors, setContactErrors] = useState<{ phone?: string; email?: string; website?: string }>({})

  const [form, setForm] = useState({
    businessName: '', tradeCategory: '', city: '', state: '', description: '',
    services: [] as string[], phone: '', email: '', website: '',
    travelRadius: 25, remoteEligible: false, visibility: 'public' as 'public' | 'members_only',
  })

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.auth.getUser(),
      supabase.from('listings').select('*').eq('id', id).single(),
    ]).then(async ([{ data: { user } }, { data: listing, error: fetchError }]) => {
      if (!user) { router.push('/login'); return }
      if (fetchError || !listing) { router.push('/dashboard'); return }
      if (listing.profile_id !== user.id) { router.push('/dashboard'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('lodge_id, verification_status')
        .eq('id', user.id)
        .single()

      setAccessState(
        getMemberAccessState({
          lodge_id: profile?.lodge_id ?? null,
          verification_status: profile?.verification_status ?? 'pending',
        })
      )

      setForm({
        businessName: listing.business_name ?? '',
        tradeCategory: listing.trade_category ?? '',
        city: listing.city ?? '',
        state: listing.state ?? '',
        description: listing.description ?? '',
        services: listing.services ?? [],
        phone: listing.phone ? formatPhoneDisplay(listing.phone) : '',
        email: listing.email ?? '',
        website: listing.website ?? '',
        travelRadius: listing.travel_radius_miles ?? 25,
        remoteEligible: listing.remote_eligible ?? false,
        visibility: listing.visibility ?? 'public',
      })
      setLoading(false)
    })
  }, [id, router])

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function addService() {
    const s = serviceInput.trim()
    if (s && !form.services.includes(s)) set('services', [...form.services, s])
    setServiceInput('')
  }

  function removeService(s: string) {
    set('services', form.services.filter(x => x !== s))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setContactErrors({})

    const phoneResult = validatePhone(form.phone)
    const emailResult = validateEmail(form.email)
    const websiteResult = validateWebsite(form.website)
    if (!phoneResult.ok || !emailResult.ok || !websiteResult.ok) {
      setContactErrors({
        phone: phoneResult.ok ? undefined : phoneResult.error,
        email: emailResult.ok ? undefined : emailResult.error,
        website: websiteResult.ok ? undefined : websiteResult.error,
      })
      setError('Fix the contact fields below before saving.')
      setSubmitting(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('lodge_id, verification_status')
        .eq('id', user.id)
        .single()

      if (!canCreateListing({
        lodge_id: profile?.lodge_id ?? null,
        verification_status: profile?.verification_status ?? 'pending',
      })) {
        setError('You must be lodge-verified to update a listing.')
        setSubmitting(false)
        return
      }

      // Re-geocode on save — city/state may have changed. Keeps push-to-pro
      // distance matching accurate; null degrades to same-state trade matching.
      const coords = await resolveCityCoords(form.city, form.state)

      const { error: updateError } = await supabase
        .from('listings')
        .update({
          business_name: form.businessName,
          description: form.description || null,
          trade_category: form.tradeCategory,
          city: form.city,
          state: form.state,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          phone: phoneResult.value,
          email: emailResult.value,
          website: websiteResult.value,
          services: form.services.length ? form.services : null,
          travel_radius_miles: form.travelRadius,
          remote_eligible: form.remoteEligible,
          visibility: form.visibility,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) throw updateError

      await fetch('/api/listings/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      router.push(`/directory/${id}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed. Please try again.')
      setSubmitting(false)
    }
  }

  if (loading || accessState === null) {
    return (
      <div className="flex flex-col min-h-screen bg-stone">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="text-navy animate-spin" />
        </div>
      </div>
    )
  }

  if (accessState !== 'verified') {
    return <ListingAccessGate state={accessState} />
  }

  return (
    <div className="flex flex-col min-h-screen bg-stone">
      <Navbar />
      <div className="max-w-2xl mx-auto w-full px-4 py-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted hover:text-navy mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        <h1 className="text-3xl font-bold text-navy mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Edit listing
        </h1>
        <p className="text-muted text-sm mb-8">Changes publish immediately to your public profile.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 md:p-8 space-y-5">

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Business name *</label>
            <input type="text" required value={form.businessName} onChange={e => set('businessName', e.target.value)}
              className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Trade / Profession *</label>
            <select required value={form.tradeCategory} onChange={e => set('tradeCategory', e.target.value)}
              className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy bg-white">
              <option value="">Select…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">City *</label>
              <input type="text" required value={form.city} onChange={e => set('city', e.target.value)}
                className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">State *</label>
              <select required value={form.state} onChange={e => set('state', e.target.value)}
                className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy bg-white">
                <option value="">Select…</option>
                {US_STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4}
              className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Services</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={serviceInput} onChange={e => setServiceInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addService() } }}
                placeholder="Add service, press Enter…"
                className="flex-1 px-4 py-2.5 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
              <button type="button" onClick={addService} className="px-3 py-2.5 bg-navy text-white rounded-xl hover:bg-navy/90">
                <Plus size={16} />
              </button>
            </div>
            {form.services.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.services.map(s => (
                  <span key={s} className="inline-flex items-center gap-1.5 bg-navy/8 text-navy text-xs font-medium px-3 py-1.5 rounded-full border border-navy/15">
                    {s}
                    <button type="button" onClick={() => removeService(s)} className="hover:text-red-500"><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Phone</label>
              <PhoneInput
                value={form.phone}
                onChange={val => {
                  set('phone', val)
                  setContactErrors(c => ({ ...c, phone: undefined }))
                }}
                error={contactErrors.phone}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => { set('email', e.target.value); setContactErrors(c => ({ ...c, email: undefined })) }}
                placeholder="you@yourbusiness.com"
                className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
              {contactErrors.email && <p className="text-xs text-red-600 mt-1">{contactErrors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Website</label>
              <input type="text" inputMode="url" value={form.website} onChange={e => { set('website', e.target.value); setContactErrors(c => ({ ...c, website: undefined })) }}
                placeholder="yourbusiness.com"
                className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy" />
              {contactErrors.website && <p className="text-xs text-red-600 mt-1">{contactErrors.website}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
              Travel radius: <span className="text-navy font-semibold">{form.travelRadius} miles</span>
            </label>
            <input type="range" min={5} max={200} step={5} value={form.travelRadius}
              onChange={e => set('travelRadius', parseInt(e.target.value))} className="w-full accent-navy" />
          </div>

          <div className="flex items-center justify-between py-3 border-t border-b border-[#E5E0D5]">
            <div>
              <p className="text-sm font-medium text-[#1A1A1A]">Remote / virtual work</p>
              <p className="text-xs text-muted">I can serve clients outside my local area</p>
            </div>
            <RemoteToggle checked={form.remoteEligible} onChange={val => set('remoteEligible', val)} />
          </div>

          <div>
            <p className="text-sm font-medium text-[#1A1A1A] mb-2">Visibility</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: 'public', label: 'Public', desc: 'Visible to everyone' },
                { val: 'members_only', label: 'Members only', desc: 'Verified Masons only' },
              ].map(opt => (
                <button key={opt.val} type="button" onClick={() => set('visibility', opt.val as 'public' | 'members_only')}
                  className={`text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                    form.visibility === opt.val ? 'border-navy bg-navy/5' : 'border-[#E5E0D5] hover:border-navy/30'
                  }`}>
                  <p className="text-sm font-semibold text-navy">{opt.label}</p>
                  <p className="text-xs text-muted mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="pt-4 border-t border-[#E5E0D5] flex justify-between">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted hover:text-navy transition-colors">
              <ArrowLeft size={14} /> Cancel
            </Link>
            <button type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#b8943d] text-navy font-bold text-sm px-6 py-2.5 rounded-xl disabled:opacity-50 transition-colors">
              {submitting ? <><Loader2 size={15} className="animate-spin" /> Saving…</> : 'Save changes →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
