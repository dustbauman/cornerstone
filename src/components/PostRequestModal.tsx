"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { CATEGORIES } from "@/data/listings";
import { ServiceRequest, RequestTimeline } from "@/data/requests";
import { TradeCategory } from "@/lib/types";

interface Props {
  onClose: () => void;
  onSubmit: (request: ServiceRequest) => void;
  defaultLodge?: string;
  defaultCity?: string;
  defaultState?: string;
  defaultLat?: number;
  defaultLng?: number;
}

const TIMELINES: RequestTimeline[] = ["ASAP", "Within 1 week", "Within 2 weeks", "Within 1 month", "Flexible"];

export default function PostRequestModal({
  onClose,
  onSubmit,
  defaultLodge = "Your Lodge",
  defaultCity = "",
  defaultState = "OK",
  defaultLat = 0,
  defaultLng = 0,
}: Props) {
  const [form, setForm] = useState({
    title: "",
    category: "" as TradeCategory | "",
    city: defaultCity,
    state: defaultState,
    lodgeNumber: "",
    budget: "",
    timeline: "Flexible" as RequestTimeline,
    details: "",
    email: "",
  });

  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.category || !form.city || !form.email) return;

    const lodge = form.lodgeNumber
      ? `${defaultLodge.replace(/ #\d+$/, "")} #${form.lodgeNumber}`
      : defaultLodge;

    const newRequest: ServiceRequest = {
      id: Date.now(),
      title: form.title,
      category: form.category as TradeCategory,
      name: "You",
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
      remoteEligible: false,
      verifiedMember: true,
    };

    onSubmit(newRequest);
  }

  const field = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="font-serif text-xl font-bold text-navy">Post a service request</h2>
          <button onClick={onClose} className="text-muted hover:text-navy transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* 1. Title */}
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

          {/* 2. Category */}
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

          {/* 3. City + State */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-navy mb-1.5">
                City <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="Tulsa"
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
                <option value="OK">Oklahoma</option>
                <option value="FL">Florida</option>
                <option value="TX">Texas</option>
                <option value="CA">California</option>
              </select>
            </div>
          </div>

          {/* 4. Lodge number */}
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

          {/* 5 & 6. Budget + Timeline */}
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

          {/* 7. Details */}
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

          {/* 8. Email */}
          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">
              Where should providers reach you? <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              placeholder="you@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className={field}
            />
            <p className="text-xs text-muted mt-1">We won&apos;t use this for anything else.</p>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-muted font-semibold py-3 rounded-xl hover:bg-stone transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-gold hover:bg-gold-dark text-navy font-bold py-3 rounded-xl transition-colors text-sm"
            >
              Post to the Network
            </button>
          </div>
          <p className="text-xs text-muted text-center pb-2">
            Your request is visible to verified Tyrian members. Your contact details are only shared when you choose to respond.
          </p>
        </form>
      </div>
    </div>
  );
}
