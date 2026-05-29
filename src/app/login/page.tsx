'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ShieldCheck,
  Mail,
  ArrowLeft,
  CheckCircle,
  Lock,
  Loader2,
} from 'lucide-react'

type View = 'main' | 'magic-sent' | 'reset-sent'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const redirect = searchParams.get('redirect') ?? '/dashboard'
  const claimCode = searchParams.get('code')
  const authError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showForgot, setShowForgot] = useState(false)
  const [showMagicLink, setShowMagicLink] = useState(false)
  const [view, setView] = useState<View>('main')
  const [loading, setLoading] = useState<'google' | 'password' | 'magic' | 'reset' | null>(null)
  const [error, setError] = useState('')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin

  useEffect(() => {
    if (claimCode) {
      sessionStorage.setItem('tyrian_claim_code', claimCode.toUpperCase())
    }
  }, [claimCode])

  useEffect(() => {
    if (authError === 'auth_callback_failed') {
      setError('Sign in failed. Please try again.')
    }
  }, [authError])

  function callbackUrl() {
    return `${appUrl}/auth/callback?next=${encodeURIComponent(redirect)}`
  }

  function finishAuth() {
    router.push(redirect)
    router.refresh()
  }

  async function handleGoogle() {
    setLoading('google')
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl() },
    })

    if (error) {
      setError(error.message)
      setLoading(null)
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (isSignUp && password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading('password')
    const supabase = createClient()

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callbackUrl() },
      })

      if (error) {
        setError(error.message)
        setLoading(null)
        return
      }

      // If email confirmation is off, user may be signed in immediately
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        finishAuth()
      } else {
        setView('magic-sent')
        setLoading(null)
      }
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(null)
      return
    }

    finishAuth()
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading('magic')
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    })

    if (error) {
      setError(error.message)
      setLoading(null)
    } else {
      setView('magic-sent')
      setLoading(null)
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading('reset')
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`,
    })

    if (error) {
      setError(error.message)
      setLoading(null)
    } else {
      setView('reset-sent')
      setLoading(null)
    }
  }

  const inputClass =
    'w-full pl-9 pr-4 py-3 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-colors bg-white'

  return (
    <div className="min-h-screen bg-stone flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-navy transition-colors mb-6"
          >
            <ArrowLeft size={14} />
            Back to Tyrian
          </Link>
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck size={28} className="text-gold" />
            <span
              className="text-2xl font-bold text-navy tracking-wide"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Tyrian
            </span>
          </div>
          <p className="text-sm text-muted" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Members-only business network
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-8">
          {view === 'magic-sent' ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-[#E1F5EE] flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-[#2D6A4F]" />
              </div>
              <h2
                className="text-2xl font-bold text-navy mb-2"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Check your email
              </h2>
              <p className="text-muted text-sm leading-relaxed mb-4">
                We sent a {isSignUp ? 'confirmation' : 'sign-in'} link to{' '}
                <span className="font-semibold text-[#1A1A1A]">{email}</span>.
                Click the link to continue.
              </p>
              <button
                onClick={() => {
                  setView('main')
                  setShowMagicLink(false)
                }}
                className="text-sm text-navy underline hover:no-underline"
              >
                Back to sign in
              </button>
            </div>
          ) : view === 'reset-sent' ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-[#E1F5EE] flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-[#2D6A4F]" />
              </div>
              <h2
                className="text-2xl font-bold text-navy mb-2"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Check your email
              </h2>
              <p className="text-muted text-sm leading-relaxed mb-4">
                If an account exists for{' '}
                <span className="font-semibold text-[#1A1A1A]">{email}</span>, we sent a
                password reset link.
              </p>
              <button
                onClick={() => {
                  setView('main')
                  setShowForgot(false)
                }}
                className="text-sm text-navy underline hover:no-underline"
              >
                Back to sign in
              </button>
            </div>
          ) : showForgot ? (
            <>
              <h2
                className="text-2xl font-bold text-navy mb-1"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Reset password
              </h2>
              <p className="text-sm text-muted mb-6">
                Enter your email and we&apos;ll send a reset link.
              </p>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
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
                  disabled={loading === 'reset' || !email}
                  className="w-full bg-navy hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed text-[#C9A84C] font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  {loading === 'reset' ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
              <button
                onClick={() => {
                  setShowForgot(false)
                  setError('')
                }}
                className="mt-4 text-sm text-muted hover:text-navy w-full text-center"
              >
                ← Back to sign in
              </button>
            </>
          ) : (
            <>
              <h2
                className="text-2xl font-bold text-navy mb-1"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Sign in to Tyrian
              </h2>
              <p className="text-sm text-muted mb-6">
                {isSignUp ? 'Create your account to continue.' : 'Welcome back, Brother.'}
              </p>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading !== null}
                className="w-full flex items-center justify-center gap-3 bg-white border border-[#E5E0D5] hover:bg-stone disabled:opacity-50 disabled:cursor-not-allowed text-[#1A1A1A] font-medium py-3 rounded-xl transition-colors text-sm mb-5"
              >
                {loading === 'google' ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-[#E5E0D5]" />
                <span className="text-xs text-muted uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-[#E5E0D5]" />
              </div>

              <form onSubmit={handlePassword} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-[#1A1A1A]">
                      Password
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgot(true)
                          setError('')
                        }}
                        className="text-xs text-navy hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={isSignUp ? 'At least 8 characters' : 'Your password'}
                      minLength={isSignUp ? 8 : undefined}
                      className={inputClass}
                    />
                  </div>
                </div>

                {isSignUp && (
                  <div>
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                      Confirm password
                    </label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        id="confirm-password"
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
                )}

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading === 'password' || !email || !password}
                  className="w-full bg-navy hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed text-[#C9A84C] font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  {loading === 'password'
                    ? isSignUp
                      ? 'Creating account…'
                      : 'Signing in…'
                    : isSignUp
                      ? 'Create account'
                      : 'Sign in'}
                </button>
              </form>

              <p className="mt-4 text-xs text-center text-muted">
                {isSignUp ? 'Already have an account?' : 'Need an account?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(v => !v)
                    setError('')
                    setConfirmPassword('')
                  }}
                  className="text-navy underline hover:no-underline"
                >
                  {isSignUp ? 'Sign in' : 'Create one'}
                </button>
              </p>

              <div className="mt-5 pt-5 border-t border-[#E5E0D5]">
                {!showMagicLink ? (
                  <p className="text-xs text-center text-muted">
                    Prefer a magic link?{' '}
                    <button
                      type="button"
                      onClick={() => setShowMagicLink(true)}
                      className="text-navy underline hover:no-underline"
                    >
                      Send sign-in link
                    </button>
                  </p>
                ) : (
                  <form onSubmit={handleMagicLink} className="space-y-3">
                    <p className="text-xs text-muted text-center">
                      We&apos;ll email you a one-time sign-in link.
                    </p>
                    <button
                      type="submit"
                      disabled={loading === 'magic' || !email}
                      className="w-full border border-[#E5E0D5] hover:bg-stone disabled:opacity-50 disabled:cursor-not-allowed text-navy font-medium py-2.5 rounded-xl transition-colors text-sm"
                    >
                      {loading === 'magic' ? 'Sending…' : 'Send magic link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMagicLink(false)}
                      className="text-xs text-muted hover:text-navy w-full text-center"
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>

              <p className="mt-5 text-xs text-center text-muted leading-relaxed">
                Don&apos;t have a lodge on Tyrian yet?{' '}
                <Link href="/join" className="text-navy underline hover:no-underline">
                  Unlock your lodge →
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone flex items-center justify-center">
          <Loader2 size={32} className="text-navy animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
