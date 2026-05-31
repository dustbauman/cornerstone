import type { Metadata } from "next";
import { DemoProvider } from "@/lib/demo/context";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const siteDescription =
  "Tyrian connects lodge-verified Freemason professionals with members and the public across the US. Browse trusted contractors, attorneys, and service providers — every listing backed by a real community.";

const ogDescription =
  "Find or list lodge-verified businesses. The professional network built on Freemasonry's foundation of trust.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Tyrian — The Verified Business Network for Freemasons",
    template: "%s | Tyrian",
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: getSiteUrl(),
    siteName: "Tyrian",
    title: "Tyrian · Verified Masonic Professionals",
    description: ogDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "Tyrian · Verified Masonic Professionals",
    description: ogDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-stone text-[#1A1A1A]">
        <DemoProvider>{children}</DemoProvider>
      </body>
    </html>
  );
}
