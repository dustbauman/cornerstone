'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle, Plus, X, Loader2, Globe } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES } from '@/data/listings'

const US_STATES = [
  ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],
  ['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],
  ['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
  ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],
  ['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],
  ['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
  ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
  ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],
  ['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],
  ['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming'],
]

interface FormState {
  googleUrl: string
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
  googleUrl: '', businessName: '', tradeCategory: '', city: '', state: '',
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

  function handleGoogleImport() {
    if (!form.googleUrl.trim()) return
    setGoogleImporting(true)
    setTimeout(() => {
      setGoogleImporting(false)
      // Stub — real import wired on Day 5+
    }, 1400)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data, error: insertError } = await supabase
        .from('listings')
        .insert({
          profile_id: user.id,
          business_name: form.businessName,
          description: form.description || null,
          trade_category: form.tradeCategory,
          city: form.city,
          state: form.state,
          phone: form.phone || null,
          email: form.email || null,
          website: form.website || null,
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
      router.push(`/directory/${data.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const step2Valid = form.businessName.trim() && form.tradeCategory && form.city.trim() && form.state

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

          {/* ── Step 1: Google Business URL ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-navy mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Import from Google (optional)
                </h2>
                <p className="text-sm text-muted">Paste your Google Business Profile URL to pre-fill your listing details.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Google Business Profile URL
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="url"
                      value={form.googleUrl}
                      onChange={e => set('googleUrl', e.target.value)}
                      placeholder="https://business.google.com/..."
                      className="w-full pl-9 pr-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                    />
                  </div>
                  <button
                    onClick={handleGoogleImport}
                    disabled={!form.googleUrl.trim() || googleImporting}
                    className="px-4 py-3 bg-navy text-white text-sm font-semibold rounded-xl hover:bg-navy/90 disabled:opacity-50 transition-colors"
                  >
                    {googleImporting ? <Loader2 size={16} className="animate-spin" /> : 'Import'}
                  </button>
                </div>
                {googleImporting && (
                  <p className="text-xs text-muted mt-2 flex items-center gap-1.5">
                    <Loader2 size={12} className="animate-spin" />
                    Importing from Google Business Profile…
                  </p>
                )}
                <p className="text-xs text-muted mt-2">
                  We&apos;ll pull your business name, category, location, and reviews. You can edit everything before publishing.
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
                  <option value="Other">Other</option>
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
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="(918) 555-0000"
                  className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Business email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="you@yourbusiness.com"
                  className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Website</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={e => set('website', e.target.value)}
                  placeholder="https://yourbusiness.com"
                  className="w-full px-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy"
                />
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
                <button
                  type="button"
                  onClick={() => set('remoteEligible', !form.remoteEligible)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.remoteEligible ? 'bg-navy' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.remoteEligible ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
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
