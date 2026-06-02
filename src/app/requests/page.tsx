"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { PlusCircle, SlidersHorizontal } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import RequestCard from "@/components/requests/RequestCard";
import SectionDivider from "@/components/ui/SectionDivider";
import PostRequestModal, { type PostRequestResult } from "@/components/requests/PostRequestModal";
import RespondModal, { type ResponderPreview } from "@/components/requests/RespondModal";
import GuestBrowseSettingsModal from "@/components/requests/GuestBrowseSettingsModal";
import ActiveFilterChips from "@/components/requests/ActiveFilterChips";
import RequestsBoardEmpty from "@/components/requests/RequestsBoardEmpty";
import RequestCardSkeleton from "@/components/ui/RequestCardSkeleton";
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
  loadMemberBrowseArea,
  saveMemberBrowseArea,
  clearMemberBrowseArea,
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

interface BrowseFilters {
  category: string;
  status: string;
  state: string;
  noResponseOnly: boolean;
}

const EMPTY_FILTERS: BrowseFilters = {
  category: "",
  status: "",
  state: "",
  noResponseOnly: false,
};

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
  const [profileArea, setProfileArea] = useState<GuestAreaPrefs | null>(null);
  const [filters, setFilters] = useState<BrowseFilters>(EMPTY_FILTERS);
  const [respondTarget, setRespondTarget] = useState<ServiceRequest | null>(null);
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());
  const [respondSuccessIds, setRespondSuccessIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [toastAction, setToastAction] = useState<{ href: string; label: string } | null>(null);

  const visibleTabs = requestUser.isLoggedIn ? MEMBER_TABS : GUEST_TABS;
  const locationOverridden =
    requestUser.isLoggedIn &&
    profileArea != null &&
    (requestUser.city !== profileArea.city ||
      requestUser.state !== profileArea.state ||
      requestUser.lat !== profileArea.lat ||
      requestUser.lng !== profileArea.lng);

  const hasActiveFilters =
    !!filters.category ||
    !!filters.status ||
    !!filters.state ||
    filters.noResponseOnly ||
    !!locationOverridden;

  function passesTabFilters(r: ServiceRequest, tab: TabType) {
    if (filters.noResponseOnly && (r.responses !== 0 || r.status !== "open")) return false;
    if (filters.category && r.category !== filters.category) return false;
    if (filters.status) {
      if (r.status !== filters.status) return false;
    } else if (tab === "your-area") {
      if (r.status !== "open" && r.status !== "active") return false;
    }
    if (tab === "all" && filters.state && r.state !== filters.state) return false;
    return true;
  }

  function clearAllFilters() {
    setFilters(EMPTY_FILTERS);
  }

  function updateFilter<K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

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

          const memberProfileArea: GuestAreaPrefs = {
            city: userCtx.city,
            state: userCtx.state,
            lat: userCtx.lat,
            lng: userCtx.lng,
            source: "profile",
          };
          setProfileArea(memberProfileArea);

          const savedBrowseArea = loadMemberBrowseArea();
          if (savedBrowseArea) {
            userCtx = {
              ...userCtx,
              city: savedBrowseArea.city,
              state: savedBrowseArea.state,
              lat: savedBrowseArea.lat,
              lng: savedBrowseArea.lng,
            };
            setGuestAreaSource(savedBrowseArea.source);
          } else {
            setGuestAreaSource("profile");
          }

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
    const eligible = requests.filter((r) => passesTabFilters(r, "for-you"));
    const nationwide = eligible.filter((r) => r.remoteEligible).sort(sort);
    const nonRemote = eligible.filter((r) => !r.remoteEligible);

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
  }, [requests, requestUser, filters]);

  const lodgeRequests = useMemo(
    () =>
      requests
        .filter((r) => passesTabFilters(r, "your-lodge"))
        .filter((r) =>
          requestUser.lodgeId
            ? r.lodgeId === requestUser.lodgeId
            : requestUser.lodge && r.lodge === requestUser.lodge
        )
        .sort((a, b) => a.postedHoursAgo - b.postedHoursAgo),
    [requests, requestUser, filters]
  );

  const areaBands = useMemo(() => {
    const eligible = (r: ServiceRequest) => passesTabFilters(r, "your-area");

    const nationwide = requests
      .filter((r) => r.remoteEligible && eligible(r))
      .sort((a, b) => a.postedHoursAgo - b.postedHoursAgo);
    const local = requests
      .filter((r) => {
        if (r.remoteEligible) return false;
        if (!eligible(r)) return false;
        return haversineDistance(requestUser.lat, requestUser.lng, r.lat, r.lng) <= 50;
      })
      .sort((a, b) => a.postedHoursAgo - b.postedHoursAgo);
    return { nationwide, local };
  }, [requests, requestUser, filters]);

  const allFiltered = useMemo(
    () =>
      requests
        .filter((r) => passesTabFilters(r, "all"))
        .sort((a, b) => a.postedHoursAgo - b.postedHoursAgo),
    [requests, filters]
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

  function handleNewRequest(request: ServiceRequest, result: PostRequestResult) {
    setModalOpen(false);
    const requestId = String(request.id);

    if (isDemoMode) {
      setRequests((prev) => [request, ...prev]);
      setToast("Your request has been posted (demo).");
      setToastAction(null);
      return;
    }

    // Guest post: not live until the email is confirmed — don't add it to the board.
    if (result.pending) {
      setToast(
        "Almost done — check your email and confirm to publish your request to the network."
      );
      setToastAction(null);
      return;
    }

    // Live member post.
    setRequests((prev) => [request, ...prev]);
    setToast("Your request is live. You'll get an email when a verified member responds.");
    const responsesPath = result.notifyToken
      ? `/requests/${requestId}/responses?token=${encodeURIComponent(result.notifyToken)}`
      : `/requests/${requestId}/responses`;
    setToastAction({
      href: responsesPath,
      label: "View your request",
    });
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

  function handleBrowseAreaSave(prefs: GuestAreaPrefs) {
    if (requestUser.isLoggedIn) {
      saveMemberBrowseArea(prefs);
    } else {
      saveGuestAreaPrefs(prefs);
    }
    setGuestAreaSource(prefs.source);
    setRequestUser((prev) => ({
      ...prev,
      city: prefs.city,
      state: prefs.state,
      lat: prefs.lat,
      lng: prefs.lng,
    }));
  }

  function handleUseProfileLocation() {
    if (!profileArea) return;
    clearMemberBrowseArea();
    setGuestAreaSource("profile");
    setRequestUser((prev) => ({
      ...prev,
      city: profileArea.city,
      state: profileArea.state,
      lat: profileArea.lat,
      lng: profileArea.lng,
    }));
  }

  function buildActiveFilterChips() {
    const chips: { id: string; label: string; onRemove: () => void }[] = [];

    if (filters.noResponseOnly) {
      chips.push({
        id: "no-response",
        label: "No responses yet",
        onRemove: () => updateFilter("noResponseOnly", false),
      });
    }
    if (filters.category) {
      chips.push({
        id: "category",
        label: filters.category,
        onRemove: () => updateFilter("category", ""),
      });
    }
    if (filters.status) {
      const label = STATUSES.find((s) => s.value === filters.status)?.label ?? filters.status;
      chips.push({
        id: "status",
        label,
        onRemove: () => updateFilter("status", ""),
      });
    }
    if (filters.state && activeTab === "all") {
      chips.push({
        id: "state",
        label: filters.state,
        onRemove: () => updateFilter("state", ""),
      });
    }
    if (locationOverridden) {
      chips.push({
        id: "location",
        label: `Near ${requestUser.city}, ${requestUser.state}`,
        onRemove: handleUseProfileLocation,
      });
    }

    return chips;
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

    if (empty) return <RequestsBoardEmpty filtered={hasActiveFilters} />;

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
        <RequestsBoardEmpty
          filtered={hasActiveFilters}
          message={hasActiveFilters ? undefined : "No requests from your lodge yet."}
        />
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

  function renderBrowseControls() {
    const statusDefaultLabel =
      activeTab === "your-area" ? "Open & active" : "All statuses";

    return (
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <select
          value={filters.category}
          onChange={(e) => updateFilter("category", e.target.value)}
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
          value={filters.status}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold/40"
          aria-label="Filter by status"
        >
          <option value="">{statusDefaultLabel}</option>
          {STATUSES.filter(({ value }) => value).map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {activeTab === "all" && (
          <select
            value={filters.state}
            onChange={(e) => updateFilter("state", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold/40"
            aria-label="Filter by state"
          >
            <option value="">All States</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="text-xs font-semibold text-navy border border-gray-200 px-3 py-2 rounded-lg hover:bg-stone transition-colors"
        >
          Change area
        </button>
        {activeTab === "all" && (
          <span className="ml-auto text-xs text-muted">{allFiltered.length} requests</span>
        )}
      </div>
    );
  }

  function renderBrowseChrome() {
    const chips = buildActiveFilterChips();

    return (
      <div className="mb-6 space-y-3">
        <ActiveFilterChips
          chips={chips}
          onClearAll={
            chips.length > 1
              ? () => {
                  clearAllFilters();
                  if (locationOverridden) handleUseProfileLocation();
                }
              : undefined
          }
        />
        {renderBrowseControls()}
      </div>
    );
  }

  function renderYourArea() {
    const { nationwide, local } = areaBands;
    const total = nationwide.length + local.length;

    return total > 0 ? (
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
      <RequestsBoardEmpty filtered={hasActiveFilters} />
    );
  }

  function renderAll() {
    return allFiltered.length > 0 ? (
      <div className="space-y-3">
        {allFiltered.map((r) => (
          <RequestCard key={r.id} {...cardProps(r)} />
        ))}
      </div>
    ) : (
      <RequestsBoardEmpty filtered={hasActiveFilters} />
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="bg-navy text-white py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-8 w-48 bg-white/10 rounded animate-pulse mb-3" />
            <div className="h-4 w-72 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex-1 bg-stone py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <RequestCardSkeleton key={i} />
            ))}
          </div>
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

          {requestUser.isLoggedIn && (
            <p className="text-white/60 text-sm">
              {requestUser.trade && (
                <>
                  Personalized for{" "}
                  <span className="text-white font-semibold">{requestUser.trade}</span>
                  {" · "}
                </>
              )}
              Near{" "}
              <span className="text-white font-semibold">
                {requestUser.city}, {requestUser.state}
              </span>
              {locationOverridden && (
                <span className="text-white/40"> · custom area</span>
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
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="ml-auto flex-shrink-0 p-2 rounded-xl border border-white/20 text-white/50 hover:text-white hover:border-white/40 transition-colors"
              aria-label="Browse settings"
            >
              <SlidersHorizontal size={15} />
            </button>
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
            {renderBrowseChrome()}
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
              <button
                type="button"
                onClick={() => updateFilter("noResponseOnly", !filters.noResponseOnly)}
                className={`w-full flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2 transition-colors ${
                  filters.noResponseOnly
                    ? "bg-red-50 ring-1 ring-red-100"
                    : "hover:bg-stone"
                }`}
              >
                <span className="text-sm text-muted">With no response yet</span>
                <span className="font-serif font-bold text-red-500 text-lg">{noResponseCount}</span>
              </button>
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

      {settingsOpen && (
        <GuestBrowseSettingsModal
          current={{
            city: requestUser.city,
            state: requestUser.state,
            lat: requestUser.lat,
            lng: requestUser.lng,
            source: guestAreaSource,
          }}
          onClose={() => setSettingsOpen(false)}
          onSave={handleBrowseAreaSave}
          profileDefault={requestUser.isLoggedIn ? profileArea : undefined}
          onUseProfile={requestUser.isLoggedIn ? handleUseProfileLocation : undefined}
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
