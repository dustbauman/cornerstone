'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2, Eye, EyeOff } from 'lucide-react'

export default function OpsLogin() {
  const router = useRouter()
  const [secret, setSecret] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!secret.trim()) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/ops/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secret.trim() }),
    })

    if (!res.ok) {
      setLoading(false)
      setError('Incorrect secret.')
      setSecret('')
      inputRef.current?.focus()
      return
    }

    router.push('/ops')
  }

  return (
    <div className="min-h-screen bg-stone flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full bg-navy flex items-center justify-center mx-auto mb-4">
            <Lock size={20} className="text-white" />
          </div>
          <h1
            className="text-2xl font-bold text-navy"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Platform Ops
          </h1>
          <p className="text-sm text-muted mt-1">Internal access only</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-navy mb-1.5">
              Admin secret
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={show ? 'text' : 'password'}
                value={secret}
                onChange={e => setSecret(e.target.value)}
                autoFocus
                autoComplete="current-password"
                placeholder="Enter secret"
                className="w-full px-3 py-2.5 pr-10 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-navy/20 focus:border-navy"
              />
              <button
                type="button"
                onClick={() => setShow(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy transition-colors"
                tabIndex={-1}
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !secret.trim()}
            className="w-full py-2.5 bg-navy text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-navy/90 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
