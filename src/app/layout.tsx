import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tyrian — The Verified Business Network for Freemasons",
  description:
    "Tyrian connects lodge-verified Freemason professionals with members and the public across the US. Browse trusted contractors, attorneys, and service providers — every listing backed by a real community.",
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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
