'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { CATEGORIES } from '@/lib/constants/categories'
import { US_STATES } from '@/lib/constants/states'
import type { RequestTimeline } from '@/lib/demo/requests'
import type { TradeCategory } from '@/lib/types'
import { getAuthHeaders } from '@/lib/supabase/auth-headers'

export interface EditableRequest {
  id: string
  title: string
  category: string
  city: string
  state: string
  budget?: string | null
  timeline?: string | null
  details?: string | null
  remote_eligible?: boolean
}

interface Props {
  request: EditableRequest
  onClose: () => void
  onSaved: (request: EditableRequest) => void
}

const TIMELINES: RequestTimeline[] = ['ASAP', 'Within 1 week', 'Within 1 month', 'Flexible']

export default function EditRequestModal({ request, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    title: request.title,
    category: request.category as TradeCategory,
    city: request.city,
    state: request.state,
    budget: request.budget ?? '',
    timeline: (request.timeline ?? 'Flexible') as RequestTimeline,
    details: request.details ?? '',
    remoteEligible: request.remote_eligible ?? false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.category || !form.city) return

    setSubmitting(true)
    setSubmitError('')

    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch(`/api/me/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({
          title: form.title,
          category: form.category,
          city: form.city,
          state: form.state,
          budget: form.budget,
          timeline: form.timeline,
          details: form.details,
          remoteEligible: form.remoteEligible,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setSubmitError(data.error || 'Failed to save changes')
        return
      }

      onSaved(data.request)
      onClose()
    } catch {
      setSubmitError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const field =
    'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition'

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="font-serif text-xl font-bold text-navy">Edit request</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-navy transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className={field}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as TradeCategory })}
              required
              className={`${field} bg-white`}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-navy mb-1.5">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
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
                {US_STATES.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.remoteEligible}
              onChange={(e) => setForm({ ...form, remoteEligible: e.target.checked })}
              className="w-4 h-4 accent-navy flex-shrink-0"
            />
            <span className="text-sm text-[#1A1A1A]">Can be done remotely</span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-navy mb-1.5">Budget</label>
              <input
                type="text"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className={field}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-1.5">Timeline</label>
              <select
                value={form.timeline}
                onChange={(e) => setForm({ ...form, timeline: e.target.value as RequestTimeline })}
                className={`${field} bg-white`}
              >
                {TIMELINES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Details</label>
            <textarea
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              rows={3}
              className={`${field} resize-none`}
            />
          </div>

          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {submitError}
            </p>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 border border-gray-200 text-muted font-semibold py-3 rounded-xl hover:bg-stone transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gold hover:bg-gold-dark disabled:opacity-50 text-navy font-bold py-3 rounded-xl transition-colors text-sm"
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
