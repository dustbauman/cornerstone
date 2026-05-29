'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, UserCircle, LogOut, LayoutDashboard, ClipboardList } from 'lucide-react'
import Logo from './Logo'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

export default function Navbar() {
  const [session, setSession] = useState<Session | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const isLoggedIn = !!session
  const userLabel = session?.user?.email ?? ''

  return (
    <nav className="bg-navy sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Logo variant="light" size="sm" />

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/directory" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              Browse Directory
            </Link>
            <Link href="/requests" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              Requests
            </Link>
            {isLoggedIn && (
              <Link href="/dashboard" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                My Dashboard
              </Link>
            )}
          </div>

          {/* Auth area */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <UserCircle size={18} />
                  <span className="font-medium max-w-[140px] truncate">{userLabel}</span>
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

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white p-1"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#162238] border-t border-white/10 px-4 py-4 space-y-3">
          <Link href="/directory" className="block text-white/80 hover:text-white text-base font-medium py-2" onClick={() => setMenuOpen(false)}>
            Browse Directory
          </Link>
          <Link href="/requests" className="flex items-center gap-2 text-white/80 hover:text-white text-base font-medium py-2" onClick={() => setMenuOpen(false)}>
            <ClipboardList size={16} />
            Requests
          </Link>
          {isLoggedIn && (
            <Link href="/dashboard" className="flex items-center gap-2 text-white/80 hover:text-white text-base font-medium py-2" onClick={() => setMenuOpen(false)}>
              <LayoutDashboard size={16} />
              My Dashboard
            </Link>
          )}
          <div className="pt-2 border-t border-white/10">
            {isLoggedIn ? (
              <button
                onClick={() => { handleSignOut(); setMenuOpen(false) }}
                className="w-full text-center bg-white/10 text-white font-semibold py-2.5 rounded-lg text-sm"
              >
                Sign Out
              </button>
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
