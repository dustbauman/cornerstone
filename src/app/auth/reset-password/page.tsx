'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, Lock, Loader2, CheckCircle } from 'lucide-react'

function ResetPasswordContent() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
      setCheckingSession(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 2000)
  }

  const inputClass =
    'w-full pl-9 pr-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-colors bg-white'

  return (
    <div className="min-h-screen bg-stone flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck size={28} className="text-gold" />
            <span
              className="text-2xl font-bold text-navy tracking-wide"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Tyrian
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-8">
          {checkingSession ? (
            <div className="text-center py-4">
              <Loader2 size={32} className="text-navy animate-spin mx-auto" />
            </div>
          ) : done ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-[#E1F5EE] flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-[#2D6A4F]" />
              </div>
              <h2
                className="text-2xl font-bold text-navy mb-2"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Password updated
              </h2>
              <p className="text-muted text-sm">Redirecting to your dashboard…</p>
            </div>
          ) : !hasSession ? (
            <div className="text-center">
              <h2
                className="text-2xl font-bold text-navy mb-2"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Link expired
              </h2>
              <p className="text-muted text-sm leading-relaxed mb-6">
                This reset link is invalid or has expired. Request a new one from the sign-in page.
              </p>
              <Link
                href="/login"
                className="inline-block bg-navy text-[#C9A84C] font-semibold px-6 py-3 rounded-xl text-sm"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h2
                className="text-2xl font-bold text-navy mb-1"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Set a new password
              </h2>
              <p className="text-sm text-muted mb-6">Choose a password for your Tyrian account.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                    New password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      id="new-password"
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      minLength={8}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm-new-password" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                    Confirm password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      id="confirm-new-password"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      minLength={8}
                      className={inputClass}
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="w-full bg-navy hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed text-[#C9A84C] font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone flex items-center justify-center">
          <Loader2 size={32} className="text-navy animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
