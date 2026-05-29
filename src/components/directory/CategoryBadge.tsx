import { TradeCategory } from "@/lib/types";

const categoryColors: Record<TradeCategory, string> = {
  Roofing: "bg-amber-100 text-amber-800",
  Electrical: "bg-yellow-100 text-yellow-800",
  Legal: "bg-purple-100 text-purple-800",
  Plumbing: "bg-blue-100 text-blue-800",
  Landscaping: "bg-green-100 text-green-800",
  Automotive: "bg-gray-100 text-gray-700",
  HVAC: "bg-cyan-100 text-cyan-800",
  Financial: "bg-emerald-100 text-emerald-800",
  "General Contractor": "bg-orange-100 text-orange-800",
  Technology: "bg-indigo-100 text-indigo-800",
  "Home Inspection": "bg-rose-100 text-rose-800",
  Painting: "bg-pink-100 text-pink-800",
  Other: "bg-stone text-gray-700",
};

interface Props {
  trade: TradeCategory;
  size?: "sm" | "md";
}

export default function CategoryBadge({ trade, size = "md" }: Props) {
  const color = categoryColors[trade] ?? "bg-gray-100 text-gray-700";
  return (
    <span
      className={`inline-block rounded-full font-medium ${color} ${
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1"
      }`}
    >
      {trade}
    </span>
  );
}
