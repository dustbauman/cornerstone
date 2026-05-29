'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, UserCircle, LogOut, LayoutDashboard, ClipboardList, Network, Shield } from 'lucide-react'
import Logo from './Logo'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

interface NavProfile {
  fullName: string
  isLodgeAdmin: boolean
  lodgeSlug: string | null
}

export default function Navbar() {
  const pathname = usePathname()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<NavProfile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const networkActive = pathname === '/network' || pathname.startsWith('/lodge/')
  const adminActive = pathname.startsWith('/admin')

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
    <nav className="bg-navy sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Logo variant="light" size="sm" />

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
            {isLoggedIn && profile?.isLodgeAdmin && profile.lodgeSlug && (
              <Link
                href={`/lodge/${profile.lodgeSlug}`}
                className={`text-sm font-medium transition-colors ${pathname.startsWith('/lodge/') ? 'text-white' : 'text-white/80 hover:text-white'}`}
              >
                My Lodge
              </Link>
            )}
            {isLoggedIn && profile?.isLodgeAdmin && (
              <Link
                href="/admin"
                className={`text-sm font-medium transition-colors ${adminActive ? 'text-white' : 'text-white/80 hover:text-white'}`}
              >
                Lodge Admin
              </Link>
            )}
            {isLoggedIn && (
              <Link href="/dashboard" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                My Dashboard
              </Link>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <UserCircle size={18} />
                  <span className="font-medium max-w-[160px] truncate">{userLabel}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm transition-colors"
                >
                  <LogOut size={16} />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                  Sign In
                </Link>
                <Link
                  href="/join"
                  className="bg-[#C9A84C] hover:bg-[#b8943d] text-navy font-semibold text-sm px-4 py-2 rounded-lg transition-colors"
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
          {isLoggedIn && profile?.isLodgeAdmin && profile.lodgeSlug && (
            <Link href={`/lodge/${profile.lodgeSlug}`} className="flex items-center gap-2 text-white/80 hover:text-white text-base font-medium py-2" onClick={() => setMenuOpen(false)}>
              <Shield size={16} />
              My Lodge
            </Link>
          )}
          {isLoggedIn && profile?.isLodgeAdmin && (
            <Link href="/admin" className="flex items-center gap-2 text-white/80 hover:text-white text-base font-medium py-2" onClick={() => setMenuOpen(false)}>
              <Shield size={16} />
              Lodge Admin
            </Link>
          )}
          {isLoggedIn && (
            <Link href="/dashboard" className="flex items-center gap-2 text-white/80 hover:text-white text-base font-medium py-2" onClick={() => setMenuOpen(false)}>
              <LayoutDashboard size={16} />
              My Dashboard
            </Link>
          )}
          <div className="pt-2 border-t border-white/10">
            {isLoggedIn ? (
              <>
                <p className="text-white/50 text-xs px-1 pb-2 truncate">{userLabel}</p>
                <button
                  onClick={() => { handleSignOut(); setMenuOpen(false) }}
                  className="w-full text-center bg-white/10 text-white font-semibold py-2.5 rounded-lg text-sm"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link href="/login" onClick={() => setMenuOpen(false)} className="block w-full text-center bg-[#C9A84C] text-navy font-semibold py-2.5 rounded-lg text-sm">
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
