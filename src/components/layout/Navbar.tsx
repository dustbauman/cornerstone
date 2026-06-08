'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Settings, ClipboardList, Network, KeyRound } from 'lucide-react'
import Logo from './Logo'
import DashboardNavDropdown from './DashboardNavDropdown'
import UserAccountMenu from './UserAccountMenu'
import { createClient } from '@/lib/supabase/client'
import { useDemoMode } from '@/lib/demo/context'
import type { Session } from '@supabase/supabase-js'

interface NavProfile {
  fullName: string
  isLodgeAdmin: boolean
  lodgeSlug: string | null
}

export default function Navbar() {
  const pathname = usePathname()
  const { isDemoMode, toggleDemo } = useDemoMode()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<NavProfile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const networkActive = pathname === '/network' || pathname.startsWith('/lodge/')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    async function loadProfile(userId: string, user: Session['user']) {
      const metaName =
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        ''

      const { data } = await supabase
        .from('profiles')
        .select('full_name, is_lodge_admin, is_co_admin, lodge_id')
        .eq('id', userId)
        .maybeSingle()

      let lodgeSlug: string | null = null
      if (data?.lodge_id) {
        const { data: lodge } = await supabase
          .from('lodges')
          .select('slug')
          .eq('id', data.lodge_id)
          .maybeSingle()
        lodgeSlug = lodge?.slug ?? data.lodge_id
      }

      setProfile({
        fullName: data?.full_name?.trim() || metaName.trim() || user.email?.split('@')[0] || 'Member',
        isLodgeAdmin: !!(data?.is_lodge_admin || data?.is_co_admin),
        lodgeSlug,
      })
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) loadProfile(session.user.id, session.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
      if (session?.user) loadProfile(session.user.id, session.user)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const isLoggedIn = !!session
  const userLabel = profile?.fullName ?? session?.user?.email ?? ''

  return (
    <nav
      className={`bg-navy sticky top-0 z-50 transition-shadow duration-200 ${
        scrolled ? 'shadow-lg border-b border-white/10' : 'shadow-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Logo variant="light" size="md" />

          <div className="hidden md:flex items-center gap-6">
            <Link href="/directory" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              Browse Directory
            </Link>
            <Link href="/requests" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              Requests
            </Link>
            <Link
              href="/network"
              className={`text-sm font-medium transition-colors ${networkActive ? 'text-white' : 'text-white/80 hover:text-white'}`}
            >
              Network
            </Link>
            <Link href="/lodges" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              For Lodges
            </Link>
            {isLoggedIn && (
              <DashboardNavDropdown
                isLodgeAdmin={!!profile?.isLodgeAdmin}
                lodgeSlug={profile?.lodgeSlug ?? null}
              />
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={toggleDemo}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-semibold tracking-[0.08em] transition-colors ${
                isDemoMode
                  ? 'border-gold/40 bg-gold text-navy'
                  : 'border-white/15 bg-white/5 text-gold hover:bg-white/10'
              }`}
              aria-label={isDemoMode ? 'Switch to live mode' : 'Switch to demo mode'}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isDemoMode ? 'bg-navy' : 'bg-gold'
                }`}
              />
              {isDemoMode ? 'DEMO' : 'LIVE'}
            </button>
            {isLoggedIn ? (
              <UserAccountMenu userLabel={userLabel} onSignOut={handleSignOut} />
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                  Sign In
                </Link>
                <Link
                  href="/login"
                  className="bg-gold hover:bg-gold-dark text-navy font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  List Your Business
                </Link>
              </div>
            )}
          </div>

          <button
            className="md:hidden text-white p-1"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-[#162238] border-t border-white/10 px-4 py-4 space-y-3">
          <Link href="/directory" className="block text-white/80 hover:text-white text-base font-medium py-2" onClick={() => setMenuOpen(false)}>
            Browse Directory
          </Link>
          <Link href="/requests" className="flex items-center gap-2 text-white/80 hover:text-white text-base font-medium py-2" onClick={() => setMenuOpen(false)}>
            <ClipboardList size={16} />
            Requests
          </Link>
          <Link
            href="/network"
            className={`flex items-center gap-2 text-base font-medium py-2 ${networkActive ? 'text-white' : 'text-white/80 hover:text-white'}`}
            onClick={() => setMenuOpen(false)}
          >
            <Network size={16} />
            Network
          </Link>
          <Link
            href="/lodges"
            className="flex items-center gap-2 text-white/80 hover:text-white text-base font-medium py-2"
            onClick={() => setMenuOpen(false)}
          >
            <KeyRound size={16} />
            For Lodges
          </Link>
          {isLoggedIn && (
            <DashboardNavDropdown
              isLodgeAdmin={!!profile?.isLodgeAdmin}
              lodgeSlug={profile?.lodgeSlug ?? null}
              variant="mobile"
              onNavigate={() => setMenuOpen(false)}
            />
          )}
          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                toggleDemo()
                setMenuOpen(false)
              }}
              className={`mb-3 flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold tracking-[0.08em] transition-colors ${
                isDemoMode
                  ? 'border-gold/40 bg-gold text-navy'
                  : 'border-white/15 bg-white/5 text-gold'
              }`}
              aria-label={isDemoMode ? 'Switch to live mode' : 'Switch to demo mode'}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isDemoMode ? 'bg-navy' : 'bg-gold'
                }`}
              />
              {isDemoMode ? 'DEMO MODE' : 'LIVE MODE'}
            </button>
            {isLoggedIn ? (
              <>
                <p className="text-white/50 text-xs px-1 pb-2 truncate">{userLabel}</p>
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 text-white/80 hover:text-white text-base font-medium py-2"
                >
                  <Settings size={16} />
                  Settings
                </Link>
                <button
                  onClick={() => { handleSignOut(); setMenuOpen(false) }}
                  className="w-full text-center bg-white/10 text-white font-semibold py-2.5 rounded-lg text-sm mt-1"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)} className="block w-full text-center bg-gold hover:bg-gold-dark text-navy font-semibold py-2.5 rounded-lg text-sm transition-colors">
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
