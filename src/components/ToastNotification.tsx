"use client";

import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

interface Props {
  message: string;
  onDismiss: () => void;
  duration?: number;
}

export default function ToastNotification({ message, onDismiss, duration = 4000 }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [onDismiss, duration]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-navy text-white px-5 py-4 rounded-2xl shadow-2xl border border-white/10 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
      <CheckCircle2 size={20} className="text-trust flex-shrink-0" />
      <p className="text-sm font-medium flex-1">{message}</p>
      <button onClick={onDismiss} className="text-white/40 hover:text-white transition-colors flex-shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}
