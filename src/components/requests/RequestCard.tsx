"use client";

import Link from "next/link";
import { MapPin, DollarSign, MessageSquare, Globe } from "lucide-react";
import { ServiceRequest } from "@/lib/demo/requests";
import CategoryBadge from "@/components/directory/CategoryBadge";
import MatchPill from "./MatchPill";

interface Props {
  request: ServiceRequest;
  isLoggedIn: boolean;
  isVerified?: boolean;
  hasResponded?: boolean;
  respondSuccess?: boolean;
  onRespond?: (request: ServiceRequest) => void;
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
  isVerified = false,
  hasResponded = false,
  respondSuccess = false,
  onRespond,
  matchScore,
  isMatchingTrade,
  userLodge,
}: Props) {
  const responseCount = request.responses;
  const isUrgent = responseCount === 0 && request.postedHoursAgo >= 48;
  const isNew = responseCount === 0 && request.postedHoursAgo < 48;
  const responseLabel =
    responseCount === 1 ? "1 response" : `${responseCount} responses`;
  const isSameLodge = !!userLodge && request.lodge === userLodge;
  let borderLeft: string | undefined;
  if (isUrgent) {
    borderLeft = "3px solid #E24B4A";
  } else if (isMatchingTrade) {
    borderLeft = "3px solid #C9A84C";
  } else if (request.remoteEligible) {
    borderLeft = "3px solid #185FA5";
  }

  function renderRespondArea() {
    if (request.status === "filled") {
      return null;
    }

    if (respondSuccess) {
      return (
        <div className="mt-3 pt-3 border-t border-warm">
          <p className="text-sm font-semibold text-trust">✓ Response sent</p>
          <p className="text-xs text-muted mt-0.5">
            {request.name} from {request.lodge.split("#")[0]?.trim() || "their lodge"} will be
            notified.
          </p>
        </div>
      );
    }

    if (!isLoggedIn) {
      return (
        <div className="mt-3 pt-3 border-t border-warm">
          <Link
            href="/login?redirect=/requests"
            className="inline-block text-sm font-semibold text-navy border border-navy/20 px-3 py-1.5 rounded-lg hover:bg-stone transition-colors"
          >
            Sign in to respond
          </Link>
          <p className="text-xs text-muted mt-2">
            Only lodge-verified members can respond to requests.
          </p>
        </div>
      );
    }

    if (!isVerified) {
      return (
        <div className="mt-3 pt-3 border-t border-warm">
          <button
            type="button"
            disabled
            className="text-sm font-semibold text-muted bg-stone px-3 py-1.5 rounded-lg cursor-not-allowed border border-warm"
          >
            Verification pending
          </button>
          <p className="text-xs text-muted mt-2">
            Your sponsor hasn&apos;t confirmed your membership yet. You can respond once
            you&apos;re verified.
          </p>
        </div>
      );
    }

    if (hasResponded) {
      return (
        <div className="mt-3 pt-3 border-t border-warm">
          <button
            type="button"
            disabled
            className="text-sm font-semibold text-trust bg-trust/10 px-3 py-1.5 rounded-lg cursor-default"
          >
            ✓ You responded
          </button>
          <p className="text-xs text-trust mt-2">
            <Link href="/dashboard#your-responses" className="underline hover:text-navy">
              View your response →
            </Link>
          </p>
        </div>
      );
    }

    return (
      <div className="mt-3 pt-3 border-t border-warm">
        <button
          type="button"
          onClick={() => onRespond?.(request)}
          className="text-sm font-bold text-navy bg-gold hover:bg-gold-dark px-3 py-1.5 rounded-lg transition-colors"
        >
          Respond to this request
        </button>
      </div>
    );
  }

  return (
    <div
      className="tyrian-card-interactive p-5"
      style={borderLeft ? { borderLeft } : undefined}
    >
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

      <h3 className="font-serif text-lg font-bold text-navy leading-snug mb-2">
        {request.title}
      </h3>

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

      {isUrgent && (
        <p className="text-xs text-red-500 font-medium flex items-center gap-1.5 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block flex-shrink-0" />
          No responses yet
        </p>
      )}
      {isNew && (
        <p className="text-xs text-muted italic mb-3">Be the first to respond</p>
      )}
      {responseCount > 0 && (
        <p className="text-xs font-medium text-navy/80 mb-3">{responseLabel}</p>
      )}

      <div className="pt-3 border-t border-warm mt-1">
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
            <span
              className={`text-xs flex items-center gap-1 ${
                responseCount > 0 ? "font-semibold text-navy" : "text-muted"
              }`}
              title={responseLabel}
            >
              <MessageSquare size={10} aria-hidden />
              {responseCount}
            </span>
          </div>
        </div>

        {request.status !== "filled" && renderRespondArea()}
      </div>
    </div>
  );
}
