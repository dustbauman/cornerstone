"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, X } from "lucide-react";

interface Props {
  message: string;
  onDismiss: () => void;
  duration?: number;
  actionHref?: string;
  actionLabel?: string;
}

export default function ToastNotification({
  message,
  onDismiss,
  duration = 4000,
  actionHref,
  actionLabel = "View",
}: Props) {
  const autoDismissMs = actionHref ? Math.max(duration, 12000) : duration;

  useEffect(() => {
    const t = setTimeout(onDismiss, autoDismissMs);
    return () => clearTimeout(t);
  }, [onDismiss, autoDismissMs]);

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-navy text-white px-5 py-4 rounded-2xl shadow-card-hover border border-white/10 max-w-sm">
      <div className="flex items-start gap-3">
        <CheckCircle2 size={20} className="text-trust flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{message}</p>
          {actionHref && (
            <Link
              href={actionHref}
              onClick={onDismiss}
              className="inline-block mt-2 text-sm font-semibold text-gold hover:text-gold-light transition-colors"
            >
              {actionLabel} →
            </Link>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="text-white/40 hover:text-white transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
