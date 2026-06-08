import { ShieldCheck } from "lucide-react";

interface Props {
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: 12, mark: "w-5 h-5", text: "text-[11px]", gap: "gap-1.5", px: "pl-1 pr-2 py-1" },
  md: { icon: 14, mark: "w-6 h-6", text: "text-xs", gap: "gap-2", px: "pl-1.5 pr-2.5 py-1.5" },
  lg: { icon: 18, mark: "w-8 h-8", text: "text-sm", gap: "gap-2.5", px: "pl-2 pr-3 py-2" },
};

export default function VerifiedBadge({ size = "md" }: Props) {
  const s = sizes[size];
  return (
    <span
      className={`inline-flex items-center ${s.gap} ${s.px} rounded-lg bg-trust/10 text-trust font-semibold ${s.text} border border-trust/20 uppercase tracking-[0.08em] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]`}
    >
      <span className={`${s.mark} rounded-md bg-white border border-trust/20 flex items-center justify-center shadow-sm`}>
        <ShieldCheck size={s.icon} strokeWidth={2.5} />
      </span>
      Lodge-Verified Member
    </span>
  );
}
