import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The Network · Tyrian',
  description:
    'Browse lodges on Tyrian — verified professionals, open requests, and members from lodges across the country.',
}

export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  return children
}
