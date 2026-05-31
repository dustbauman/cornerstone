'use client'

import ProfileAvatar from '@/components/ui/ProfileAvatar'

export interface AdminMemberRow {
  id: string
  full_name: string | null
  email: string | null
  trade_category: string | null
  city: string | null
  verification_status: string
  is_lodge_admin: boolean
  is_co_admin: boolean
}

interface Props {
  member: AdminMemberRow
  showActions?: boolean
  actionLoading?: boolean
  onApprove?: () => void
  onDeny?: () => void
}

export default function MemberDirectoryRow({
  member,
  showActions,
  actionLoading,
  onApprove,
  onDeny,
}: Props) {
  return (
    <div className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-stone/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <ProfileAvatar name={member.full_name || 'Member'} size="md" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1A1A1A] truncate">
            {member.full_name || member.email || 'Unknown'}
            {(member.is_lodge_admin || member.is_co_admin) && (
              <span className="ml-2 text-[10px] bg-navy/10 text-navy font-semibold px-1.5 py-0.5 rounded">
                Admin
              </span>
            )}
          </p>
          <p className="text-xs text-muted truncate">{member.email}</p>
          {(member.trade_category || member.city) && (
            <p className="text-xs text-muted mt-0.5">
              {[member.trade_category, member.city].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
            member.verification_status === 'verified'
              ? 'bg-[#2D6A4F]/10 text-[#2D6A4F]'
              : member.verification_status === 'pending'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-500'
          }`}
        >
          {member.verification_status}
        </span>
        {showActions && onApprove && onDeny && (
          <>
            <button
              type="button"
              disabled={actionLoading}
              onClick={onApprove}
              className="text-xs font-semibold text-[#2D6A4F] border border-[#2D6A4F]/30 px-3 py-1.5 rounded-lg hover:bg-[#2D6A4F]/5 transition-colors disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={onDeny}
              className="text-xs font-semibold text-muted border border-[#E5E0D5] px-3 py-1.5 rounded-lg hover:bg-stone transition-colors disabled:opacity-50"
            >
              Deny
            </button>
          </>
        )}
      </div>
    </div>
  )
}
