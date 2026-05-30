"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import VerifiedBadge from "@/components/directory/VerifiedBadge";
import { phoneToTelHref } from "@/lib/contact-fields";
import type { ResponderContact } from "@/lib/db/responder-contact";

export interface ResponseItem {
  id: string;
  message: string | null;
  status: string;
  created_at: string;
  responder: ResponderContact | null;
}

interface Props {
  response: ResponseItem;
  onMarkHired?: (responseId: string) => Promise<void>;
  showMarkHired?: boolean;
}

function formatSentAt(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

const STATUS_LABELS: Record<string, string> = {
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  declined: "Declined",
  completed: "Completed",
};

export default function ResponseCard({ response, onMarkHired, showMarkHired }: Props) {
  const [marking, setMarking] = useState(false);
  const contact = response.responder;

  async function handleMarkHired() {
    if (!onMarkHired) return;
    setMarking(true);
    try {
      await onMarkHired(response.id);
    } finally {
      setMarking(false);
    }
  }

  if (!contact) return null;

  const lodgeLocation =
    contact.lodgeLabel && contact.city && contact.state
      ? `${contact.lodgeLabel} · ${contact.city}, ${contact.state}`
      : contact.lodgeLabel;

  return (
    <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-6">
      <VerifiedBadge size="sm" />

      <h3
        className="font-serif text-xl font-bold text-navy mt-3 mb-1"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        {contact.fullName}
      </h3>
      {contact.trade && <p className="text-sm text-muted">{contact.trade}</p>}
      {lodgeLocation && <p className="text-sm text-muted mt-0.5">{lodgeLocation}</p>}

      {response.message && (
        <blockquote className="mt-4 text-sm text-[#1A1A1A] leading-relaxed border-l-2 border-gold/40 pl-4">
          &ldquo;{response.message}&rdquo;
          <footer className="text-xs text-muted mt-2 not-italic">
            — sent {formatSentAt(response.created_at)}
          </footer>
        </blockquote>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-navy uppercase tracking-[0.08em] mb-2">Contact</p>
        <div className="flex flex-wrap gap-4 text-sm">
          {contact.phone && (
            <a href={phoneToTelHref(contact.phone)} className="text-navy hover:text-gold transition-colors">
              📞 {contact.phone}
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="text-navy hover:text-gold transition-colors">
              ✉ {contact.email}
            </a>
          )}
          {!contact.phone && !contact.email && (
            <p className="text-muted text-sm">Find them in the Tyrian directory.</p>
          )}
        </div>
      </div>

      {showMarkHired && onMarkHired && response.status !== "accepted" && (
        <button
          type="button"
          onClick={handleMarkHired}
          disabled={marking}
          className="mt-5 inline-flex items-center gap-2 bg-navy text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-navy/90 transition-colors disabled:opacity-50"
        >
          {marking ? <Loader2 size={14} className="animate-spin" /> : null}
          Mark as hired →
        </button>
      )}

      {response.status === "accepted" && (
        <p className="mt-4 text-sm font-medium text-trust">✓ Marked as hired</p>
      )}
    </div>
  );
}

export function responseStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
