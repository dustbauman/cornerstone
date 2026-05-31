"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { US_STATES } from "@/lib/constants/states";
import type { GuestAreaPrefs } from "@/lib/guest/area-prefs";

interface Props {
  current: GuestAreaPrefs;
  onClose: () => void;
  onSave: (prefs: GuestAreaPrefs) => void;
}

export default function GuestBrowseSettingsModal({ current, onClose, onSave }: Props) {
  const [city, setCity] = useState(current.city);
  const [state, setState] = useState(current.state);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function saveFromCoords(
    lat: number,
    lng: number,
    labelCity: string,
    labelState: string,
    source: GuestAreaPrefs["source"]
  ) {
    onSave({
      city: labelCity,
      state: labelState,
      lat,
      lng,
      source,
    });
    onClose();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!city.trim() || !state) {
      setError("Enter a city and state.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const params = new URLSearchParams({ city: city.trim(), state });
      const res = await fetch(`/api/geocode?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not find that location.");
        return;
      }
      await saveFromCoords(data.lat, data.lng, data.city, data.state, "saved");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUseLocation() {
    if (!navigator.geolocation) {
      setError("Location is not available in this browser.");
      return;
    }

    setLocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `/api/geocode?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`
          );
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || "Could not resolve your location.");
            return;
          }
          setCity(data.city);
          setState(data.state);
          await saveFromCoords(data.lat, data.lng, data.city, data.state, "geolocation");
        } catch {
          setError("Something went wrong. Try again.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setError("Location access was denied. Enter your city manually.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
    );
  }

  const busy = saving || locating;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-serif text-xl font-bold text-navy">Browse settings</h2>
            <p className="text-sm text-muted mt-0.5">Set the area used for nearby requests.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-muted hover:text-navy hover:bg-stone transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          <button
            type="button"
            onClick={handleUseLocation}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 border border-navy/15 text-navy font-semibold text-sm py-2.5 rounded-xl hover:bg-stone transition-colors disabled:opacity-50"
          >
            {locating ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
            Use my current location
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs text-muted uppercase tracking-wide">or enter manually</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

          <div>
            <label htmlFor="guest-city" className="block text-xs font-semibold text-navy mb-1.5">
              City
            </label>
            <input
              id="guest-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40"
              placeholder="Tulsa"
            />
          </div>

          <div>
            <label htmlFor="guest-state" className="block text-xs font-semibold text-navy mb-1.5">
              State
            </label>
            <select
              id="guest-state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gold/40"
            >
              {US_STATES.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-muted hover:text-navy transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-navy text-white text-sm font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save area
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
