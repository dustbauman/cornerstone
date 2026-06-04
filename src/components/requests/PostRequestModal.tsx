"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { CATEGORIES } from "@/lib/constants/categories";
import { US_STATES } from "@/lib/constants/states";
import { ServiceRequest, RequestTimeline } from "@/lib/demo/requests";
import { TradeCategory } from "@/lib/types";

export interface PostRequestResult {
  notifyToken?: string | null;
  pending?: boolean;
}

interface Props {
  onClose: () => void;
  onSubmit: (request: ServiceRequest, result: PostRequestResult) => void | Promise<void>;
  defaultLodge?: string;
  defaultCity?: string;
  defaultState?: string;
  defaultLat?: number;
  defaultLng?: number;
  defaultEmail?: string;
  defaultName?: string;
}

const TIMELINES: RequestTimeline[] = ["ASAP", "Within 1 week", "Within 1 month", "Flexible"];

export default function PostRequestModal({
  onClose,
  onSubmit,
  defaultLodge = "Your Lodge",
  defaultCity = "",
  defaultState = "OK",
  defaultLat = 0,
  defaultLng = 0,
  defaultEmail = "",
  defaultName = "Guest",
}: Props) {
  const isAnon = !defaultEmail;

  const [form, setForm] = useState({
    title: "",
    category: "" as TradeCategory | "",
    city: defaultCity,
    state: defaultState,
    lodgeNumber: "",
    budget: "",
    timeline: "Flexible" as RequestTimeline,
    details: "",
    email: defaultEmail,
    name: "",
    remoteEligible: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.category || !form.city || !form.email) return;

    setSubmitting(true);
    setSubmitError("");

    const lodge = isAnon
      ? form.lodgeNumber
        ? `Lodge #${form.lodgeNumber}`
        : ""
      : form.lodgeNumber
        ? `${defaultLodge.replace(/ #\d+$/, "")} #${form.lodgeNumber}`
        : defaultLodge;

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          category: form.category,
          city: form.city,
          state: form.state,
          budget: form.budget,
          timeline: form.timeline,
          details: form.details,
          email: form.email,
          name: form.name.trim() || defaultName,
          lat: defaultLat,
          lng: defaultLng,
          remoteEligible: form.remoteEligible,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Failed to post request");
        return;
      }

      const newRequest: ServiceRequest = {
        id: data.id,
        title: form.title,
        category: form.category as TradeCategory,
        name: form.name.trim() || defaultName,
        lodge,
        city: form.city,
        state: form.state,
        lat: defaultLat,
        lng: defaultLng,
        budget: form.budget || "Flexible",
        timeline: form.timeline,
        details: form.details,
        responses: 0,
        postedHoursAgo: 0,
        status: "open",
        remoteEligible: form.remoteEligible,
        verifiedMember: !isAnon,
      };

      await onSubmit(newRequest, {
        notifyToken: data.notify_token ?? null,
        pending: !!data.pending,
      });
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const field = "tyrian-input rounded-xl px-4 py-3";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="tyrian-modal-panel w-full max-w-lg">
        <div className="tyrian-modal-header px-6">
          <h2 className="font-serif text-xl font-bold text-navy">Post a service request</h2>
          <button onClick={onClose} className="text-muted hover:text-navy transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">
              What do you need? <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Licensed plumber for bathroom remodel"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className={field}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">
              Trade category <span className="text-red-400">*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as TradeCategory })}
              required
              className={`${field} bg-white`}
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* City + State */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-navy mb-1.5">
                City <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Tampa"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
                className={field}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-1.5">State</label>
              <select
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className={`${field} bg-white`}
              >
                {US_STATES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Remote eligible */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.remoteEligible}
              onChange={(e) => setForm({ ...form, remoteEligible: e.target.checked })}
              className="w-4 h-4 accent-navy flex-shrink-0"
            />
            <span className="text-sm text-[#1A1A1A]">
              This can be done <span className="font-semibold">remotely</span> — open to professionals anywhere
            </span>
          </label>

          {/* Lodge number */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Lodge # (optional)</label>
            <input
              type="text"
              placeholder="e.g. 123"
              value={form.lodgeNumber}
              onChange={(e) => setForm({ ...form, lodgeNumber: e.target.value })}
              className={field}
            />
            <p className="text-xs text-muted mt-1">
              Adding your lodge makes your request more trustworthy to providers.
            </p>
          </div>

          {/* Budget + Timeline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-navy mb-1.5">Budget (optional)</label>
              <input
                type="text"
                placeholder="~$500"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className={field}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-navy mb-1.5">Timeline</label>
              <select
                value={form.timeline}
                onChange={(e) => setForm({ ...form, timeline: e.target.value as RequestTimeline })}
                className={`${field} bg-white`}
              >
                {TIMELINES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Details */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Details (optional)</label>
            <textarea
              placeholder="Any other information that would help professionals understand your request..."
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              rows={3}
              className={`${field} resize-none`}
            />
          </div>

          {/* Name — only shown for logged-out users */}
          {isAnon && (
            <div>
              <label className="block text-sm font-semibold text-navy mb-1.5">Your name (optional)</label>
              <input
                type="text"
                placeholder="Robert C. Ingram"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={field}
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">
              Where should verified members reach you? <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              placeholder="you@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className={field}
            />
            <p className="text-xs text-muted mt-1">
              Your contact details are shared only with lodge-verified members who respond through
              Tyrian — never publicly.
            </p>
          </div>

          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{submitError}</p>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 tyrian-btn-secondary py-3 text-sm text-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gold hover:bg-gold-dark disabled:opacity-50 text-navy font-bold py-3 rounded-xl transition-colors text-sm"
            >
              {submitting ? "Posting…" : "Post to the Network"}
            </button>
          </div>
          <p className="text-xs text-muted text-center pb-2">
            Your request is visible to verified Tyrian members. Contact details are shared only when
            a verified member responds through Tyrian.
          </p>
        </form>
      </div>
    </div>
  );
}
