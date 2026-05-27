"use client";

import {
  Users,
  Building2,
  TrendingUp,
  Share2,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Globe,
  Lock,
  MoreHorizontal,
  MapPin,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";

const LODGE = {
  name: "Gulf Coast Lodge",
  number: 441,
  location: "Tampa, FL",
  worshipfulMaster: "Bro. Richard P. Holt",
};

const LODGE_STATS = [
  { label: "Active Listings", value: "14", icon: Building2 },
  { label: "Total Members", value: "38", icon: Users },
  { label: "Referrals This Month", value: "127", icon: Share2 },
  { label: "Profile Completion", value: "84%", icon: TrendingUp },
];

const MEMBERS = [
  { id: 1, name: "James R. Thornton", trade: "Roofing", listing: "Gulf Coast Roofing", status: "active", verified: true, visibility: "public" },
  { id: 2, name: "Charles E. Monroe", trade: "HVAC", listing: "Craftsman HVAC Services", status: "active", verified: true, visibility: "public" },
  { id: 3, name: "William A. Foster", trade: "Plumbing", listing: "Foster Plumbing Co.", status: "active", verified: true, visibility: "brothers_only" },
  { id: 4, name: "Edward J. Blake", trade: "Legal", listing: "Blake Law Group", status: "active", verified: true, visibility: "public" },
  { id: 5, name: "Raymond C. Holloway", trade: "Financial", listing: "—", status: "no_listing", verified: true, visibility: "—" },
  { id: 6, name: "Thomas B. Garrett", trade: "Landscaping", listing: "Garrett Grounds", status: "active", verified: true, visibility: "public" },
];

const PENDING = [
  { id: 101, name: "Marcus L. Stanton", trade: "Electrical", sponsor: "James R. Thornton", submitted: "May 20, 2026", lodge: "Gulf Coast Lodge #441" },
  { id: 102, name: "Patrick D. Quinn", trade: "Automotive", sponsor: "Charles E. Monroe", submitted: "May 22, 2026", lodge: "Gulf Coast Lodge #441" },
  { id: 103, name: "Gregory F. Nash", trade: "Technology", sponsor: "Edward J. Blake", submitted: "May 24, 2026", lodge: "Gulf Coast Lodge #441" },
];

export default function AdminPage() {
  const { isLoggedIn, toggleAuth } = useAuth();

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center bg-stone">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-md w-full mx-4 text-center">
            <ShieldCheck size={40} className="text-navy mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-bold text-navy mb-2">Lodge Admins Only</h2>
            <p className="text-muted mb-6 text-sm leading-relaxed">
              This area is restricted to verified lodge administrators. Sign in to manage your lodge.
            </p>
            <button
              onClick={toggleAuth}
              className="w-full bg-gold hover:bg-gold-dark text-navy font-bold py-3 rounded-xl transition-colors"
            >
              Sign In (Demo)
            </button>
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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-white/50 text-sm mb-1">Lodge Administrator</p>
              <h1 className="font-serif text-3xl font-bold">
                {LODGE.name} #{LODGE.number}
              </h1>
              <p className="text-white/60 text-sm mt-1">
                {LODGE.location} · W.M. {LODGE.worshipfulMaster}
              </p>
              <p className="text-white/40 text-xs mt-1">Manage your lodge&apos;s presence on Tyrian.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-trust/20 border border-trust/30 text-white/80 text-xs font-semibold px-3 py-1.5 rounded-full">
              <CheckCircle2 size={13} className="text-trust" />
              Active Lodge — Dues Current
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {LODGE_STATS.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted font-medium">{label}</p>
                <div className="w-9 h-9 rounded-full bg-navy/5 flex items-center justify-center">
                  <Icon size={18} className="text-navy" />
                </div>
              </div>
              <div className="font-serif text-3xl font-bold text-navy">{value}</div>
            </div>
          ))}
        </div>

        {/* Coverage gap callout */}
        <Link
          href="/admin/gaps"
          className="flex items-center justify-between gap-4 bg-navy rounded-2xl p-5 hover:bg-navy-dark transition-colors group"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin size={20} className="text-gold" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-white">⚠ Coverage gaps in your area</h3>
              <p className="text-white/60 text-sm mt-0.5">
                Your lodge has <span className="text-gold font-semibold">7 uncovered trade categories</span> in the Tampa Bay area. Members with open requests are waiting for a match.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-gold font-semibold text-sm flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
            View Gap Report
            <ArrowRight size={16} />
          </div>
        </Link>

        {/* Pending approvals */}
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-amber-500" />
              <h2 className="font-serif text-xl font-bold text-navy">Pending verification requests</h2>
            </div>
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {PENDING.length} pending
            </span>
          </div>

          <div className="divide-y divide-gray-50">
            {PENDING.map((applicant) => (
              <div key={applicant.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{applicant.name}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{applicant.trade}</span>
                  </div>
                  <p className="text-xs text-muted">
                    Sponsored by <span className="font-medium text-[#1A1A1A]">{applicant.sponsor}</span> · Submitted {applicant.submitted}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 bg-trust/10 hover:bg-trust/20 text-trust font-semibold text-xs px-3 py-2 rounded-lg transition-colors">
                    <CheckCircle2 size={14} />
                    Approve
                  </button>
                  <button className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs px-3 py-2 rounded-lg transition-colors">
                    <XCircle size={14} />
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Member table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-navy">Lodge members</h2>
            <button className="text-sm text-navy font-semibold border border-navy/20 px-3 py-1.5 rounded-lg hover:bg-navy/5 transition-colors">
              + Add Member
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone text-left">
                  <th className="px-6 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Trade / Profession</th>
                  <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Listing status</th>
                  <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Visibility</th>
                  <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider">Verified</th>
                  <th className="px-4 py-3 font-semibold text-muted text-xs uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {MEMBERS.map((member) => (
                  <tr key={member.id} className="hover:bg-stone/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{member.name}</td>
                    <td className="px-4 py-4 text-muted">{member.trade}</td>
                    <td className="px-4 py-4">
                      {member.listing !== "—" ? (
                        <span className="text-navy font-medium">{member.listing}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Not listed</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {member.visibility === "public" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          <Globe size={11} /> Public
                        </span>
                      ) : member.visibility === "brothers_only" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                          <Lock size={11} /> Members only
                        </span>
                      ) : (
                        <span className="text-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {member.verified ? (
                        <span className="inline-flex items-center gap-1 text-xs text-trust bg-trust/10 px-2 py-0.5 rounded-full font-medium">
                          <ShieldCheck size={11} /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                          <Clock size={11} /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button className="text-muted hover:text-navy transition-colors">
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
