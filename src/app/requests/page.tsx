"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, SlidersHorizontal, X, Megaphone, Loader2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RequestCard from "@/components/requests/RequestCard";
import SectionDivider from "@/components/ui/SectionDivider";
import PostRequestModal from "@/components/requests/PostRequestModal";
import RespondModal, { type ResponderPreview } from "@/components/requests/RespondModal";
import GuestBrowseSettingsModal from "@/components/requests/GuestBrowseSettingsModal";
import ToastNotification from "@/components/ui/ToastNotification";
import { requests as demoRequests, ServiceRequest } from "@/lib/demo/requests";
import { haversineDistance, getMatchScore } from "@/lib/geo/scoring";
import { CATEGORIES } from "@/lib/constants/categories";
import { useDemoMode } from "@/lib/demo/context";
import { demoUser } from "@/lib/demo/data";
import { createClient } from "@/lib/supabase/client";
import { dbRequestToServiceRequest } from "@/lib/db/requests";
import {
  DEFAULT_GUEST_AREA,
  resolveGuestArea,
  saveGuestAreaPrefs,
  type GuestAreaPrefs,
} from "@/lib/guest/area-prefs";
import type { TradeCategory } from "@/lib/types";

interface RequestUser {
  name: string;
  firstName: string;
  trade: TradeCategory | "";
  occupation: string;
  lodge: string;
  lodgeId: string | null;
  city: string;
  state: string;
  lat: number;
  lng: number;
  isVerified: boolean;
  isLoggedIn: boolean;
  email: string;
  contactPhone: string | null;
  contactEmail: string | null;
}

const DEMO_REQUEST_USER: RequestUser = {
  name: demoUser.full_name,
  firstName: demoUser.full_name.split(" ")[0],
  trade: demoUser.trade_category as TradeCategory,
  occupation: "",
  lodge: `${demoUser.lodge_name} #${demoUser.lodge_number}`,
  lodgeId: demoUser.lodge_id,
  city: demoUser.city,
  state: demoUser.state,
  lat: demoUser.lat,
  lng: demoUser.lng,
  isVerified: true,
  isLoggedIn: true,
  email: demoUser.email,
  contactPhone: "(918) 555-0477",
  contactEmail: demoUser.email,
};

const ANON_USER: RequestUser = {
  name: "Guest",
  firstName: "Guest",
  trade: "",
  occupation: "",
  lodge: "",
  lodgeId: null,
  city: DEFAULT_GUEST_AREA.city,
  state: DEFAULT_GUEST_AREA.state,
  lat: DEFAULT_GUEST_AREA.lat,
  lng: DEFAULT_GUEST_AREA.lng,
  isVerified: false,
  isLoggedIn: false,
  email: "",
  contactPhone: null,
  contactEmail: null,
};

type TabType = "for-you" | "your-lodge" | "your-area" | "all";

const MEMBER_TABS: { id: TabType; label: string }[] = [
  { id: "for-you", label: "For You" },
  { id: "your-lodge", label: "Your Lodge" },
  { id: "your-area", label: "Your Area" },
  { id: "all", label: "All Requests" },
];

const GUEST_TABS: { id: TabType; label: string }[] = [
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

function scoreSort(user: RequestUser) {
  return (a: ServiceRequest, b: ServiceRequest) =>
    getMatchScore(b, user) - getMatchScore(a, user);
}

export default function RequestsPage() {
  const { isDemoMode } = useDemoMode();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [requestUser, setRequestUser] = useState<RequestUser>(ANON_USER);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("your-area");
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guestAreaSource, setGuestAreaSource] = useState<GuestAreaPrefs["source"]>("default");
  const [respondTarget, setRespondTarget] = useState<ServiceRequest | null>(null);
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());
  const [respondSuccessIds, setRespondSuccessIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [toastAction, setToastAction] = useState<{ href: string; label: string } | null>(null);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [areaFilterCategory, setAreaFilterCategory] = useState("");
  const [areaFilterStatus, setAreaFilterStatus] = useState("");
  const hasFilters = filterCategory || filterState || filterStatus;
  const hasAreaFilters = !!(areaFilterCategory || areaFilterStatus);

  const visibleTabs = requestUser.isLoggedIn ? MEMBER_TABS : GUEST_TABS;

  useEffect(() => {
    async function load() {
      setLoading(true);

      if (isDemoMode) {
        setRequests(demoRequests);
        setRequestUser(DEMO_REQUEST_USER);
        setActiveTab("for-you");
        setRespondedIds(new Set());
        setRespondSuccessIds(new Set());
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        let userCtx: RequestUser = { ...ANON_USER };

        if (user) {
          setActiveTab("for-you");
          const [{ data: profile }, { data: listing }] = await Promise.all([
            supabase
              .from("profiles")
              .select("full_name, email, trade_category, occupation, city, state, lat, lng, lodge_id, verification_status")
              .eq("id", user.id)
              .single(),
            supabase
              .from("listings")
              .select("phone, email")
              .eq("profile_id", user.id)
              .eq("is_active", true)
              .maybeSingle(),
          ]);

          let lodgeName = "";
          const lodgeId: string | null = profile?.lodge_id ?? null;

          if (profile?.lodge_id) {
            const { data: lodge } = await supabase
              .from("lodges")
              .select("name, number")
              .eq("id", profile.lodge_id)
              .maybeSingle();
            if (lodge) lodgeName = `${lodge.name} #${lodge.number}`;
          }

          userCtx = {
            name: profile?.full_name || user.email?.split("@")[0] || "Member",
            firstName: (profile?.full_name || "Member").split(" ")[0],
            trade: (profile?.trade_category as TradeCategory) || "",
            occupation: profile?.occupation || "",
            lodge: lodgeName,
            lodgeId,
            city: profile?.city || ANON_USER.city,
            state: profile?.state || ANON_USER.state,
            lat: profile?.lat ?? ANON_USER.lat,
            lng: profile?.lng ?? ANON_USER.lng,
            isVerified: profile?.verification_status === "verified",
            isLoggedIn: true,
            email: user.email ?? "",
            contactPhone: listing?.phone?.trim() || null,
            contactEmail: listing?.email?.trim() || profile?.email?.trim() || user.email || null,
          };

          if (profile?.verification_status === "verified") {
            const { data: myResponses } = await supabase
              .from("request_responses")
              .select("request_id")
              .eq("responder_id", user.id);
            setRespondedIds(new Set((myResponses ?? []).map((r) => r.request_id)));
          } else {
            setRespondedIds(new Set());
          }
        } else {
          setRespondedIds(new Set());
          const area = await resolveGuestArea();
          setGuestAreaSource(area.source);
          userCtx = {
            ...ANON_USER,
            city: area.city,
            state: area.state,
            lat: area.lat,
            lng: area.lng,
          };
          setActiveTab("your-area");
        }

        const res = await fetch("/api/requests");
        const payload = await res.json();
        const rows = res.ok ? payload.requests ?? [] : [];
        if (!res.ok) console.error("Requests fetch error:", payload.error);

        setRequests(rows.map(dbRequestToServiceRequest));
        setRequestUser(userCtx);
      } catch (err) {
        console.error("Requests load error:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isDemoMode]);

  const forYouBands = useMemo(() => {
    const sort = scoreSort(requestUser);
    const nationwide = requests.filter((r) => r.remoteEligible).sort(sort);
    const nonRemote = requests.filter((r) => !r.remoteEligible);

    const nearYou: ServiceRequest[] = [];
    const nearYouOther: ServiceRequest[] = [];
    const inYourArea: ServiceRequest[] = [];
    const acrossState: ServiceRequest[] = [];

    for (const r of nonRemote) {
      const mi = haversineDistance(requestUser.lat, requestUser.lng, r.lat, r.lng);
      if (mi <= 25) {
        if (requestUser.trade && r.category === requestUser.trade) nearYou.push(r);
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
  }, [requests, requestUser]);

  const lodgeRequests = useMemo(
    () =>
      requests
        .filter((r) =>
          requestUser.lodgeId
            ? r.lodgeId === requestUser.lodgeId
            : requestUser.lodge && r.lodge === requestUser.lodge
        )
        .sort((a, b) => a.postedHoursAgo - b.postedHoursAgo),
    [requests, requestUser]
  );

  function passesGuestAreaFilters(r: ServiceRequest) {
    if (areaFilterCategory && r.category !== areaFilterCategory) return false;
    if (areaFilterStatus) {
      if (r.status !== areaFilterStatus) return false;
    } else if (r.status !== "open" && r.status !== "active") {
      return false;
    }
    return true;
  }

  const areaBands = useMemo(() => {
    const guestFilter = (r: ServiceRequest) =>
      !requestUser.isLoggedIn ? passesGuestAreaFilters(r) : true;

    const nationwide = requests
      .filter((r) => r.remoteEligible && guestFilter(r))
      .sort((a, b) => a.postedHoursAgo - b.postedHoursAgo);
    const local = requests
      .filter((r) => {
        if (r.remoteEligible) return false;
        if (!guestFilter(r)) return false;
        return haversineDistance(requestUser.lat, requestUser.lng, r.lat, r.lng) <= 50;
      })
      .sort((a, b) => a.postedHoursAgo - b.postedHoursAgo);
    return { nationwide, local };
  }, [requests, requestUser, areaFilterCategory, areaFilterStatus]);

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

  const openNearCount = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.status === "open" &&
          !r.remoteEligible &&
          haversineDistance(requestUser.lat, requestUser.lng, r.lat, r.lng) <= 50
      ).length,
    [requests, requestUser]
  );

  const noResponseCount = useMemo(
    () => requests.filter((r) => r.responses === 0 && r.status === "open").length,
    [requests]
  );

  function handleNewRequest(request: ServiceRequest, notifyToken?: string | null) {
    setRequests((prev) => [request, ...prev]);
    setModalOpen(false);
    const requestId = String(request.id);
    if (requestUser.isLoggedIn && !isDemoMode) {
      setToast("Your request is live. You'll get an email when a verified member responds.");
      const responsesPath = notifyToken
        ? `/requests/${requestId}/responses?token=${encodeURIComponent(notifyToken)}`
        : `/requests/${requestId}/responses`;
      setToastAction({
        href: responsesPath,
        label: "View your request",
      });
    } else {
      setToast(
        isDemoMode
          ? "Your request has been posted (demo)."
          : "Your request has been posted. Check your email when a verified member responds."
      );
      setToastAction(null);
    }
  }

  function requestIdKey(id: string | number): string {
    return String(id);
  }

  function cardProps(
    r: ServiceRequest,
    extra?: { matchScore?: number; isMatchingTrade?: boolean }
  ) {
    const id = requestIdKey(r.id);
    const base = {
      request: r,
      isLoggedIn: requestUser.isLoggedIn,
      isVerified: requestUser.isVerified,
      hasResponded: respondedIds.has(id),
      respondSuccess: respondSuccessIds.has(id),
      onRespond: (req: ServiceRequest) => setRespondTarget(req),
      userLodge: requestUser.lodge,
    };
    if (!requestUser.isLoggedIn || extra?.matchScore === undefined) {
      return base;
    }
    return { ...base, matchScore: extra.matchScore, isMatchingTrade: extra.isMatchingTrade };
  }

  function handleGuestAreaSave(prefs: GuestAreaPrefs) {
    saveGuestAreaPrefs(prefs);
    setGuestAreaSource(prefs.source);
    setRequestUser((prev) => ({
      ...prev,
      city: prefs.city,
      state: prefs.state,
      lat: prefs.lat,
      lng: prefs.lng,
    }));
  }

  function responderPreview(): ResponderPreview {
    return {
      fullName: requestUser.name,
      trade: requestUser.trade || requestUser.occupation || "",
      lodge: requestUser.lodge,
      city: requestUser.city,
      state: requestUser.state,
      phone: requestUser.contactPhone,
      email: requestUser.contactEmail,
    };
  }

  async function submitResponse(message: string) {
    if (!respondTarget) return;
    const id = requestIdKey(respondTarget.id);

    if (isDemoMode) {
      setRespondSuccessIds((prev) => new Set(prev).add(id));
      setRespondedIds((prev) => new Set(prev).add(id));
      setRequests((prev) =>
        prev.map((r) =>
          requestIdKey(r.id) === id
            ? {
                ...r,
                responses: r.responses + 1,
                status: r.status === "open" ? "active" : r.status,
              }
            : r
        )
      );
      setRespondTarget(null);
      setToast("Response sent. The requester will be notified.");
      return;
    }

    const res = await fetch(`/api/requests/${respondTarget.id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to submit response");
    }

    setRespondedIds((prev) => new Set(prev).add(id));
    setRespondSuccessIds((prev) => new Set(prev).add(id));
    setRequests((prev) =>
      prev.map((r) =>
        requestIdKey(r.id) === id
          ? {
              ...r,
              responses: r.responses + 1,
              status: r.status === "open" ? "active" : r.status,
            }
          : r
      )
    );
    setRespondTarget(null);
    setToast("Response sent. The requester will be notified.");
  }

  function renderForYou() {
    const { nationwide, nearYou, inYourArea, nearYouOther, acrossState } = forYouBands;
    const empty =
      !nationwide.length && !nearYou.length && !inYourArea.length &&
      !nearYouOther.length && !acrossState.length;

    if (empty) return <EmptyState />;

    const stateLabel = requestUser.state === "OK" ? "Oklahoma" : requestUser.state;

    return (
      <div className="space-y-3">
        {nationwide.length > 0 && (
          <>
            <SectionDivider label="🌐  Available nationwide" />
            {nationwide.map((r) => (
              <RequestCard
                key={r.id}
                {...cardProps(r, {
                  matchScore: getMatchScore(r, requestUser),
                  isMatchingTrade: !!requestUser.trade && r.category === requestUser.trade,
                })}
              />
            ))}
          </>
        )}
        {nearYou.length > 0 && (
          <>
            <SectionDivider label="📍  Near you · within 25 miles" />
            {nearYou.map((r) => (
              <RequestCard key={r.id} {...cardProps(r, { matchScore: getMatchScore(r, requestUser), isMatchingTrade: true })} />
            ))}
          </>
        )}
        {inYourArea.length > 0 && (
          <>
            <SectionDivider label="📍  In your area · within 50 miles" />
            {inYourArea.map((r) => (
              <RequestCard
                key={r.id}
                {...cardProps(r, {
                  matchScore: getMatchScore(r, requestUser),
                  isMatchingTrade: !!requestUser.trade && r.category === requestUser.trade,
                })}
              />
            ))}
          </>
        )}
        {nearYouOther.length > 0 && (
          <>
            <SectionDivider label="🗺  Other needs nearby" />
            {nearYouOther.map((r) => (
              <RequestCard key={r.id} {...cardProps(r, { matchScore: getMatchScore(r, requestUser), isMatchingTrade: false })} />
            ))}
          </>
        )}
        {acrossState.length > 0 && (
          <>
            <SectionDivider label={`📍  Across ${stateLabel}`} />
            {acrossState.map((r) => (
              <RequestCard
                key={r.id}
                {...cardProps(r, {
                  matchScore: getMatchScore(r, requestUser),
                  isMatchingTrade: !!requestUser.trade && r.category === requestUser.trade,
                })}
              />
            ))}
          </>
        )}
      </div>
    );
  }

  function renderYourLodge() {
    if (!requestUser.lodgeId && !requestUser.lodge) {
      return (
        <div className="text-center py-20 text-muted">
          <p className="font-medium text-base">Join a lodge to see requests from your brothers.</p>
        </div>
      );
    }
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
          <RequestCard key={r.id} {...cardProps(r)} />
        ))}
      </div>
    );
  }

  function renderGuestAreaFilters() {
    return (
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <select
          value={areaFilterCategory}
          onChange={(e) => setAreaFilterCategory(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold/40"
          aria-label="Filter by trade"
        >
          <option value="">All Trades</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={areaFilterStatus}
          onChange={(e) => setAreaFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold/40"
          aria-label="Filter by status"
        >
          <option value="">Open &amp; active</option>
          {STATUSES.filter(({ value }) => value).map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {hasAreaFilters && (
          <button
            type="button"
            onClick={() => {
              setAreaFilterCategory("");
              setAreaFilterStatus("");
            }}
            className="text-xs text-muted hover:text-navy flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200"
          >
            <X size={11} /> Clear
          </button>
        )}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="ml-auto text-xs font-semibold text-navy border border-gray-200 px-3 py-2 rounded-lg hover:bg-stone transition-colors"
        >
          Change area
        </button>
      </div>
    );
  }

  function renderYourArea() {
    const { nationwide, local } = areaBands;
    const total = nationwide.length + local.length;

    return (
      <>
        {!requestUser.isLoggedIn && renderGuestAreaFilters()}
        {total > 0 ? (
          <div className="space-y-3">
            {nationwide.length > 0 && (
              <>
                <SectionDivider label="🌐  Available nationwide" />
                {nationwide.map((r) => (
                  <RequestCard key={r.id} {...cardProps(r)} />
                ))}
              </>
            )}
            {local.length > 0 && (
              <>
                <SectionDivider label={`📍  Within 50 miles of ${requestUser.city}`} />
                {local.map((r) => (
                  <RequestCard key={r.id} {...cardProps(r)} />
                ))}
              </>
            )}
          </div>
        ) : (
          <EmptyState filtered={hasAreaFilters} />
        )}
      </>
    );
  }

  function renderAll() {
    return (
      <>
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
              <RequestCard key={r.id} {...cardProps(r)} />
            ))}
          </div>
        ) : (
          <EmptyState filtered />
        )}
      </>
    );
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
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

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

          {requestUser.isLoggedIn && requestUser.trade && (
            <p className="text-white/60 text-sm">
              Showing results for:{" "}
              <span className="text-white font-semibold">{requestUser.trade}</span>
              {" · "}
              <span className="text-white font-semibold">{requestUser.city}, {requestUser.state}</span>
            </p>
          )}

          {!requestUser.isLoggedIn && (
            <p className="text-white/60 text-sm">
              Showing requests near{" "}
              <span className="text-white font-semibold">
                {requestUser.city}, {requestUser.state}
              </span>
              {guestAreaSource === "geolocation" && (
                <span className="text-white/40"> · from your location</span>
              )}
              {" · "}
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="text-gold font-semibold hover:underline"
              >
                Change area
              </button>
            </p>
          )}

          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1 scrollbar-none">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
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
            {!requestUser.isLoggedIn && (
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="ml-auto flex-shrink-0 p-2 rounded-xl border border-white/20 text-white/50 hover:text-white hover:border-white/40 transition-colors"
                aria-label="Browse settings"
              >
                <SlidersHorizontal size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-trust/10 rounded-lg mb-4 border border-trust/15">
          <span className="text-trust text-sm">✓</span>
          <p className="text-sm text-trust m-0">
            Only lodge-verified members can respond to requests. Contact details are kept private
            until a member responds.
          </p>
        </div>

        {!requestUser.isLoggedIn && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 bg-stone rounded-xl mb-6 border border-[#E5E0D5] text-sm text-navy">
            <span>Are you a Freemason?</span>
            <Link href="/login?redirect=/requests" className="font-semibold text-navy underline hover:text-trust">
              Sign in
            </Link>
            <span>to respond to requests and connect with members directly.</span>
          </div>
        )}

        <div className="flex gap-8">
          <div className="flex-1 min-w-0">
            {activeTab === "for-you" && renderForYou()}
            {activeTab === "your-lodge" && renderYourLodge()}
            {activeTab === "your-area" && renderYourArea()}
            {activeTab === "all" && renderAll()}
          </div>

          <aside className="hidden lg:block w-64 flex-shrink-0 space-y-4">
            <div className="bg-navy rounded-2xl p-5 text-white">
              <h3 className="font-serif text-lg font-bold mb-1">Need a service?</h3>
              <p className="text-white/60 text-sm mb-4 leading-relaxed">
                Post your request to the network. Verified professionals in your area will respond directly.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="w-full bg-gold hover:bg-gold-dark text-navy font-bold py-2.5 rounded-xl transition-colors text-sm"
              >
                Post a Request
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Open near {requestUser.city}</span>
                <span className="font-serif font-bold text-navy text-lg">{openNearCount}</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">With no response yet</span>
                <span className="font-serif font-bold text-red-500 text-lg">{noResponseCount}</span>
              </div>
            </div>

            {requestUser.isLoggedIn && (
              <div className="bg-stone rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-semibold text-navy uppercase tracking-[0.08em] mb-2">Browsing as</p>
                <p className="text-sm font-medium text-navy">{requestUser.name}</p>
                {requestUser.lodge && <p className="text-xs text-muted mt-0.5">{requestUser.lodge}</p>}
                {requestUser.trade && (
                  <p className="text-xs text-muted">{requestUser.trade} · {requestUser.city}, {requestUser.state}</p>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>

      <Footer />

      {modalOpen && (
        <PostRequestModal
          onClose={() => setModalOpen(false)}
          onSubmit={handleNewRequest}
          defaultLodge={requestUser.lodge || "Your Lodge"}
          defaultCity={requestUser.city}
          defaultState={requestUser.state}
          defaultLat={requestUser.lat}
          defaultLng={requestUser.lng}
          defaultEmail={requestUser.email}
          defaultName={requestUser.name}
        />
      )}

      {respondTarget && (
        <RespondModal
          request={respondTarget}
          preview={responderPreview()}
          onClose={() => setRespondTarget(null)}
          onSubmit={submitResponse}
        />
      )}

      {settingsOpen && !requestUser.isLoggedIn && (
        <GuestBrowseSettingsModal
          current={{
            city: requestUser.city,
            state: requestUser.state,
            lat: requestUser.lat,
            lng: requestUser.lng,
            source: guestAreaSource,
          }}
          onClose={() => setSettingsOpen(false)}
          onSave={handleGuestAreaSave}
        />
      )}

      {toast && (
        <ToastNotification
          message={toast}
          onDismiss={() => {
            setToast(null);
            setToastAction(null);
          }}
          actionHref={toastAction?.href}
          actionLabel={toastAction?.label}
        />
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
