import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The Network',
  description:
    'Browse lodges on Tyrian — lodge-verified professionals, open service requests, and Masonic business connections from lodges across the country.',
}

export default function NetworkLayout({ children }: { children: React.ReactNode }) {
  return children
}
