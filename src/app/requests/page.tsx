"use client";

import { useState, useMemo } from "react";
import { PlusCircle, SlidersHorizontal, X, Megaphone } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RequestCard from "@/components/requests/RequestCard";
import SectionDivider from "@/components/ui/SectionDivider";
import PostRequestModal from "@/components/requests/PostRequestModal";
import ToastNotification from "@/components/ui/ToastNotification";
import { requests as seedRequests, ServiceRequest } from "@/lib/demo/requests";
import { haversineDistance, getMatchScore } from "@/lib/geo/scoring";
import { CATEGORIES } from "@/lib/constants/categories";

const MOCK_USER = {
  name: "Robert C. Ingram",
  firstName: "Robert",
  trade: "Plumbing" as const,
  lodge: "Acacia Lodge #123",
  city: "Tulsa",
  state: "OK",
  lat: 36.1540,
  lng: -95.9928,
  isVerified: true,
  isLoggedIn: true,
};

type TabType = "for-you" | "your-lodge" | "your-area" | "all";

const TABS: { id: TabType; label: string }[] = [
  { id: "for-you", label: "For You" },
  { id: "your-lodge", label: "Your Lodge" },
  { id: "your-area", label: "Your Area" },
  { id: "all", label: "All Requests" },
];

const STATES = ["OK", "FL", "TX", "CA"];
const STATUSES = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "active", label: "Active" },
  { value: "filled", label: "Filled" },
];

function scoreSort(user: typeof MOCK_USER) {
  return (a: ServiceRequest, b: ServiceRequest) =>
    getMatchScore(b, user) - getMatchScore(a, user);
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>(seedRequests);
  const [activeTab, setActiveTab] = useState<TabType>("for-you");
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // All-tab filters
  const [filterCategory, setFilterCategory] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const hasFilters = filterCategory || filterState || filterStatus;

  // ── For You bands ────────────────────────────────────────────────────────
  const forYouBands = useMemo(() => {
    const sort = scoreSort(MOCK_USER);
    const nationwide = requests.filter((r) => r.remoteEligible).sort(sort);
    const nonRemote = requests.filter((r) => !r.remoteEligible);

    const nearYou: ServiceRequest[] = [];
    const nearYouOther: ServiceRequest[] = [];
    const inYourArea: ServiceRequest[] = [];
    const acrossState: ServiceRequest[] = [];

    for (const r of nonRemote) {
      const mi = haversineDistance(MOCK_USER.lat, MOCK_USER.lng, r.lat, r.lng);
      if (mi <= 25) {
        if (r.category === MOCK_USER.trade) nearYou.push(r);
        else nearYouOther.push(r);
      } else if (mi <= 50) {
        inYourArea.push(r);
      } else {
        acrossState.push(r);
      }
    }

    return {
      nationwide,
      nearYou: nearYou.sort(sort),
      nearYouOther: nearYouOther.sort(sort),
      inYourArea: inYourArea.sort(sort),
      acrossState: acrossState.sort(sort),
    };
  }, [requests]);

  // ── Your Lodge ───────────────────────────────────────────────────────────
  const lodgeRequests = useMemo(
    () =>
      requests
        .filter((r) => r.lodge === MOCK_USER.lodge)
        .sort((a, b) => a.postedHoursAgo - b.postedHoursAgo),
    [requests]
  );

  // ── Your Area ────────────────────────────────────────────────────────────
  const areaBands = useMemo(() => {
    const nationwide = requests.filter((r) => r.remoteEligible)
      .sort((a, b) => a.postedHoursAgo - b.postedHoursAgo);
    const local = requests
      .filter((r) => {
        if (r.remoteEligible) return false;
        return haversineDistance(MOCK_USER.lat, MOCK_USER.lng, r.lat, r.lng) <= 50;
      })
      .sort((a, b) => a.postedHoursAgo - b.postedHoursAgo);
    return { nationwide, local };
  }, [requests]);

  // ── All filtered ─────────────────────────────────────────────────────────
  const allFiltered = useMemo(
    () =>
      requests
        .filter((r) => {
          if (filterCategory && r.category !== filterCategory) return false;
          if (filterState && r.state !== filterState) return false;
          if (filterStatus && r.status !== filterStatus) return false;
          return true;
        })
        .sort((a, b) => a.postedHoursAgo - b.postedHoursAgo),
    [requests, filterCategory, filterState, filterStatus]
  );

  function handleNewRequest(request: ServiceRequest) {
    setRequests((prev) => [request, ...prev]);
    setModalOpen(false);
    setToast("Your request has been posted. Verified professionals in your area have been notified.");
  }

  // ── Render helpers ───────────────────────────────────────────────────────
  function renderForYou() {
    const { nationwide, nearYou, inYourArea, nearYouOther, acrossState } = forYouBands;
    const empty =
      !nationwide.length && !nearYou.length && !inYourArea.length &&
      !nearYouOther.length && !acrossState.length;

    if (empty) return <EmptyState />;

    return (
      <div className="space-y-3">
        {nationwide.length > 0 && (
          <>
            <SectionDivider label="🌐  Available nationwide" />
            {nationwide.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                isLoggedIn={MOCK_USER.isLoggedIn}
                matchScore={getMatchScore(r, MOCK_USER)}
                isMatchingTrade={r.category === MOCK_USER.trade}
                userLodge={MOCK_USER.lodge}
              />
            ))}
          </>
        )}
        {nearYou.length > 0 && (
          <>
            <SectionDivider label="📍  Near you · within 25 miles" />
            {nearYou.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                isLoggedIn={MOCK_USER.isLoggedIn}
                matchScore={getMatchScore(r, MOCK_USER)}
                isMatchingTrade={true}
                userLodge={MOCK_USER.lodge}
              />
            ))}
          </>
        )}
        {inYourArea.length > 0 && (
          <>
            <SectionDivider label="📍  In your area · within 50 miles" />
            {inYourArea.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                isLoggedIn={MOCK_USER.isLoggedIn}
                matchScore={getMatchScore(r, MOCK_USER)}
                isMatchingTrade={r.category === MOCK_USER.trade}
                userLodge={MOCK_USER.lodge}
              />
            ))}
          </>
        )}
        {nearYouOther.length > 0 && (
          <>
            <SectionDivider label="🗺  Other needs nearby" />
            {nearYouOther.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                isLoggedIn={MOCK_USER.isLoggedIn}
                matchScore={getMatchScore(r, MOCK_USER)}
                isMatchingTrade={false}
                userLodge={MOCK_USER.lodge}
              />
            ))}
          </>
        )}
        {acrossState.length > 0 && (
          <>
            <SectionDivider label="📍  Across Oklahoma" />
            {acrossState.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                isLoggedIn={MOCK_USER.isLoggedIn}
                matchScore={getMatchScore(r, MOCK_USER)}
                isMatchingTrade={r.category === MOCK_USER.trade}
                userLodge={MOCK_USER.lodge}
              />
            ))}
          </>
        )}
      </div>
    );
  }

  function renderYourLodge() {
    if (!lodgeRequests.length) {
      return (
        <div className="text-center py-20 text-muted">
          <Megaphone size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-base">No requests from your lodge yet.</p>
          <p className="text-sm mt-1">Be the first to post.</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {lodgeRequests.map((r) => (
          <RequestCard
            key={r.id}
            request={r}
            isLoggedIn={MOCK_USER.isLoggedIn}
            userLodge={MOCK_USER.lodge}
          />
        ))}
      </div>
    );
  }

  function renderYourArea() {
    const { nationwide, local } = areaBands;
    if (!nationwide.length && !local.length) return <EmptyState />;
    return (
      <div className="space-y-3">
        {nationwide.length > 0 && (
          <>
            <SectionDivider label="🌐  Available nationwide" />
            {nationwide.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                isLoggedIn={MOCK_USER.isLoggedIn}
                userLodge={MOCK_USER.lodge}
              />
            ))}
          </>
        )}
        {local.length > 0 && (
          <>
            <SectionDivider label="📍  Within 50 miles of Tulsa" />
            {local.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                isLoggedIn={MOCK_USER.isLoggedIn}
                userLodge={MOCK_USER.lodge}
              />
            ))}
          </>
        )}
      </div>
    );
  }

  function renderAll() {
    return (
      <>
        {/* Inline filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold/40"
          >
            <option value="">All Trades</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold/40"
          >
            <option value="">All States</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold/40"
          >
            {STATUSES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setFilterCategory(""); setFilterState(""); setFilterStatus(""); }}
              className="text-xs text-muted hover:text-navy flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200"
            >
              <X size={11} /> Clear
            </button>
          )}
          <span className="ml-auto text-xs text-muted">{allFiltered.length} requests</span>
        </div>

        {allFiltered.length > 0 ? (
          <div className="space-y-3">
            {allFiltered.map((r) => (
              <RequestCard
                key={r.id}
                request={r}
                isLoggedIn={MOCK_USER.isLoggedIn}
                userLodge={MOCK_USER.lodge}
              />
            ))}
          </div>
        ) : (
          <EmptyState filtered />
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      {/* Page header */}
      <div className="bg-navy text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2">
                Post a Request. Let the Network Respond.
              </h1>
              <p className="text-white/60 text-lg max-w-2xl">
                Browse open requests or post your own. Verified professionals respond directly —
                no middleman, no fees.
              </p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 bg-gold hover:bg-gold-dark text-navy font-bold px-5 py-3 rounded-xl transition-colors flex-shrink-0"
            >
              <PlusCircle size={18} />
              Post a Request
            </button>
          </div>

          {/* Context line */}
          <p className="text-white/60 text-sm">
            Showing results for:{" "}
            <span className="text-white font-semibold">{MOCK_USER.trade}</span>
            {" · "}
            <span className="text-white font-semibold">{MOCK_USER.city}, {MOCK_USER.state}</span>
            {"  "}
            <button className="text-gold/80 hover:text-gold text-xs ml-1 underline underline-offset-2">
              [Edit preferences]
            </button>
          </p>

          {/* Tabs */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? "bg-white text-navy"
                    : "border border-white/25 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button className="ml-auto flex-shrink-0 p-2 rounded-xl border border-white/20 text-white/50 hover:text-white hover:border-white/40 transition-colors">
              <SlidersHorizontal size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="flex gap-8">
          {/* Feed */}
          <div className="flex-1 min-w-0">
            {activeTab === "for-you" && renderForYou()}
            {activeTab === "your-lodge" && renderYourLodge()}
            {activeTab === "your-area" && renderYourArea()}
            {activeTab === "all" && renderAll()}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0 space-y-4">
            {/* Post CTA */}
            <div className="bg-navy rounded-2xl p-5 text-white">
              <h3 className="font-serif text-lg font-bold mb-1">Need a service?</h3>
              <p className="text-white/60 text-sm mb-4 leading-relaxed">
                Post your request to the network. Verified professionals in your area will
                respond directly.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="w-full bg-gold hover:bg-gold-dark text-navy font-bold py-2.5 rounded-xl transition-colors text-sm"
              >
                Post a Request
              </button>
            </div>

            {/* Stats block */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Open near Tulsa</span>
                <span className="font-serif font-bold text-navy text-lg">8</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">With no response yet</span>
                <span className="font-serif font-bold text-red-500 text-lg">3</span>
              </div>
            </div>

            {/* Lodge context */}
            <div className="bg-stone rounded-2xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-navy uppercase tracking-[0.08em] mb-2">
                Browsing as
              </p>
              <p className="text-sm font-medium text-navy">{MOCK_USER.name}</p>
              <p className="text-xs text-muted mt-0.5">{MOCK_USER.lodge}</p>
              <p className="text-xs text-muted">{MOCK_USER.trade} · {MOCK_USER.city}, {MOCK_USER.state}</p>
            </div>
          </aside>
        </div>
      </div>

      <Footer />

      {modalOpen && (
        <PostRequestModal
          onClose={() => setModalOpen(false)}
          onSubmit={handleNewRequest}
          defaultLodge={MOCK_USER.lodge}
          defaultCity={MOCK_USER.city}
          defaultState={MOCK_USER.state}
          defaultLat={MOCK_USER.lat}
          defaultLng={MOCK_USER.lng}
        />
      )}

      {toast && (
        <ToastNotification message={toast} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}

function EmptyState({ filtered }: { filtered?: boolean }) {
  return (
    <div className="text-center py-20 text-muted">
      <Megaphone size={36} className="mx-auto mb-3 opacity-30" />
      <p className="font-medium text-base">
        {filtered ? "No requests match your filters" : "No requests in this view yet"}
      </p>
    </div>
  );
}
