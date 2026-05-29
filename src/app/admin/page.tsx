'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Users, ShieldCheck, CheckCircle2, Clock, Eye,
  Copy, QrCode, Mail, ChevronRight, AlertCircle,
  Building2, Loader2,
} from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

interface Lodge {
  id: string
  name: string
  number: string
  state: string
  city: string
  meeting_address: string | null
  welcome_message: string | null
  tier: string
  status: string
  paid_at: string | null
  claim_code_claimed_at: string | null
  directory_id: string | null
  slug: string | null
}

interface Member {
  id: string
  full_name: string | null
  email: string | null
  trade_category: string | null
  city: string | null
  verification_status: string
  is_lodge_admin: boolean
  is_co_admin: boolean
}

interface Stats {
  totalMembers: number
  verifiedMembers: number
  activeListings: number
  pendingApprovals: number
}

const SETUP_STEP_DEFS = [
  { key: 'claimed', label: 'Lodge claimed', href: null as string | null, hash: null as string | null },
  { key: 'city', label: 'Add lodge city & address', href: '/admin/settings', hash: null },
  { key: 'welcome', label: 'Write welcome message', href: '/admin/settings', hash: 'welcome' },
  { key: 'members', label: 'Invite first 5 members', href: null, hash: 'invite' },
  { key: 'listing', label: 'First member listing live', href: '/directory', hash: null },
]

function AdminContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const showOnboarding = searchParams.get('onboarding') === 'true'

  const [lodge, setLodge] = useState<Lodge | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [sendingInvite, setSendingInvite] = useState(false)
  const [inviteSent, setInviteSent] = useState(false)
  const [unverifiedLodges, setUnverifiedLodges] = useState<Lodge[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const supabase = createClient()
  const showDirectoryReview = process.env.NEXT_PUBLIC_PLATFORM_ADMIN === 'true'

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('lodge_id, is_lodge_admin, is_co_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.lodge_id || (!profile.is_lodge_admin && !profile.is_co_admin)) {
        setError("You don't have admin access to any lodge.")
        setLoading(false)
        return
      }

      const [
        { data: lodgeData },
        { data: membersData },
        { data: listingsData },
        unverifiedResult,
      ] = await Promise.all([
        supabase.from('lodges').select('*').eq('id', profile.lodge_id).single(),
        supabase.from('profiles').select('id, full_name, email, trade_category, city, verification_status, is_lodge_admin, is_co_admin').eq('lodge_id', profile.lodge_id),
        supabase.from('listings').select('id, profile_id').eq('is_active', true),
        showDirectoryReview
          ? supabase.from('lodges').select('*').is('directory_id', null).eq('status', 'active')
          : Promise.resolve({ data: [] as Lodge[] }),
      ])

      const lodgeMemberIds = new Set((membersData || []).map(m => m.id))
      const lodgeListings = (listingsData || []).filter(
        (l: { profile_id: string }) => lodgeMemberIds.has(l.profile_id)
      )

      setLodge(lodgeData)
      const memberList = (membersData || []) as Member[]
      setMembers(memberList)
      setStats({
        totalMembers: memberList.length,
        verifiedMembers: memberList.filter(m => m.verification_status === 'verified').length,
        activeListings: lodgeListings.length,
        pendingApprovals: memberList.filter(
          m => m.verification_status === 'pending' && !m.is_lodge_admin && !m.is_co_admin
        ).length,
      })
      if (showDirectoryReview) {
        setUnverifiedLodges((unverifiedResult.data || []) as Lodge[])
      }
      setLoading(false)

      // Generate QR code URL
      if (lodgeData) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
        const slug = lodgeData.slug ?? lodgeData.id
        const joinUrl = `${appUrl}/join/${slug}`
        try {
          const QRCode = (await import('qrcode')).default
          const dataUrl = await QRCode.toDataURL(joinUrl, { width: 256, margin: 2, color: { dark: '#1B2A4A', light: '#FFFFFF' } })
          setQrUrl(dataUrl)
        } catch { /* qrcode not critical */ }
      }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const inviteLink = lodge
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${lodge.slug ?? lodge.id}`
    : ''

  function copyInviteLink() {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleMemberAction(memberId: string, action: 'approve' | 'deny') {
    setActionLoading(memberId)
    const res = await fetch('/api/admin/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, action }),
    })
    setActionLoading(null)
    if (res.ok) {
      setMembers(prev =>
        prev.map(m =>
          m.id === memberId
            ? { ...m, verification_status: action === 'approve' ? 'verified' : 'rejected' }
            : m
        )
      )
      setStats(prev => prev ? {
        ...prev,
        verifiedMembers: action === 'approve' ? prev.verifiedMembers + 1 : prev.verifiedMembers,
        pendingApprovals: Math.max(0, prev.pendingApprovals - 1),
      } : prev)
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim() || !lodge) return
    setSendingInvite(true)
    // Placeholder — wire to Resend when keys are available
    await new Promise(r => setTimeout(r, 600))
    setSendingInvite(false)
    setInviteSent(true)
    setInviteEmail('')
    setTimeout(() => setInviteSent(false), 3000)
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center bg-stone">
          <Loader2 size={32} className="text-navy animate-spin" />
        </div>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-stone">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm px-4">
            <AlertCircle size={40} className="text-muted mx-auto mb-3" />
            <p className="text-lg font-bold text-navy mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Access Restricted</p>
            <p className="text-sm text-muted mb-4">{error}</p>
            <Link href="/claim" className="text-sm font-semibold text-navy underline">Enter a claim code →</Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const pendingMembers = members.filter(
    m => m.verification_status === 'pending' && !m.is_lodge_admin && !m.is_co_admin && m.id !== currentUserId
  )

  const setupSteps = lodge && stats ? SETUP_STEP_DEFS.map(step => {
    let done = false
    switch (step.key) {
      case 'claimed': done = !!lodge.claim_code_claimed_at; break
      case 'city': done = !!(lodge.city?.trim() && lodge.meeting_address?.trim()); break
      case 'welcome': done = !!lodge.welcome_message?.trim(); break
      case 'members': done = stats.totalMembers >= 5; break
      case 'listing': done = stats.activeListings >= 1; break
    }
    return { ...step, done }
  }) : []

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="bg-navy text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-white/50 text-sm mb-1">Lodge Admin</p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {lodge?.name} #{lodge?.number}
          </h1>
          {lodge && (
            <p className="text-white/60 mt-1 text-sm">
              {lodge.city ? `${lodge.city}, ` : ''}{lodge.state}
              {lodge.tier === 'founding' && (
                <span className="ml-2 text-[#C9A84C] font-semibold">⭐ Founding Lodge</span>
              )}
            </p>
          )}
          {lodge && (
            <Link
              href={`/lodge/${lodge.slug ?? lodge.id}`}
              className="text-sm text-white/70 hover:text-white underline mt-2 inline-block"
            >
              View public lodge page →
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">

        {/* Onboarding checklist */}
        {showOnboarding && setupSteps.length > 0 && (
          <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/25 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-navy mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Setup checklist
            </h2>
            <div className="space-y-2.5">
              {setupSteps.map(step => {
                const content = (
                  <>
                    {step.done
                      ? <CheckCircle2 size={18} className="text-[#2D6A4F] flex-shrink-0" />
                      : <div className="w-[18px] h-[18px] rounded-full border-2 border-[#E5E0D5] flex-shrink-0" />
                    }
                    <span className={`text-sm ${step.done ? 'text-muted line-through' : 'text-[#1A1A1A] font-medium'}`}>
                      {step.label}
                    </span>
                    {!step.done && step.href && (
                      <ChevronRight size={14} className="text-navy ml-auto flex-shrink-0" />
                    )}
                  </>
                )

                if (step.done || !step.href) {
                  if (!step.done && step.hash === 'invite') {
                    return (
                      <a key={step.key} href="#invite" className="flex items-center gap-3 hover:bg-white/50 rounded-lg px-2 py-1 -mx-2 transition-colors">
                        {content}
                      </a>
                    )
                  }
                  return (
                    <div key={step.key} className="flex items-center gap-3 px-2 py-1">
                      {content}
                    </div>
                  )
                }

                return (
                  <Link
                    key={step.key}
                    href={step.hash ? `${step.href}#${step.hash}` : step.href}
                    className="flex items-center gap-3 hover:bg-white/50 rounded-lg px-2 py-1 -mx-2 transition-colors"
                  >
                    {content}
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total members',     value: stats.totalMembers,     icon: Users },
              { label: 'Verified members',  value: stats.verifiedMembers,  icon: ShieldCheck },
              { label: 'Active listings',   value: stats.activeListings,   icon: Eye },
              { label: 'Pending approvals', value: stats.pendingApprovals, icon: Clock },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted font-medium">{label}</p>
                  <Icon size={16} className="text-navy" />
                </div>
                <div className="text-3xl font-bold text-navy" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">

            {/* Pending approvals */}
            {pendingMembers.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-navy" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                    Pending approvals
                  </h2>
                  <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full">
                    {pendingMembers.length} waiting
                  </span>
                </div>
                <div className="space-y-3">
                  {pendingMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between gap-3 py-3 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-[#1A1A1A]">{member.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted">{member.email}</p>
                        {member.trade_category && (
                          <p className="text-xs text-muted mt-0.5">{member.trade_category}</p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          type="button"
                          disabled={actionLoading === member.id}
                          onClick={() => handleMemberAction(member.id, 'approve')}
                          className="text-xs font-semibold text-[#2D6A4F] border border-[#2D6A4F]/30 px-3 py-1.5 rounded-lg hover:bg-[#2D6A4F]/5 transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === member.id}
                          onClick={() => handleMemberAction(member.id, 'deny')}
                          className="text-xs font-semibold text-muted border border-[#E5E0D5] px-3 py-1.5 rounded-lg hover:bg-stone transition-colors disabled:opacity-50"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member table */}
            <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-[#E5E0D5]">
                <h2 className="text-xl font-bold text-navy" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  Members ({members.length})
                </h2>
              </div>
              {members.length === 0 ? (
                <div className="px-6 py-10 text-center text-muted">
                  <Users size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No members yet. Share your invite link to get started.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center justify-between gap-3 px-6 py-3.5 hover:bg-stone/50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1A1A1A] truncate">
                          {member.full_name || member.email || 'Unknown'}
                          {(member.is_lodge_admin || member.is_co_admin) && (
                            <span className="ml-2 text-[10px] bg-navy/10 text-navy font-semibold px-1.5 py-0.5 rounded">Admin</span>
                          )}
                        </p>
                        <p className="text-xs text-muted truncate">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          member.verification_status === 'verified'
                            ? 'bg-[#2D6A4F]/10 text-[#2D6A4F]'
                            : member.verification_status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {member.verification_status}
                        </span>
                        <ChevronRight size={14} className="text-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unverified lodges (platform admin view) */}
            {showDirectoryReview && unverifiedLodges.length > 0 && (
              <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-amber-100 bg-amber-50">
                  <h2 className="text-base font-bold text-amber-800 flex items-center gap-2">
                    <AlertCircle size={16} />
                    Lodges needing directory review ({unverifiedLodges.length})
                  </h2>
                  <p className="text-xs text-amber-700 mt-0.5">These lodges signed up with manually entered details.</p>
                </div>
                <div className="divide-y divide-amber-50">
                  {unverifiedLodges.map(l => (
                    <div key={l.id} className="flex items-center justify-between gap-3 px-6 py-3.5">
                      <div>
                        <p className="text-sm font-semibold text-[#1A1A1A]">{l.name} #{l.number}</p>
                        <p className="text-xs text-muted">{l.state} · Paid {l.paid_at ? new Date(l.paid_at).toLocaleDateString() : '—'}</p>
                      </div>
                      <button className="text-xs font-semibold text-navy border border-navy/20 px-3 py-1.5 rounded-lg hover:bg-navy/5 transition-colors">
                        Mark verified
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">

            {/* Invite tools */}
            <div id="invite" className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-5">
              <h3 className="font-bold text-navy text-sm mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Invite members
              </h3>

              {/* Invite link */}
              <p className="text-xs text-muted mb-2 font-medium">Lodge invite link</p>
              <div className="flex items-center gap-2 bg-stone rounded-lg px-3 py-2 mb-3">
                <span className="text-xs text-muted font-mono flex-1 truncate">{inviteLink}</span>
                <button onClick={copyInviteLink} className="flex-shrink-0 text-navy hover:text-[#C9A84C] transition-colors">
                  <Copy size={14} />
                </button>
              </div>
              <button
                onClick={copyInviteLink}
                className="w-full py-2.5 bg-navy text-white text-xs font-semibold rounded-xl hover:bg-navy/90 transition-colors mb-4"
              >
                {copied ? '✓ Copied!' : 'Copy invite link'}
              </button>

              {/* QR code */}
              {qrUrl && (
                <div className="mb-4">
                  <p className="text-xs text-muted mb-2 font-medium">QR code</p>
                  <div className="flex items-center gap-3">
                    <Image src={qrUrl} alt="Lodge invite QR code" width={64} height={64} className="rounded-lg border border-[#E5E0D5]" unoptimized />
                    <a
                      href={qrUrl}
                      download={`tyrian-${lodge?.name?.toLowerCase().replace(/\s+/g, '-')}-qr.png`}
                      className="text-xs text-navy font-semibold underline flex items-center gap-1"
                    >
                      <QrCode size={12} />
                      Download PNG
                    </a>
                  </div>
                </div>
              )}

              {/* Email invite */}
              <p className="text-xs text-muted mb-2 font-medium">Invite by email</p>
              <form onSubmit={sendInvite} className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="brother@email.com"
                  className="flex-1 px-3 py-2 border border-[#E5E0D5] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-navy/20 focus:border-navy"
                />
                <button
                  type="submit"
                  disabled={sendingInvite || !inviteEmail.trim()}
                  className="px-3 py-2 bg-navy text-white text-xs font-semibold rounded-lg disabled:opacity-50 hover:bg-navy/90 transition-colors flex-shrink-0"
                >
                  {sendingInvite ? <Loader2 size={12} className="animate-spin" /> : inviteSent ? '✓' : <Mail size={12} />}
                </button>
              </form>
              {inviteSent && <p className="text-xs text-[#2D6A4F] mt-1">Invite sent!</p>}
            </div>

            {/* Lodge info */}
            <div className="bg-[#2D6A4F]/5 border border-[#2D6A4F]/15 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={16} className="text-[#2D6A4F]" />
                <h3 className="font-semibold text-navy text-sm">Lodge details</h3>
              </div>
              {lodge && (
                <div className="space-y-1.5 text-sm">
                  <p><span className="text-muted">Name:</span> <span className="font-medium">{lodge.name}</span></p>
                  <p><span className="text-muted">Number:</span> <span className="font-medium">#{lodge.number}</span></p>
                  <p><span className="text-muted">State:</span> <span className="font-medium">{lodge.state}</span></p>
                  <p><span className="text-muted">Tier:</span> <span className={`font-medium capitalize ${lodge.tier === 'founding' ? 'text-[#C9A84C]' : ''}`}>{lodge.tier}</span></p>
                  {lodge.paid_at && (
                    <p><span className="text-muted">Joined:</span> <span className="font-medium">{new Date(lodge.paid_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span></p>
                  )}
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

export default function AdminPage() {
  return (
    <Suspense>
      <AdminContent />
    </Suspense>
  )
}
