import { TradeCategory } from "@/lib/types";

const categoryColors: Record<TradeCategory, string> = {
  Roofing: "border-amber-200 text-amber-900 bg-amber-50/70",
  Electrical: "border-yellow-200 text-yellow-900 bg-yellow-50/70",
  Legal: "border-purple-200 text-purple-900 bg-purple-50/70",
  Plumbing: "border-blue-200 text-blue-900 bg-blue-50/70",
  Landscaping: "border-green-200 text-green-900 bg-green-50/70",
  Automotive: "border-gray-200 text-gray-800 bg-gray-50/80",
  HVAC: "border-cyan-200 text-cyan-900 bg-cyan-50/70",
  Financial: "border-emerald-200 text-emerald-900 bg-emerald-50/70",
  "General Contractor": "border-orange-200 text-orange-900 bg-orange-50/70",
  Technology: "border-indigo-200 text-indigo-900 bg-indigo-50/70",
  "Home Inspection": "border-rose-200 text-rose-900 bg-rose-50/70",
  Painting: "border-pink-200 text-pink-900 bg-pink-50/70",
  Other: "border-warm text-gray-700 bg-stone",
};

interface Props {
  trade: TradeCategory;
  size?: "sm" | "md";
}

export default function CategoryBadge({ trade, size = "md" }: Props) {
  const color = categoryColors[trade] ?? "border-gray-200 bg-gray-50 text-gray-700";
  return (
    <span
      className={`inline-flex items-center rounded-md border font-semibold ${color} ${
        size === "sm" ? "text-[11px] px-2 py-1" : "text-sm px-3 py-1.5"
      }`}
    >
      {trade}
    </span>
  );
}
