import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { ChevronLeft } from 'lucide-react'
import LodgeLinkPanel from './LodgeLinkPanel'

export const dynamic = 'force-dynamic'

interface Member {
  id: string
  full_name: string | null
  email: string | null
  verification_status: string
  is_lodge_admin: boolean
  is_co_admin: boolean
}

export default async function OpsLodgeDetail({
  params,
}: {
  params: { id: string }
}) {
  const result = await requirePlatformAdmin()
  if ('error' in result) redirect('/ops/login')

  const { admin } = result

  const [{ data: lodge }, { data: members }] = await Promise.all([
    admin
      .from('lodges')
      .select(
        'id, name, number, state, city, status, tier, paid_at, directory_id, claim_code_claimed_at, slug, meeting_address, website'
      )
      .eq('id', params.id)
      .single(),
    admin
      .from('profiles')
      .select('id, full_name, email, verification_status, is_lodge_admin, is_co_admin')
      .eq('lodge_id', params.id)
      .order('is_lodge_admin', { ascending: false }),
  ])

  if (!lodge) notFound()

  const memberList = (members ?? []) as Member[]

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="bg-navy text-white py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/ops"
            className="inline-flex items-center gap-1 text-white/50 hover:text-white text-xs mb-3 transition-colors"
          >
            <ChevronLeft size={14} />
            Ops Dashboard
          </Link>
          <p className="text-white/50 text-sm mb-1">Lodge · {lodge.status}</p>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {lodge.name} #{lodge.number}
          </h1>
          <p className="text-white/60 mt-1 text-sm">
            {lodge.city ? `${lodge.city}, ` : ''}
            {lodge.state}
            {lodge.paid_at && (
              <> · Paid {new Date(lodge.paid_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</>
            )}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Directory link panel */}
          <div className="lg:col-span-2">
            <LodgeLinkPanel lodge={lodge} />
          </div>

          {/* Lodge info + members */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-5 space-y-2 text-sm">
              <h3 className="font-bold text-navy text-sm mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Lodge info
              </h3>
              <p><span className="text-muted">Tier:</span> <span className="font-medium capitalize">{lodge.tier}</span></p>
              <p><span className="text-muted">Status:</span> <span className="font-medium capitalize">{lodge.status}</span></p>
              <p>
                <span className="text-muted">Claimed:</span>{' '}
                <span className="font-medium">
                  {lodge.claim_code_claimed_at
                    ? new Date(lodge.claim_code_claimed_at).toLocaleDateString()
                    : 'No'}
                </span>
              </p>
              {lodge.website && (
                <p>
                  <span className="text-muted">Website:</span>{' '}
                  <a href={lodge.website} target="_blank" rel="noopener noreferrer" className="font-medium text-navy underline truncate">
                    {lodge.website.replace(/^https?:\/\//, '')}
                  </a>
                </p>
              )}
              {lodge.meeting_address && (
                <p><span className="text-muted">Address:</span> <span className="font-medium">{lodge.meeting_address}</span></p>
              )}
            </div>

            {/* Members */}
            <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E5E0D5]">
                <h3 className="font-bold text-navy text-sm" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Members ({memberList.length})
                </h3>
              </div>
              {memberList.length === 0 ? (
                <p className="text-xs text-muted px-5 py-4">No members yet.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {memberList.map(m => (
                    <Link
                      key={m.id}
                      href={`/ops/users/${m.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-stone/50 transition-colors group"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-1.5">
                          {m.full_name || m.email || 'Unknown'}
                          {m.is_lodge_admin && (
                            <span className="text-[9px] bg-navy/10 text-navy font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                              Admin
                            </span>
                          )}
                          {m.is_co_admin && !m.is_lodge_admin && (
                            <span className="text-[9px] bg-navy/10 text-navy font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                              Co-admin
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted">{m.email}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        m.verification_status === 'verified'
                          ? 'bg-[#2D6A4F]/10 text-[#2D6A4F]'
                          : m.verification_status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {m.verification_status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
