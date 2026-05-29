import { ShieldCheck } from "lucide-react";

interface Props {
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: 12, text: "text-xs", gap: "gap-1", px: "px-2 py-0.5" },
  md: { icon: 14, text: "text-sm", gap: "gap-1.5", px: "px-2.5 py-1" },
  lg: { icon: 18, text: "text-base", gap: "gap-2", px: "px-3 py-1.5" },
};

export default function VerifiedBadge({ size = "md" }: Props) {
  const s = sizes[size];
  return (
    <span
      className={`inline-flex items-center ${s.gap} ${s.px} rounded-full bg-trust/10 text-trust font-semibold ${s.text} border border-trust/20 uppercase tracking-[0.08em]`}
    >
      <ShieldCheck size={s.icon} strokeWidth={2.5} />
      Lodge-Verified Member
    </span>
  );
}
