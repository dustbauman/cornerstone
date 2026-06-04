import { redirect } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import {
  Building2, Users, AlertCircle, UserX, ChevronRight,
  LayoutDashboard, ListChecks, Eye, MessageSquare, Star,
} from 'lucide-react'
import OpsSignOut from './OpsSignOut'

export const dynamic = 'force-dynamic'

interface UnlinkedLodge {
  id: string
  name: string
  number: string
  state: string
  city: string | null
  paid_at: string | null
  status: string
}

interface OrphanUser {
  id: string
  full_name: string | null
  email: string | null
  verification_status: string
  created_at: string
}

export default async function OpsDashboard() {
  const result = await requirePlatformAdmin()
  if ('error' in result) redirect('/ops/login')

  const { admin } = result

  const [
    { data: unlinkedLodges },
    { data: orphanUsers },
    { count: totalLodges },
    { count: totalUsers },
    { count: totalListings },
  ] = await Promise.all([
    admin
      .from('lodges')
      .select('id, name, number, state, city, paid_at, status')
      .is('directory_id', null)
      .eq('status', 'active')
      .order('paid_at', { ascending: true }),
    admin
      .from('profiles')
      .select('id, full_name, email, verification_status, created_at')
      .is('lodge_id', null)
      .order('created_at', { ascending: false }),
    admin.from('lodges').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('listings').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const lodges = (unlinkedLodges ?? []) as UnlinkedLodge[]
  const users = (orphanUsers ?? []) as OrphanUser[]

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="bg-navy text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-white/50 text-sm mb-1 flex items-center gap-2">
            <LayoutDashboard size={14} aria-hidden />
            Platform Ops
          </p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Operations Console
          </h1>
          <p className="text-white/60 mt-1 text-sm">Internal — not visible to members or lodge admins.</p>
          <div className="mt-4">
            <OpsSignOut />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">

        {/* Quick nav */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { href: '/ops/listings', label: 'Listings', icon: Eye, desc: 'Deactivate / reactivate' },
            { href: '/ops/requests', label: 'Requests', icon: MessageSquare, desc: 'Withdraw / delete' },
            { href: '/ops/reviews', label: 'Reviews', icon: Star, desc: 'Remove abusive reviews' },
          ].map(({ href, label, icon: Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-4 hover:border-gold/40 hover:shadow-md transition-all group flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-navy/5 flex items-center justify-center flex-shrink-0">
                <Icon size={15} className="text-navy" />
              </div>
              <div>
                <p className="text-sm font-semibold text-navy group-hover:text-gold transition-colors">{label}</p>
                <p className="text-[11px] text-muted">{desc}</p>
              </div>
              <ChevronRight size={14} className="text-muted ml-auto flex-shrink-0" />
            </Link>
          ))}
        </div>

        {/* Platform stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted font-medium">Total lodges</p>
              <Building2 size={16} className="text-navy" />
            </div>
            <div className="text-3xl font-bold text-navy" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {totalLodges ?? 0}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted font-medium">Total users</p>
              <Users size={16} className="text-navy" />
            </div>
            <div className="text-3xl font-bold text-navy" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {totalUsers ?? 0}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted font-medium">Active listings</p>
              <Eye size={16} className="text-navy" />
            </div>
            <div className="text-3xl font-bold text-navy" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {totalListings ?? 0}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Queue 1: Unlinked lodges */}
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-amber-800 flex items-center gap-2">
                  <AlertCircle size={16} aria-hidden />
                  Lodges without directory link
                </h2>
                <p className="text-xs text-amber-700 mt-0.5">Signed up manually — need directory_id set</p>
              </div>
              <span className="text-sm font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                {lodges.length}
              </span>
            </div>

            {lodges.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <ListChecks size={28} className="mx-auto mb-2 text-[#2D6A4F] opacity-60" />
                <p className="text-sm text-muted">All active lodges are linked.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F0EBE3]">
                {lodges.map(lodge => (
                  <Link
                    key={lodge.id}
                    href={`/ops/lodges/${lodge.id}`}
                    className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-stone/50 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">
                        {lodge.name} #{lodge.number}
                      </p>
                      <p className="text-xs text-muted">
                        {lodge.city ? `${lodge.city}, ` : ''}{lodge.state}
                        {lodge.paid_at && (
                          <> · Paid {new Date(lodge.paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                        )}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-muted group-hover:text-navy flex-shrink-0 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Queue 2: Orphan users */}
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-amber-800 flex items-center gap-2">
                  <UserX size={16} aria-hidden />
                  Users without a lodge
                </h2>
                <p className="text-xs text-amber-700 mt-0.5">Stuck after failed join/claim flow</p>
              </div>
              <span className="text-sm font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                {users.length}
              </span>
            </div>

            {users.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <ListChecks size={28} className="mx-auto mb-2 text-[#2D6A4F] opacity-60" />
                <p className="text-sm text-muted">No unmatched users.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F0EBE3]">
                {users.map(user => (
                  <Link
                    key={user.id}
                    href={`/ops/users/${user.id}`}
                    className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-stone/50 transition-colors group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">
                        {user.full_name || user.email || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted">
                        {user.email}
                        {' · '}
                        <span className={`${
                          user.verification_status === 'verified' ? 'text-[#2D6A4F]' :
                          user.verification_status === 'pending' ? 'text-amber-700' : 'text-gray-500'
                        }`}>
                          {user.verification_status}
                        </span>
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-muted group-hover:text-navy flex-shrink-0 transition-colors" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
