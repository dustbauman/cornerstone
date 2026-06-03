import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Claim Your Lodge',
  robots: { index: false, follow: false },
}

export default function ClaimLayout({ children }: { children: React.ReactNode }) {
  return children
}
