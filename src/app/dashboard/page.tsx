"use client";

import Link from "next/link";
import {
  Eye,
  Users,
  Share2,
  Edit3,
  Lock,
  Globe,
  Copy,
  TrendingUp,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VerifiedBadge from "@/components/VerifiedBadge";
import CategoryBadge from "@/components/CategoryBadge";
import StarRating from "@/components/StarRating";
import { useAuth } from "@/context/AuthContext";
import { getListingBySlug } from "@/data/listings";

const MOCK_LEADS = [
  { id: 1, name: "Patricia Monroe", email: "p.monroe@email.com", message: "Interested in a roof inspection before the rainy season.", date: "2 days ago", source: "Direct" },
  { id: 2, name: "David Kowalski", email: "dkowalski@email.com", message: "My neighbor recommended you. Can we schedule an estimate?", date: "4 days ago", source: "Referral" },
  { id: 3, name: "Sunrise Properties LLC", email: "info@sunriseprops.com", message: "We have 3 properties that need new roofs. Looking for a partner.", date: "1 week ago", source: "Directory" },
];

const MOCK_STATS = [
  { label: "Profile Views", value: "284", delta: "this month", icon: Eye },
  { label: "Referrals Received", value: "17", delta: "total", icon: Users },
  { label: "Profile Completion", value: "92%", delta: "Complete your profile →", icon: TrendingUp },
];

export default function DashboardPage() {
  const { isLoggedIn, user, toggleAuth } = useAuth();

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center bg-stone">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-md w-full mx-4 text-center">
            <ShieldCheck size={40} className="text-navy mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-bold text-navy mb-2">Members Only</h2>
            <p className="text-muted mb-6 text-sm leading-relaxed">
              The dashboard is for verified lodge members. Sign in to manage your listing and view your leads.
            </p>
            <button
              onClick={toggleAuth}
              className="w-full bg-gold hover:bg-gold-dark text-navy font-bold py-3 rounded-xl transition-colors"
            >
              Sign In (Demo)
            </button>
            <p className="text-xs text-muted mt-3">Click to simulate a signed-in member for the demo</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const listing = getListingBySlug(user!.listingSlug);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <div className="bg-navy text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-white/50 text-sm mb-1">Welcome back,</p>
          <h1 className="font-serif text-3xl font-bold">{user!.name.replace("Brother ", "")}</h1>
          <p className="text-white/60 mt-1 text-sm">
            {user!.lodge} #{user!.lodgeNumber} · {user!.location}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {MOCK_STATS.map(({ label, value, delta, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted font-medium">{label}</p>
                <div className="w-9 h-9 rounded-full bg-navy/5 flex items-center justify-center">
                  <Icon size={18} className="text-navy" />
                </div>
              </div>
              <div className="font-serif text-3xl font-bold text-navy">{value}</div>
              <p className="text-xs text-trust mt-1">{delta}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Listing card */}
          <div className="lg:col-span-2 space-y-6">
            {listing && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="font-serif text-xl font-bold text-navy">Your listing</h2>
                  <Link
                    href={`/directory/${listing.slug}`}
                    className="text-sm text-muted hover:text-navy transition-colors"
                  >
                    Preview Public Profile →
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <CategoryBadge trade={listing.trade} size="sm" />
                  <VerifiedBadge size="sm" />
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    <Globe size={11} />
                    Public
                  </span>
                </div>

                <h3 className="font-serif text-xl font-bold text-navy">{listing.businessName}</h3>
                <p className="text-muted text-sm mt-0.5 mb-3">{listing.ownerName}</p>

                <StarRating rating={listing.rating} reviewCount={listing.reviewCount} />

                <p className="text-sm text-muted mt-3 line-clamp-2 leading-relaxed">{listing.description}</p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button className="inline-flex items-center gap-2 bg-navy text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-navy-dark transition-colors">
                    <Edit3 size={15} />
                    Edit Listing
                  </button>
                  <button className="inline-flex items-center gap-2 border border-gray-200 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-stone transition-colors">
                    <Lock size={15} />
                    Members only
                  </button>
                </div>
              </div>
            )}

            {/* Recent leads */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-serif text-xl font-bold text-navy">Recent inquiries</h2>
                <span className="text-xs bg-gold/10 text-gold-dark font-semibold px-2.5 py-1 rounded-full">
                  {MOCK_LEADS.length} new
                </span>
              </div>
              <div className="space-y-4">
                {MOCK_LEADS.map((lead) => (
                  <div key={lead.id} className="flex items-start gap-4 pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                    <div className="w-9 h-9 rounded-full bg-navy/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageSquare size={16} className="text-navy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{lead.name}</span>
                        <span className="text-xs text-muted">{lead.date}</span>
                      </div>
                      <p className="text-xs text-muted mt-0.5 mb-1">{lead.email}</p>
                      <p className="text-sm text-[#1A1A1A] line-clamp-2">{lead.message}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${
                        lead.source === "Referral" ? "bg-trust/10 text-trust" : "bg-gray-100 text-gray-500"
                      }`}>
                        via {lead.source}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-muted flex-shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Referral link */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-1">
                <Share2 size={16} className="text-gold" />
                <h3 className="font-semibold text-navy text-sm">Grow the network</h3>
              </div>
              <p className="text-xs text-muted mb-3 leading-relaxed">
                Know a fellow lodge member with a business? Invite them to list on Tyrian. When they join, you&apos;ll be credited as their referral source.
              </p>
              <p className="text-xs text-muted mb-1.5 font-medium">Your referral link:</p>
              <div className="flex items-center gap-2 bg-stone rounded-lg px-3 py-2">
                <span className="text-xs text-muted flex-1 truncate font-mono">
                  tyrian.work/join?ref=jrt441
                </span>
                <button className="flex-shrink-0 text-navy hover:text-gold transition-colors">
                  <Copy size={14} />
                </button>
              </div>
              <button className="mt-3 w-full bg-navy hover:bg-navy-dark text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
                Copy referral link
              </button>
            </div>

            {/* Verification status */}
            <div className="bg-trust/5 border border-trust/15 rounded-2xl p-5">
              <VerifiedBadge size="sm" />
              <p className="text-sm mt-3 leading-relaxed">
                Your membership is verified through <span className="font-semibold">{user!.lodge} #{user!.lodgeNumber}</span>.
              </p>
              <p className="text-xs text-muted mt-2">Verification renews annually with your lodge dues.</p>
            </div>

            {/* Profile completion */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-navy text-sm mb-3">Profile Completion</h3>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                <div className="bg-trust h-2 rounded-full" style={{ width: "92%" }} />
              </div>
              <p className="text-xs text-muted">92% complete — add a profile photo to finish.</p>
              <button className="mt-3 text-xs font-semibold text-navy underline">
                Complete profile
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
