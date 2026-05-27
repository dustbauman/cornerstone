import Link from "next/link";

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
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
        fill="#C9A84C"
      >
        <path d="M19.61.11c-.05.54-.11,1.35-.16,2.44-.06,1.09-.09,1.97-.09,2.66,0,.03-.05.05-.16.05s-.17-.02-.17-.05c-.05-1.44-.35-2.45-.88-3.03-.32-.35-.76-.59-1.33-.73h-4.7v16.7h.18v.5c.37.1.78.35,1.2.83l-1.66,4.52-1.61-4.52s.47-.63,1.2-.84v-.49h.19V1.45h-4.59c-.55.14-1,.39-1.35.74-.58.59-1,1.6-1.26,3.02,0,.03-.05.05-.15.05s-.15-.02-.15-.05c.07-.67.16-1.54.25-2.61.09-1.06.14-1.87.14-2.4,0-.09.05-.14.15-.14s.15.05.15.14c0,.4.5.61,1.49.61,1.57.05,3.43.08,5.57.08,1.08,0,2.24-.02,3.45-.06l1.89-.02c.66,0,1.15-.05,1.47-.14.33-.09.54-.28.63-.56.02-.07.07-.11.16-.11.1,0,.14.04.14.11Z" />
      </svg>
      <span className={`font-serif font-medium ${textSize} ${textColor} tracking-[0.15em] uppercase`}>
        Tyrian
      </span>
    </Link>
  );
}
