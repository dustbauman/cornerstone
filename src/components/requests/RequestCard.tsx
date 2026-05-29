import { MapPin, DollarSign, MessageSquare, Globe } from "lucide-react";
import { ServiceRequest } from "@/lib/demo/requests";
import CategoryBadge from "@/components/directory/CategoryBadge";
import MatchPill from "./MatchPill";

interface Props {
  request: ServiceRequest;
  isLoggedIn: boolean;
  matchScore?: number;
  isMatchingTrade?: boolean;
  userLodge?: string;
}

function formatTime(hoursAgo: number): string {
  if (hoursAgo < 1) return "Just now";
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  const days = Math.floor(hoursAgo / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export default function RequestCard({
  request,
  isLoggedIn,
  matchScore,
  isMatchingTrade,
  userLodge,
}: Props) {
  const isUrgent = request.responses === 0 && request.postedHoursAgo >= 48;
  const isNew = request.responses === 0 && request.postedHoursAgo < 48;
  const isSameLodge = !!userLodge && request.lodge === userLodge;

  let borderLeft: string | undefined;
  if (isUrgent) {
    borderLeft = "3px solid #E24B4A";
  } else if (isMatchingTrade) {
    borderLeft = "3px solid #C9A84C";
  } else if (request.remoteEligible) {
    borderLeft = "3px solid #185FA5";
  }

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-gold/20 transition-all"
      style={borderLeft ? { borderLeft } : undefined}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <CategoryBadge trade={request.category} size="sm" />
        <div className="flex items-center gap-2 flex-shrink-0">
          {request.remoteEligible && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-[0.06em]">
              <Globe size={9} />
              Remote
            </span>
          )}
          <span className="text-xs text-muted">{formatTime(request.postedHoursAgo)}</span>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-serif text-lg font-bold text-navy leading-snug mb-2">
        {request.title}
      </h3>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted mb-2">
        <span className="font-medium text-[#1A1A1A]">{request.name}</span>
        <span>·</span>
        <span>{request.lodge}</span>
        <span>·</span>
        <span className="flex items-center gap-0.5">
          <MapPin size={10} className="text-gold flex-shrink-0" />
          {request.city}, {request.state}
        </span>
        {request.verifiedMember && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-trust bg-trust/10 px-1.5 py-0.5 rounded-full">
            ✓ Verified
          </span>
        )}
        {isSameLodge && (
          <span className="inline-flex items-center text-[10px] font-semibold text-navy bg-navy/5 px-1.5 py-0.5 rounded-full border border-navy/15">
            Same lodge
          </span>
        )}
      </div>

      {/* Urgency line */}
      {isUrgent && (
        <p className="text-xs text-red-500 font-medium flex items-center gap-1.5 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block flex-shrink-0" />
          No responses yet
        </p>
      )}
      {isNew && (
        <p className="text-xs text-muted italic mb-3">Be the first to respond</p>
      )}

      {/* Footer */}
      <div className="pt-3 border-t border-gray-50 mt-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {matchScore !== undefined && <MatchPill score={matchScore} />}
            {request.budget && (
              <span className="text-xs text-muted flex items-center gap-0.5">
                <DollarSign size={10} />
                {request.budget}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-muted flex items-center gap-1">
              <MessageSquare size={10} />
              {request.responses}
            </span>
            {isLoggedIn ? (
              <button className="text-sm font-semibold text-navy hover:text-gold transition-colors">
                Respond →
              </button>
            ) : (
              <button className="text-xs font-medium text-muted hover:text-navy transition-colors border border-gray-200 px-3 py-1.5 rounded-lg">
                Sign in to respond →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
