import Link from 'next/link'
import { Megaphone, ChevronRight } from 'lucide-react'
import ManageRequestActions from '@/components/requests/ManageRequestActions'

export interface MyRequestRow {
  id: string
  title: string
  category: string
  city: string
  state: string
  status: string
  budget?: string | null
  timeline?: string | null
  details?: string | null
  remote_eligible?: boolean
  responses_count: number
  new_responses_count?: number
  created_at: string
  requester_notify_token?: string | null
}

function newResponseLabel(count: number): string {
  return count === 1 ? '1 new response' : `${count} new responses`
}

function responsesHref(req: MyRequestRow): string {
  const base = `/requests/${req.id}/responses`
  if (req.requester_notify_token) {
    return `${base}?token=${encodeURIComponent(req.requester_notify_token)}`
  }
  return base
}

function formatPostedAt(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const hours = Math.floor(ms / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

function statusStyles(status: string): string {
  switch (status) {
    case 'open':
      return 'bg-[#2D6A4F]/10 text-[#2D6A4F]'
    case 'active':
      return 'bg-navy/10 text-navy'
    case 'filled':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-500'
  }
}

interface Props {
  requests: MyRequestRow[]
  demoMode?: boolean
}

export default function MyRequestsSection({ requests, demoMode }: Props) {
  const totalNew = requests.reduce((sum, r) => sum + (r.new_responses_count ?? 0), 0)

  return (
    <div id="my-requests" className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <h2
            className="text-xl font-bold text-navy"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            My requests
          </h2>
          {totalNew > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {newResponseLabel(totalNew)}
            </span>
          )}
        </div>
        <Link href="/requests" className="text-sm text-muted hover:text-navy transition-colors">
          Post new request →
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-6">
          <Megaphone size={32} className="text-navy/20 mx-auto mb-3" />
          <p className="text-sm text-muted mb-3">
            You haven&apos;t posted a service request yet. Ask the network for help from verified
            brothers.
          </p>
          <Link
            href="/requests"
            className="inline-flex text-sm font-semibold text-navy underline hover:text-gold transition-colors"
          >
            Browse & post on the request board →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {requests.map(req => (
            <div key={req.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-navy truncate">&ldquo;{req.title}&rdquo;</p>
                <p className="text-xs text-muted mt-1">
                  {req.category} · {req.city}, {req.state} · Posted {formatPostedAt(req.created_at)}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {req.responses_count === 0
                    ? 'No responses yet — we’ll email you when someone responds'
                    : (req.new_responses_count ?? 0) > 0
                      ? `${req.responses_count} total · ${newResponseLabel(req.new_responses_count!)} waiting`
                      : `${req.responses_count} response${req.responses_count === 1 ? '' : 's'}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${statusStyles(req.status)}`}
                >
                  {req.status}
                </span>
                {(req.new_responses_count ?? 0) > 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 whitespace-nowrap">
                    {newResponseLabel(req.new_responses_count!)}
                  </span>
                )}
                {demoMode ? (
                  <span className="text-xs text-muted">Demo</span>
                ) : (
                  <Link
                    href={responsesHref(req)}
                    className="inline-flex items-center gap-0.5 text-xs font-semibold text-navy hover:text-gold transition-colors whitespace-nowrap"
                  >
                    View responses
                    <ChevronRight size={14} />
                  </Link>
                )}
              </div>
              </div>
              {!demoMode && (req.status === 'open' || req.status === 'active') && (
                <ManageRequestActions request={req} className="mt-3" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
