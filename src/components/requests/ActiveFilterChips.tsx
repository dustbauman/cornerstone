"use client";

import { X } from "lucide-react";

export interface FilterChip {
  id: string;
  label: string;
  onRemove: () => void;
}

interface Props {
  chips: FilterChip[];
  onClearAll?: () => void;
  className?: string;
}

export default function ActiveFilterChips({ chips, onClearAll, className = "" }: Props) {
  if (chips.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-semibold bg-navy/5 text-navy border border-navy/15 hover:bg-navy/10 transition-colors"
        >
          {chip.label}
          <X size={12} className="text-muted" aria-hidden />
          <span className="sr-only">Remove {chip.label} filter</span>
        </button>
      ))}
      {chips.length > 1 && onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-semibold text-muted hover:text-navy px-2 py-1 rounded-lg hover:bg-stone transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
