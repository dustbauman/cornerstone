import Link from "next/link";

const GOLD = "#C9A84C";

interface Props {
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS = {
  sm: "h-8 w-auto", // 32px — compact UI
  md: "h-9 w-auto sm:h-10", // 36→40px — nav / footer
  lg: "h-12 w-auto", // 48px — marketing blocks
} as const;

/** Full Tyrian wordmark — mark + TYRIAN from /public/brand/tyrian-full-logo.svg */
export default function Logo({ variant = "dark", size = "md" }: Props) {
  const textFill = variant === "light" ? "#ffffff" : "#1B2A4A";

  return (
    <Link href="/" className="inline-flex group" aria-label="Tyrian home">
      <svg
        viewBox="0 0 79.35 61.63"
        xmlns="http://www.w3.org/2000/svg"
        className={`flex-shrink-0 ${SIZE_CLASS[size]}`}
        aria-hidden
      >
        <rect fill={GOLD} x="39.32" y="16.74" width=".7" height="15.98" />
        <path
          fill={GOLD}
          d="M53.16,4.41c-.1.95-.2,2.48-.31,4.57-.11,2.1-.17,3.78-.17,5.05,0,.1-.08.14-.24.14s-.25-.04-.28-.14c-.48-2.45-1.37-4.28-2.67-5.51-1.3-1.22-2.91-1.83-4.81-1.83-.92,0-1.54.21-1.83.6-.31.39-.45,1.15-.45,2.27v10.81h-5.34v-10.91c0-1.08-.14-1.82-.43-2.2-.28-.38-.87-.57-1.76-.57-3.78,0-6.49,2.46-8.14,7.39-.03.1-.13.14-.29.13-.15-.01-.24-.07-.24-.17.13-1.27.28-2.92.43-4.94s.24-3.53.24-4.55c0-.15.08-.24.27-.24.17,0,.27.08.27.24,0,.7.9,1.05,2.71,1.05,2.73.1,5.92.14,9.57.14,1.87,0,3.86-.03,5.96-.1l3.25-.04c1.2,0,2.08-.08,2.64-.24s.91-.48,1.06-.95c.04-.13.14-.2.31-.2.18,0,.27.07.27.2Z"
        />
        <path
          fill={GOLD}
          d="M41.95,34.47l-2.32,6.32-2.25-6.32s.66-.88,1.68-1.18v-.69h1.22v.7c.52.14,1.11.49,1.68,1.16Z"
        />
        <text
          fill={textFill}
          transform="translate(3.74 56.86)"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "19.15px",
            fontWeight: 700,
          }}
        >
          <tspan x="0" y="0">
            TYRIAN
          </tspan>
        </text>
      </svg>
    </Link>
  );
}
