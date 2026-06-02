'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle, Plus, X, Loader2, Globe } from 'lucide-react'
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

interface FormState {
  scanUrl: string
  businessName: string
  tradeCategory: string
  city: string
  state: string
  description: string
  services: string[]
  phone: string
  email: string
  website: string
  travelRadius: number
  remoteEligible: boolean
  visibility: 'public' | 'members_only'
}

const EMPTY_FORM: FormState = {
  scanUrl: '', businessName: '', tradeCategory: '', city: '', state: '',
  description: '', services: [], phone: '', email: '', website: '',
  travelRadius: 25, remoteEligible: false, visibility: 'public',
}

export default function NewListingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [serviceInput, setServiceInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [googleImporting, setGoogleImporting] = useState(false)
  const [scanError, setScanError] = useState('')
  const [contactErrors, setContactErrors] = useState<{ phone?: string; email?: string; website?: string }>({})
  const [accessState, setAccessState] = useState<MemberAccessState | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
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
    })
  }, [router])

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function addService() {
    const s = serviceInput.trim()
    if (s && !form.services.includes(s)) {
      set('services', [...form.services, s])
    }
    setServiceInput('')
  }

  function removeService(s: string) {
    set('services', form.services.filter(x => x !== s))
  }

  function handleServiceKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addService()
    }
  }

  async function handleWebsiteScan() {
    if (!form.scanUrl.trim()) return
    setGoogleImporting(true)
    setScanError('')
    try {
      const res = await fetch('/api/listing/scan-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.scanUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setScanError(data.error || 'Could not scan that website.')
        return
      }

      const r = data.result
      setForm(f => ({
        ...f,
        businessName: r.businessName || f.businessName,
        tradeCategory: r.tradeCategory || f.tradeCategory,
        city: r.city || f.city,
        state: r.state || f.state,
        description: r.description || f.description,
        services: r.services?.length ? r.services : f.services,
        phone: r.phone ? formatPhoneDisplay(r.phone) : f.phone,
        email: r.email || f.email,
        website: r.website || f.website,
      }))
      setStep(2)
    } catch {
      setScanError('Network error. Please try again.')
    } finally {
      setGoogleImporting(false)
    }
  }

  async function handleSubmit() {
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
      setError('Fix the contact fields below before publishing.')
      setSubmitting(false)
      return
    }

    const contact = {
      ok: true as const,
      phone: phoneResult.value,
      email: emailResult.value,
      website: websiteResult.value,
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
        setError('You must be lodge-verified before publishing a listing.')
        setSubmitting(false)
        return
      }

      // Geocode city/state so push-to-pro distance matching works. Best-effort:
      // a null result degrades to same-state trade matching in notifyMatchingPros.
      const coords = await resolveCityCoords(form.city, form.state)

      const { data, error: insertError } = await supabase
        .from('listings')
        .insert({
          profile_id: user.id,
          business_name: form.businessName,
          description: form.description || null,
          trade_category: form.tradeCategory,
          city: form.city,
          state: form.state,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          phone: contact.phone,
          email: contact.email,
          website: contact.website,
          services: form.services.length ? form.services : null,
          travel_radius_miles: form.travelRadius,
          remote_eligible: form.remoteEligible,
          visibility: form.visibility,
          is_active: true,
          views_count: 0,
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      await fetch('/api/listings/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: data.id }),
      })

      fetch('/api/listings/live-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: data.id }),
      }).catch(() => {})

      router.push(`/directory/${data.id}`)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const step2Valid = form.businessName.trim() && form.tradeCategory && form.city.trim() && form.state

  if (accessState === null) {
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
        {/* Back + title */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted hover:text-navy mb-6 transition-colors">
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>

        <h1 className="text-3xl font-bold text-navy mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Create your listing
        </h1>
        <p className="text-muted text-sm mb-8">Your listing appears in the Tyrian member directory and is verified by your lodge.</p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                s < step ? 'bg-[#2D6A4F] text-white' : s === step ? 'bg-navy text-[#C9A84C]' : 'bg-gray-200 text-gray-400'
              }`}>
                {s < step ? <CheckCircle size={14} /> : s}
              </div>
              {s < 3 && <div className={`h-px w-10 ${s < step ? 'bg-[#2D6A4F]' : 'bg-gray-200'}`} />}
            </div>
          ))}
          <span className="ml-2 text-xs text-muted">Step {step} of 3</span>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 md:p-8">

          {/* ── Step 1: Website scan ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-navy mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Start from your website (optional)
                </h2>
                <p className="text-sm text-muted">
                  Paste your business website and we&apos;ll pull name, location, description, services, and contact info to pre-fill your listing.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Business website
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="text"
                      inputMode="url"
                      value={form.scanUrl}
                      onChange={e => set('scanUrl', e.target.value)}
                      placeholder="yourbusiness.com"
                      className="w-full pl-9 pr-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleWebsiteScan}
                    disabled={!form.scanUrl.trim() || googleImporting}
                    className="px-4 py-3 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navy/90 disabled:opacity-50 transition-colors"
                  >
                    {googleImporting ? <Loader2 size={16} className="animate-spin" /> : 'Scan'}
                  </button>
                </div>
                {googleImporting && (
                  <p className="text-xs text-muted mt-2 flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" />
                    Reading your website and filling in details…
                  </p>
                )}
                {scanError && (
                  <p className="text-xs text-red-600 mt-2">{scanError}</p>
                )}
                <p className="text-xs text-muted mt-2">
                  You can edit everything before publishing.
                </p>
              </div>

              <div className="pt-4 border-t border-[#E5E0D5] flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="text-sm text-muted hover:text-navy transition-colors"
                >
                  Skip, enter manually →
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 bg-navy text-[#C9A84C] font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-navy/90 transition-colors"
                >
                  Continue <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Business details ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-navy mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Business details
                </h2>
                <p className="text-sm text-muted">The core information that appears on your public listing.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Business name *</label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={e => set('businessName', e.target.value)}
                  placeholder="e.g. Plumb Line Plumbing"
                  className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Trade / Profession *</label>
                <select
                  value={form.tradeCategory}
                  onChange={e => set('tradeCategory', e.target.value)}
                  className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy bg-white"
                >
                  <option value="">Select a category…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">City *</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => set('city', e.target.value)}
                    placeholder="Tulsa"
                    className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">State *</label>
                  <select
                    value={form.state}
                    onChange={e => set('state', e.target.value)}
                    className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy bg-white"
                  >
                    <option value="">Select…</option>
                    {US_STATES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  rows={4}
                  placeholder="Briefly describe your business, your experience, and what makes you the right professional for the job…"
                  className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Services offered</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={serviceInput}
                    onChange={e => setServiceInput(e.target.value)}
                    onKeyDown={handleServiceKeyDown}
                    placeholder="Add a service and press Enter…"
                    className="flex-1 px-4 py-2.5 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                  />
                  <button
                    type="button"
                    onClick={addService}
                    className="px-3 py-2.5 bg-navy text-white rounded-xl hover:bg-navy/90 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {form.services.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.services.map(s => (
                      <span key={s} className="inline-flex items-center gap-1.5 bg-navy/8 text-navy text-xs font-medium px-3 py-1.5 rounded-full border border-navy/15">
                        {s}
                        <button type="button" onClick={() => removeService(s)} className="hover:text-red-500 transition-colors">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#E5E0D5] flex justify-between">
                <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 text-sm text-muted hover:text-navy transition-colors">
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!step2Valid}
                  className="inline-flex items-center gap-2 bg-navy text-[#C9A84C] font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-navy/90 disabled:opacity-50 transition-colors"
                >
                  Continue <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Contact + settings ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-navy mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Contact & visibility
                </h2>
                <p className="text-sm text-muted">How people reach you, and who can see your listing.</p>
              </div>

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
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Business email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => { set('email', e.target.value); setContactErrors(c => ({ ...c, email: undefined })) }}
                  placeholder="you@yourbusiness.com"
                  className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                />
                {contactErrors.email && <p className="text-xs text-red-600 mt-1">{contactErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Website</label>
                <input
                  type="text"
                  inputMode="url"
                  value={form.website}
                  onChange={e => { set('website', e.target.value); setContactErrors(c => ({ ...c, website: undefined })) }}
                  placeholder="yourbusiness.com"
                  className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                />
                {contactErrors.website && <p className="text-xs text-red-600 mt-1">{contactErrors.website}</p>}
                <p className="text-xs text-muted mt-1">https:// is added automatically if omitted.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Travel radius: <span className="text-navy font-semibold">{form.travelRadius} miles</span>
                </label>
                <input
                  type="range"
                  min={5} max={200} step={5}
                  value={form.travelRadius}
                  onChange={e => set('travelRadius', parseInt(e.target.value))}
                  className="w-full accent-navy"
                />
                <div className="flex justify-between text-xs text-muted mt-1">
                  <span>5 mi</span><span>200 mi</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-b border-[#E5E0D5]">
                <div>
                  <p className="text-sm font-medium text-[#1A1A1A]">Remote / virtual work</p>
                  <p className="text-xs text-muted">I can serve clients outside my local area</p>
                </div>
                <RemoteToggle
                  checked={form.remoteEligible}
                  onChange={val => set('remoteEligible', val)}
                />
              </div>

              <div>
                <p className="text-sm font-medium text-[#1A1A1A] mb-2">Visibility</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: 'public', label: 'Public', desc: 'Visible to everyone' },
                    { val: 'members_only', label: 'Members only', desc: 'Verified Masons only' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => set('visibility', opt.val as 'public' | 'members_only')}
                      className={`text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                        form.visibility === opt.val ? 'border-navy bg-navy/5' : 'border-[#E5E0D5] hover:border-navy/30'
                      }`}
                    >
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
                <button onClick={() => setStep(2)} className="inline-flex items-center gap-2 text-sm text-muted hover:text-navy transition-colors">
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-[#C9A84C] hover:bg-[#b8943d] text-navy font-bold text-sm px-6 py-2.5 rounded-xl disabled:opacity-50 transition-colors"
                >
                  {submitting ? <><Loader2 size={15} className="animate-spin" /> Publishing…</> : 'Publish listing →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
