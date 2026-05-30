import Link from "next/link";
import TyrianMark from "@/components/brand/TyrianMark";

interface Props {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}

export default function Logo({ variant = "dark", size = "md" }: Props) {
  const textColor = variant === "light" ? "text-white" : "text-navy";

  const textSize = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  }[size];

  const iconSize = { sm: 24, md: 30, lg: 38 }[size];

  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <TyrianMark size={iconSize} className="text-[#C9A84C]" />
      <span className={`font-serif font-medium ${textSize} ${textColor} tracking-[0.15em] uppercase`}>
        Tyrian
      </span>
    </Link>
  );
}
