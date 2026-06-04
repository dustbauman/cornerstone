"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Loader2, AlertTriangle } from "lucide-react";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
import type { ServiceRequest } from "@/lib/demo/requests";

export interface ResponderPreview {
  fullName: string;
  trade: string;
  lodge: string;
  city: string;
  state: string;
  phone: string | null;
  email: string | null;
}

interface Props {
  request: ServiceRequest;
  preview: ResponderPreview;
  onClose: () => void;
  onSubmit: (message: string) => Promise<void>;
}

function formatTime(hoursAgo: number): string {
  if (hoursAgo < 1) return "Just now";
  if (hoursAgo < 24) return `${hoursAgo}h ago`;
  const days = Math.floor(hoursAgo / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export default function RespondModal({ request, preview, onClose, onSubmit }: Props) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const missingContact = !preview.phone && !preview.email;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(message.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send response");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="tyrian-modal-panel w-full max-w-lg">
        <div className="tyrian-modal-header px-6">
          <h2 className="font-serif text-xl font-bold text-navy">
            Respond to {request.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-muted hover:text-navy transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div className="bg-stone rounded-xl px-4 py-3 text-sm">
            <p className="font-medium text-navy">
              {request.lodge
                ? `${request.name} · ${request.lodge} · ${request.city}, ${request.state}`
                : `${request.name} · ${request.city}, ${request.state}`}
            </p>
            <p className="text-xs text-muted mt-1">Posted {formatTime(request.postedHoursAgo)}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-navy mb-1.5">Your response</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 500))}
              placeholder="Introduce yourself and let them know you can help. Your name and lodge will be included automatically."
              rows={4}
              className="tyrian-input rounded-xl px-4 py-3 resize-none"
            />
            <p className="text-xs text-muted mt-1 text-right">{message.length}/500</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-navy mb-2">
              Your contact info (shown to requester after you respond)
            </p>
            <div className="border border-[#E5E0D5] rounded-xl p-4 space-y-2 text-sm">
              <p className="font-semibold text-navy">{preview.fullName}</p>
              {preview.trade && <p className="text-muted">{preview.trade}</p>}
              <p className="text-muted">
                {preview.lodge}
                {preview.city && preview.state ? ` · ${preview.city}, ${preview.state}` : ""}
              </p>
              <VerifiedBadge size="sm" />
              {preview.phone && <p className="text-navy">{preview.phone}</p>}
              {preview.email && <p className="text-navy">{preview.email}</p>}
              <p className="text-xs text-muted pt-2 border-t border-gray-100">
                Missing contact info?{" "}
                <Link
                  href="/dashboard"
                  target="_blank"
                  className="text-navy underline font-medium"
                >
                  Update your profile →
                </Link>
              </p>
            </div>
            {missingContact && (
              <div className="mt-3 flex gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>
                  You don&apos;t have a phone or email on your listing yet. The requester will see
                  your name and lodge — they can find you in the directory.
                </span>
              </div>
            )}
            <p className="text-xs text-muted mt-3">
              Your name, lodge, and contact details will be shared with the person who posted this
              request.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
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
              className="flex-1 bg-gold hover:bg-gold-dark disabled:opacity-50 text-navy font-bold py-3 rounded-xl transition-colors text-sm inline-flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Sending…
                </>
              ) : (
                "Send Response →"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
