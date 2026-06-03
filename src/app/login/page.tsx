'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { checkMembershipGate, isAuthBootstrapPath } from '@/lib/auth/membership-gate'
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

  const claimCode = searchParams.get('code')
  const authError = searchParams.get('error')
  // Only allow same-origin relative paths to prevent open-redirect via ?redirect=
  const redirectParam = searchParams.get('redirect')
  const redirect =
    redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')
      ? redirectParam
      : claimCode
        ? '/claim'
        : '/dashboard'
  const isClaimFlow =
    searchParams.get('mode') === 'claim' ||
    redirect.startsWith('/claim') ||
    !!claimCode

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [showMagicLink, setShowMagicLink] = useState(false)
  const [view, setView] = useState<View>('main')
  const [loading, setLoading] = useState<'google' | 'password' | 'magic' | 'reset' | null>(null)
  const [error, setError] = useState('')

  // OAuth/magic-link redirects must use the site the user is on (not a baked-in localhost build env).
  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')

  useEffect(() => {
    if (claimCode) {
      sessionStorage.setItem('tyrian_claim_code', claimCode.toUpperCase())
    }
  }, [claimCode])

  useEffect(() => {
    if (authError === 'auth_callback_failed') {
      setError('Sign in failed. Please try again.')
    }
    if (authError === 'no_membership') {
      setError(
        redirect.startsWith('/claim')
          ? 'Sign in with the same email you used at checkout, then try claiming again.'
          : 'No Tyrian account exists for this sign-in. Join through your lodge invite link first.'
      )
    }
  }, [authError, redirect])

  function callbackUrl() {
    return `${appUrl}/auth/callback?next=${encodeURIComponent(redirect)}`
  }

  async function verifySessionOrReject(): Promise<boolean> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: profile } = await supabase
      .from('profiles')
      .select('lodge_id')
      .eq('id', user.id)
      .maybeSingle()

    const gate = checkMembershipGate(profile, redirect)
    if (!gate.allowed && !isAuthBootstrapPath(redirect)) {
      await supabase.auth.signOut()
      setError(
        isClaimFlow
          ? 'Sign in with the same email you used at checkout, then try claiming again.'
          : 'No Tyrian account exists for this sign-in. Join through your lodge invite link first.'
      )
      return false
    }
    return true
  }

  function finishAuth() {
    router.push(redirect)
    router.refresh()
  }

  async function setAuthIntent(intent: 'claim' | 'join') {
    await fetch('/api/auth/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent, next: redirect }),
    })
  }

  async function handleGoogle() {
    setLoading('google')
    setError('')

    if (isClaimFlow) {
      await setAuthIntent('claim')
    }

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

    if (isClaimFlow) {
      await setAuthIntent('claim')
    }

    setLoading('password')
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(null)
      return
    }

    const allowed = await verifySessionOrReject()
    setLoading(null)
    if (!allowed) return

    finishAuth()
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading('magic')
    setError('')

    if (isClaimFlow) {
      await setAuthIntent('claim')
    }

    const res = await fetch('/api/auth/send-magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        redirectTo: callbackUrl(),
        purpose: isClaimFlow ? 'claim' : 'sign-in',
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(
        data.message || 'Could not send sign-in link. Try again or use Google sign-in.'
      )
      setLoading(null)
      return
    }

    setView('magic-sent')
    setLoading(null)
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading('reset')
    setError('')

    const res = await fetch('/api/auth/send-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.message || 'Could not send reset link.')
      setLoading(null)
      return
    }

    setView('reset-sent')
    setLoading(null)
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

        {isClaimFlow ? (
          <div className="bg-navy text-white rounded-2xl p-6 mb-4 border border-navy">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#C9A84C] mb-2">
              Lodge admin claim
            </p>
            <h2
              className="text-xl font-bold mb-2"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Sign in to claim admin access
            </h2>
            <p className="text-sm text-white/70 leading-relaxed">
              Use the same email address you used at checkout. After signing in, you&apos;ll return to
              your claim code — no need to look up your lodge again.
            </p>
          </div>
        ) : (
          <div className="bg-navy text-white rounded-2xl p-6 mb-4 border border-navy">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#C9A84C] mb-2">
              New to Tyrian?
            </p>
            <h2
              className="text-xl font-bold mb-2"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Join through your lodge
            </h2>
            <p className="text-sm text-white/70 leading-relaxed mb-4">
              Use the invite link or QR code from your lodge admin — it takes you straight to signup for your lodge.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                href="/network"
                className="inline-flex items-center justify-center bg-[#C9A84C] hover:bg-[#b8943d] text-navy font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
              >
                Browse lodges
              </Link>
              <Link
                href="/join"
                className="inline-flex items-center justify-center border border-white/25 hover:bg-white/10 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
              >
                Unlock your lodge
              </Link>
            </div>
          </div>
        )}

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
                We sent a sign-in link to{' '}
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
                {isClaimFlow ? 'Sign in to continue' : 'Sign in'}
              </h2>
              <p className="text-sm text-muted mb-6">
                {isClaimFlow
                  ? 'Sign in with the email you used when paying the lodge fee. We\'ll take you straight back to claim admin access.'
                  : 'Returning member? Sign in with the account you created through your lodge invite.'}
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
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Your password"
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
                  disabled={loading === 'password' || !email || !password}
                  className="w-full bg-navy hover:bg-navy/90 disabled:opacity-50 disabled:cursor-not-allowed text-[#C9A84C] font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  {loading === 'password' ? 'Signing in…' : 'Sign in'}
                </button>
              </form>

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

              {isClaimFlow ? (
                <p className="mt-5 text-xs text-center text-muted leading-relaxed">
                  No account yet? Use the same checkout email with Google or a magic link above.{' '}
                  <Link href="mailto:hello@tyrian.work" className="text-navy underline hover:no-underline">
                    Need help?
                  </Link>
                </p>
              ) : (
                <p className="mt-5 text-xs text-center text-muted leading-relaxed">
                  No account yet? Join through your lodge&apos;s invite link or QR code. Lodge admins can{' '}
                  <Link href="/join" className="text-navy underline hover:no-underline">
                    unlock Tyrian for your lodge
                  </Link>
                  .
                </p>
              )}
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
