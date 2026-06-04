import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { requirePlatformAdmin } from '@/lib/platform-admin'
import { ChevronLeft } from 'lucide-react'
import UserOpsPanel from './UserOpsPanel'

export const dynamic = 'force-dynamic'

export default async function OpsUserDetail({
  params,
}: {
  params: { id: string }
}) {
  const result = await requirePlatformAdmin()
  if ('error' in result) redirect('/ops/login')

  const { admin } = result

  const [{ data: profile }, { data: lodges }] = await Promise.all([
    admin
      .from('profiles')
      .select(
        'id, full_name, email, lodge_id, verification_status, is_lodge_admin, is_co_admin, trade_category, city, state, created_at'
      )
      .eq('id', params.id)
      .single(),
    admin
      .from('lodges')
      .select('id, name, number, state')
      .eq('status', 'active')
      .order('state')
      .order('number'),
  ])

  if (!profile) notFound()

  // Fetch lodge name if assigned
  let lodgeName: string | null = null
  if (profile.lodge_id) {
    const { data: l } = await admin
      .from('lodges')
      .select('name, number')
      .eq('id', profile.lodge_id)
      .single()
    if (l) lodgeName = `${l.name} #${l.number}`
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="bg-navy text-white py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/ops"
            className="inline-flex items-center gap-1 text-white/50 hover:text-white text-xs mb-3 transition-colors"
          >
            <ChevronLeft size={14} />
            Ops Dashboard
          </Link>
          <p className="text-white/50 text-sm mb-1">User</p>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {profile.full_name || profile.email || 'Unknown user'}
          </h1>
          <p className="text-white/60 mt-1 text-sm">
            {profile.email}
            {profile.trade_category && <> · {profile.trade_category}</>}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Actions panel */}
          <div className="lg:col-span-2">
            <UserOpsPanel
              userId={profile.id}
              currentLodgeId={profile.lodge_id}
              currentLodgeName={lodgeName}
              currentVerificationStatus={profile.verification_status}
              currentIsLodgeAdmin={profile.is_lodge_admin}
              currentIsCoAdmin={profile.is_co_admin}
              lodges={(lodges ?? []) as { id: string; name: string; number: string; state: string }[]}
            />
          </div>

          {/* Profile info */}
          <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-5 space-y-2 text-sm self-start">
            <h3
              className="font-bold text-navy text-sm mb-3"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Profile info
            </h3>
            <p>
              <span className="text-muted">Status:</span>{' '}
              <span className={`font-medium ${
                profile.verification_status === 'verified' ? 'text-[#2D6A4F]' :
                profile.verification_status === 'pending' ? 'text-amber-700' : 'text-gray-500'
              }`}>
                {profile.verification_status}
              </span>
            </p>
            {profile.lodge_id && (
              <p>
                <span className="text-muted">Lodge:</span>{' '}
                <Link href={`/ops/lodges/${profile.lodge_id}`} className="font-medium text-navy underline">
                  {lodgeName ?? profile.lodge_id}
                </Link>
              </p>
            )}
            {(profile.is_lodge_admin || profile.is_co_admin) && (
              <p>
                <span className="text-muted">Role:</span>{' '}
                <span className="font-medium">
                  {profile.is_lodge_admin ? 'Primary admin' : 'Co-admin'}
                </span>
              </p>
            )}
            {profile.city && (
              <p>
                <span className="text-muted">Location:</span>{' '}
                <span className="font-medium">
                  {profile.city}{profile.state ? `, ${profile.state}` : ''}
                </span>
              </p>
            )}
            {profile.created_at && (
              <p>
                <span className="text-muted">Joined:</span>{' '}
                <span className="font-medium">
                  {new Date(profile.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </p>
            )}
            <p>
              <span className="text-muted">User ID:</span>{' '}
              <span className="font-mono text-xs text-muted break-all">{profile.id}</span>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
