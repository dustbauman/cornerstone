'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, Trash2, Building2 } from 'lucide-react'

interface Lodge {
  id: string
  name: string
  number: string
  state: string
}

interface Props {
  userId: string
  currentLodgeId: string | null
  currentLodgeName: string | null
  currentVerificationStatus: string
  currentIsLodgeAdmin: boolean
  currentIsCoAdmin: boolean
  lodges: Lodge[]
}

export default function UserOpsPanel({
  userId,
  currentLodgeId,
  currentLodgeName,
  currentVerificationStatus,
  currentIsLodgeAdmin,
  currentIsCoAdmin,
  lodges,
}: Props) {
  const router = useRouter()
  const [selectedLodgeId, setSelectedLodgeId] = useState(currentLodgeId ?? '')
  const [verificationStatus, setVerificationStatus] = useState(currentVerificationStatus)
  const [isLodgeAdmin, setIsLodgeAdmin] = useState(currentIsLodgeAdmin)
  const [isCoAdmin, setIsCoAdmin] = useState(currentIsCoAdmin)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function saveChanges() {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const patch: Record<string, string | boolean | null> = {}
      if (selectedLodgeId !== (currentLodgeId ?? '')) {
        patch.lodge_id = selectedLodgeId || null
      }
      if (verificationStatus !== currentVerificationStatus) {
        patch.verification_status = verificationStatus
      }
      if (isLodgeAdmin !== currentIsLodgeAdmin) patch.is_lodge_admin = isLodgeAdmin
      if (isCoAdmin !== currentIsCoAdmin) patch.is_co_admin = isCoAdmin
      if (Object.keys(patch).length === 0) {
        setError('No changes to save.')
        return
      }
      const res = await fetch(`/api/ops/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Save failed')
        return
      }
      setSaved(true)
      setTimeout(() => router.refresh(), 800)
    } finally {
      setSaving(false)
    }
  }

  async function deleteAccount() {
    const confirmed = prompt(
      `Type the user's email to confirm deletion:`
    )
    if (!confirmed) return
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/ops/users/${userId}`, { method: 'DELETE' })
      if (!res.ok) {
        setError('Delete failed')
        return
      }
      router.push('/ops')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">

      {/* Lodge assignment */}
      <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6">
        <h2
          className="text-xl font-bold text-navy mb-1"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Lodge assignment
        </h2>
        <p className="text-xs text-muted mb-5">
          {currentLodgeId
            ? `Currently assigned to ${currentLodgeName ?? currentLodgeId}`
            : 'No lodge assigned — user is orphaned.'}
        </p>

        <div className="flex items-center gap-2 mb-1">
          <Building2 size={14} className="text-muted" />
          <label className="text-xs font-semibold text-navy">Assign to lodge</label>
        </div>
        <select
          value={selectedLodgeId}
          onChange={e => setSelectedLodgeId(e.target.value)}
          className="w-full px-3 py-2.5 border border-[#E5E0D5] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-navy/20 focus:border-navy bg-white"
        >
          <option value="">— No lodge —</option>
          {lodges.map(l => (
            <option key={l.id} value={l.id}>
              {l.name} #{l.number} · {l.state}
            </option>
          ))}
        </select>
      </div>

      {/* Verification status */}
      <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6">
        <h2
          className="text-xl font-bold text-navy mb-5"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Verification status
        </h2>
        <div className="flex gap-3">
          {(['pending', 'verified', 'rejected'] as const).map(status => (
            <button
              key={status}
              type="button"
              onClick={() => setVerificationStatus(status)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all capitalize ${
                verificationStatus === status
                  ? status === 'verified'
                    ? 'bg-[#2D6A4F] text-white border-[#2D6A4F]'
                    : status === 'rejected'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-muted border-[#E5E0D5] hover:border-navy/30'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Admin roles */}
      <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6">
        <h2 className="text-xl font-bold text-navy mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Admin roles
        </h2>
        <p className="text-xs text-muted mb-4">Override lodge admin status cross-lodge. Use with caution.</p>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isLodgeAdmin}
              onChange={e => setIsLodgeAdmin(e.target.checked)}
              className="w-4 h-4 rounded border-[#E5E0D5] text-navy focus:ring-navy/20"
            />
            <span className="text-sm font-medium text-[#1A1A1A]">Primary lodge admin</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isCoAdmin}
              onChange={e => setIsCoAdmin(e.target.checked)}
              className="w-4 h-4 rounded border-[#E5E0D5] text-navy focus:ring-navy/20"
            />
            <span className="text-sm font-medium text-[#1A1A1A]">Co-admin</span>
          </label>
        </div>
      </div>

      {error && <p className="text-xs text-red-600 px-1">{error}</p>}

      {/* Save */}
      <button
        type="button"
        onClick={saveChanges}
        disabled={saving || saved}
        className="w-full py-3 bg-navy text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-navy/90 transition-colors flex items-center justify-center gap-2"
      >
        {saving ? (
          <><Loader2 size={15} className="animate-spin" /> Saving…</>
        ) : saved ? (
          <><CheckCircle2 size={15} /> Saved!</>
        ) : (
          'Save changes'
        )}
      </button>

      {/* Delete account */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
        <h2
          className="text-base font-bold text-red-700 mb-1"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Delete account
        </h2>
        <p className="text-xs text-muted mb-4">
          Permanently deletes the auth user. Profile cascades. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={deleteAccount}
          disabled={deleting}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Delete account
        </button>
      </div>
    </div>
  )
}
