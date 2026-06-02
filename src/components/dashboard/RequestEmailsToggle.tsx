"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";

interface Props {
  demoMode?: boolean;
}

export default function RequestEmailsToggle({ demoMode = false }: Props) {
  const [enabled, setEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (demoMode) {
      setShow(true);
      setLoaded(true);
      return;
    }
    fetch("/api/me/request-emails")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setEnabled(data.enabled);
          setShow(!!data.verified);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [demoMode]);

  async function toggle() {
    const next = !enabled;
    setEnabled(next);
    if (demoMode) return;
    setSaving(true);
    try {
      const res = await fetch("/api/me/request-emails", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) setEnabled(!next);
    } catch {
      setEnabled(!next);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded || !show) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start justify-between gap-4">
      <div className="flex gap-3 min-w-0">
        <span className="text-navy mt-0.5 flex-shrink-0">
          <Bell size={18} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-navy text-sm">New-request emails</p>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">
            Get an email when a request matching your trade and area is posted, so you can respond
            first.
          </p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
        disabled={saving}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
          enabled ? "bg-trust" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
        {saving && (
          <Loader2 size={10} className="animate-spin absolute -right-5 text-muted" />
        )}
      </button>
    </div>
  );
}
