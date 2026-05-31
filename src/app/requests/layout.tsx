import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Service Requests — Find a Verified Masonic Professional',
  description:
    'Post a service request on Tyrian and connect with lodge-verified Freemason professionals in your area. Free to browse. Members respond directly.',
}

export default function RequestsLayout({ children }: { children: React.ReactNode }) {
  return children
}
