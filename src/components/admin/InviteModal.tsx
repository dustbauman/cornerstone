"use client";

import { useRef, useEffect } from "react";
import { X, Send } from "lucide-react";

interface Brother {
  name: string;
  trade: string;
}

interface Props {
  brother: Brother;
  lodge: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function InviteModal({ brother, lodge, onClose, onConfirm }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstName = brother.name.split(" ").slice(-1)[0]; // last name for the message

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const lodgeRef = lodge.replace(/\s/g, "").toLowerCase();
  const previewMessage = `${firstName} — your lodge has open requests for a ${brother.trade.toLowerCase()} in your area with no one to fill them. Listing your business on Tyrian takes minutes and puts you directly in front of members who need your services. Join here: tyrian.work/join?ref=${lodgeRef}`;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="font-serif text-xl font-bold text-navy">Send a listing invite to {firstName}?</h2>
          <button onClick={onClose} className="text-muted hover:text-navy transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted">
            You&apos;re sending a listing invite to{" "}
            <span className="font-semibold text-[#1A1A1A]">{brother.name}</span>.
            A message will be sent on your behalf:
          </p>

          <div className="bg-stone rounded-xl p-4 border-l-4 border-gold">
            <p className="text-sm text-[#1A1A1A] leading-relaxed italic">
              &ldquo;{previewMessage}&rdquo;
            </p>
          </div>

          <p className="text-xs text-muted">
            They&apos;ll receive this via email with a link to create their listing.
          </p>
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-muted font-semibold py-3 rounded-xl hover:bg-stone transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-navy hover:bg-navy-dark text-white font-bold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            <Send size={15} />
            Send Invite
          </button>
        </div>
      </div>
    </div>
  );
}
