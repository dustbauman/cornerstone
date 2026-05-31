import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Directory — Verified Masonic Professionals',
  description:
    'Browse lodge-verified Freemason contractors, attorneys, financial advisors, and service providers across the US. Every listing on Tyrian is backed by a real community.',
}

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return children
}
