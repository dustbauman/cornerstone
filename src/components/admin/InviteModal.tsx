"use client";

import { useRef, useEffect, useState } from "react";
import { X, Send, Loader2 } from "lucide-react";

interface Brother {
  name: string;
  trade: string;
}

interface Props {
  brother: Brother;
  lodge: string;
  onClose: () => void;
  onConfirm: (email: string) => Promise<void>;
}

export default function InviteModal({ brother, lodge, onClose, onConfirm }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstName = brother.name.split(" ").slice(-1)[0];
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !sending) onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, sending]);

  const lodgeRef = lodge.replace(/\s/g, "").toLowerCase();
  const previewMessage = `${firstName} — your lodge has open requests for a ${brother.trade.toLowerCase()} in your area with no one to fill them. Listing your business on Tyrian takes minutes and puts you directly in front of members who need your services.`;

  async function handleSend() {
    const trimmed = email.trim();
    if (!trimmed || sending) return;
    setError("");
    setSending(true);
    try {
      await onConfirm(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/60"
      onClick={(e) => {
        if (e.target === overlayRef.current && !sending) onClose();
      }}
    >
      <div className="tyrian-modal-panel w-full max-w-md">
        <div className="tyrian-modal-header px-6">
          <h2 className="font-serif text-xl font-bold text-navy">
            Send a listing invite to {firstName}?
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="text-muted hover:text-navy transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted">
            You&apos;re sending a listing invite to{" "}
            <span className="font-semibold text-charcoal">{brother.name}</span> ({brother.trade}).
          </p>

          <div>
            <label className="block text-xs font-medium text-charcoal mb-1.5">
              Their email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="brother@email.com"
              className="tyrian-input"
              disabled={sending}
            />
          </div>

          <div className="bg-stone rounded-xl p-4 border-l-4 border-gold">
            <p className="text-sm text-charcoal leading-relaxed italic">
              &ldquo;{previewMessage}&rdquo;
            </p>
          </div>

          <p className="text-xs text-muted">
            They&apos;ll receive a branded email with a link to join via {lodgeRef || "your lodge"}.
          </p>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="flex-1 tyrian-btn-secondary py-3 text-sm text-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !email.trim()}
            className="flex-1 bg-navy hover:bg-navy-dark text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Send Invite
          </button>
        </div>
      </div>
    </div>
  );
}
