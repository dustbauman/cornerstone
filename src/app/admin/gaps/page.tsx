"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Building2,
  AlertTriangle,
  MessageSquare,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import GapItem from "@/components/admin/GapItem";
import InviteModal from "@/components/admin/InviteModal";
import ToastNotification from "@/components/ui/ToastNotification";
import RequestCard from "@/components/requests/RequestCard";
import { createClient } from "@/lib/supabase/client";
import { serviceRequests } from "@/lib/demo/requests";
import { TradeCategory } from "@/lib/types";

const LODGE = { name: "Gulf Coast Lodge", number: 441, location: "Tampa Bay, FL" };

const SUMMARY_STATS = [
  { label: "Trades covered", value: "5", icon: Building2, color: "text-trust" },
  { label: "Trades with gaps", value: "7", icon: AlertTriangle, color: "text-amber-500" },
  { label: "Members who could fill gaps", value: "3", icon: Users, color: "text-navy" },
  { label: "Unanswered requests this month", value: "4", icon: MessageSquare, color: "text-red-500" },
];

interface Gap {
  trade: TradeCategory;
  openRequests: number;
}

const GAPS: Gap[] = [
  { trade: "Electrical", openRequests: 2 },
  { trade: "Legal", openRequests: 1 },
  { trade: "Home Inspection", openRequests: 0 },
  { trade: "Landscaping", openRequests: 1 },
  { trade: "Painting", openRequests: 0 },
  { trade: "Financial", openRequests: 3 },
  { trade: "Technology", openRequests: 0 },
];

interface UnlistedBrother {
  name: string;
  trade: string;
  memberSince: string;
}

const UNLISTED_BROTHERS: UnlistedBrother[] = [
  { name: "James E. Collins", trade: "Electrician", memberSince: "2019" },
  { name: "Patricia M. Okafor", trade: "Attorney", memberSince: "2021" },
  { name: "Daniel W. Ford", trade: "Landscaper", memberSince: "2020" },
];

const UNANSWERED = serviceRequests.filter((r) => r.responses === 0).slice(0, 3);

export default function GapDashboardPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [inviteTarget, setInviteTarget] = useState<UnlistedBrother | null>(null);
  const [inviteGapTrade, setInviteGapTrade] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setAuthLoading(false);
    });
  }, []);

  function handleInviteConfirm() {
    const name = inviteTarget?.name ?? inviteGapTrade ?? "";
    setSentInvites((prev) => { const next = new Set(prev); next.add(name); return next; });
    setToast(`Invite sent to ${inviteTarget ? `Brother ${inviteTarget.name.split(" ").slice(-1)[0]}` : "a brother"}.`);
    setInviteTarget(null);
    setInviteGapTrade(null);
  }

  if (authLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center bg-stone">
          <Loader2 size={32} className="text-navy animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center bg-stone">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-md w-full mx-4 text-center">
            <ShieldCheck size={40} className="text-navy mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-bold text-navy mb-2">Lodge Admins Only</h2>
            <p className="text-muted mb-6 text-sm">Sign in to view your lodge coverage report.</p>
            <Link
              href="/login?redirect=/admin/gaps"
              className="block w-full bg-gold hover:bg-gold-dark text-navy font-bold py-3 rounded-xl transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Header */}
      <div className="bg-navy text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-sm transition-colors mb-4"
          >
            <ArrowLeft size={14} />
            ← Back to Lodge Admin
          </Link>
          <h1 className="font-serif text-3xl font-bold">Coverage Gap Report</h1>
          <p className="text-white/50 text-sm mt-1">{LODGE.name} #{LODGE.number} · {LODGE.location}</p>
          <p className="text-white/60 mt-2 text-base max-w-xl">
            Here&apos;s what your service area is missing. Every gap is an opportunity to
            strengthen the network for your members.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SUMMARY_STATS.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted font-medium leading-tight">{label}</p>
                <Icon size={18} className={color} />
              </div>
              <div className="font-serif text-3xl font-bold text-navy">{value}</div>
            </div>
          ))}
        </div>

        {/* Main two-panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Panel A: Uncovered trades */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-500" />
              <h2 className="font-serif text-xl font-bold text-navy">Uncovered trades in your area (50 mi radius)</h2>
            </div>
            <div className="p-5 space-y-3">
              {GAPS.map((gap) => (
                <GapItem
                  key={gap.trade}
                  trade={gap.trade}
                  openRequests={gap.openRequests}
                  onInvite={() => {
                    setInviteGapTrade(gap.trade);
                    setInviteTarget(null);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Panel B: Brothers who could fill gaps */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="font-serif text-xl font-bold text-navy">Members who could fill these gaps</h2>
              <p className="text-sm text-muted mt-0.5">
                Lodge members not yet listed on Tyrian — whose trade matches an open gap.
              </p>
            </div>
            <div className="p-5 space-y-4">
              {UNLISTED_BROTHERS.map((brother) => {
                const alreadySent = sentInvites.has(brother.name);
                return (
                  <div
                    key={brother.name}
                    className="flex items-start gap-4 bg-stone rounded-xl p-4 border border-transparent hover:border-gold/20 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0 font-serif font-bold text-navy text-sm">
                      {brother.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-navy">{brother.name}</p>
                      <p className="text-xs text-muted mt-0.5">
                        Member since {brother.memberSince} · {brother.trade} (from profile)
                      </p>
                      <p className="text-xs text-amber-600 font-medium mt-1">Not yet listed on Tyrian</p>
                    </div>
                    {alreadySent ? (
                      <span className="text-xs text-trust font-semibold flex-shrink-0 pt-1">
                        Invited ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => { setInviteTarget(brother); setInviteGapTrade(null); }}
                        className="text-xs font-semibold text-navy border border-navy/20 hover:bg-navy hover:text-white px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                      >
                        Send listing invite →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Unanswered requests */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="font-serif text-2xl font-bold text-navy">Unanswered requests in your area</h2>
            <span className="bg-red-50 text-red-600 text-xs font-bold px-2.5 py-1 rounded-full border border-red-100">
              {UNANSWERED.length} with no response
            </span>
          </div>
          <p className="text-sm text-muted mb-5">
            These requests have received zero responses — an opportunity for a member to step up.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {UNANSWERED.map((req) => (
              <RequestCard key={req.id} request={req} isLoggedIn={isLoggedIn} />
            ))}
          </div>
        </div>
      </div>

      <Footer />

      {/* Invite modal — triggered from gap item */}
      {inviteGapTrade && !inviteTarget && (
        <InviteModal
          brother={{ name: "a qualified brother", trade: inviteGapTrade }}
          lodge={`${LODGE.name} #${LODGE.number}`}
          onClose={() => setInviteGapTrade(null)}
          onConfirm={handleInviteConfirm}
        />
      )}

      {/* Invite modal — triggered from unlisted brother */}
      {inviteTarget && (
        <InviteModal
          brother={inviteTarget}
          lodge={`${LODGE.name} #${LODGE.number}`}
          onClose={() => setInviteTarget(null)}
          onConfirm={handleInviteConfirm}
        />
      )}

      {toast && (
        <ToastNotification message={toast} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
