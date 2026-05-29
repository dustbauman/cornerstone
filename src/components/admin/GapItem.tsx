import { AlertTriangle, Info, UserPlus } from "lucide-react";
import { TradeCategory } from "@/lib/types";
import CategoryBadge from "@/components/directory/CategoryBadge";

interface Props {
  trade: TradeCategory;
  openRequests: number;
  onInvite: () => void;
}

export default function GapItem({ trade, openRequests, onInvite }: Props) {
  const hasUrgency = openRequests > 0;

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors ${
        hasUrgency
          ? "bg-amber-50 border-amber-200"
          : "bg-stone border-gray-100"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          {hasUrgency ? (
            <AlertTriangle size={15} className="text-amber-500 flex-shrink-0" />
          ) : (
            <Info size={15} className="text-muted flex-shrink-0" />
          )}
          <CategoryBadge trade={trade} size="sm" />
        </div>
        <p className="text-sm text-muted">
          No verified {trade.toLowerCase()} professionals within 50 miles
        </p>
        {hasUrgency ? (
          <span className="inline-block mt-1 text-xs font-semibold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
            {openRequests} open {openRequests === 1 ? "request" : "requests"} waiting
          </span>
        ) : (
          <span className="inline-block mt-1 text-xs text-muted bg-gray-100 px-2.5 py-0.5 rounded-full">
            No open requests yet
          </span>
        )}
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onInvite}
          className="flex items-center gap-1.5 bg-navy hover:bg-navy-dark text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          <UserPlus size={13} />
          Invite a member to list
        </button>
        <button className="text-xs text-muted hover:text-navy border border-gray-200 px-3 py-2 rounded-lg transition-colors whitespace-nowrap">
          Expand search radius
        </button>
      </div>
    </div>
  );
}
