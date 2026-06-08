import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
  onAction,
  className = "",
}: Props) {
  return (
    <div className={`text-center py-16 px-4 ${className}`}>
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-navy/5 border border-warm mb-4">
        <Icon size={28} className="text-navy/40" strokeWidth={1.5} />
      </div>
      <p className="font-serif text-xl font-bold text-navy mb-2">{title}</p>
      {description && (
        <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">{description}</p>
      )}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="inline-block mt-5 tyrian-btn-primary text-sm px-5 py-2.5"
        >
          {actionLabel}
        </Link>
      )}
      {onAction && actionLabel && !actionHref && (
        <button
          type="button"
          onClick={onAction}
          className="inline-block mt-5 tyrian-btn-primary text-sm px-5 py-2.5"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
