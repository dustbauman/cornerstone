import type { Metadata } from 'next'
import LegalPage from '@/components/layout/LegalPage'

export const metadata: Metadata = {
  title: 'About',
  description: 'Tyrian is the lodge-verified professional referral network for Freemasons. Every listing is tied to a real lodge, a real sponsor, and a real community across the US.',
}

export default function AboutPage() {
  return (
    <LegalPage title="About Tyrian">
      <p>
        Tyrian connects lodge-verified Freemason professionals with members and the public
        across the United States. Every listing is tied to a real person, a real lodge, and a
        sponsor confirmation — not an anonymous profile.
      </p>
      <p>
        Members browse the Freemason business directory for trusted trades and services, post requests when they need
        help, and respond to open jobs in their area. Lodges unlock the network for their
        members and manage verification from a dedicated admin panel.
      </p>
      <p>
        The platform is built on the same foundation Freemasonry has always valued: mutual
        support, accountability, and trust within the craft.
      </p>
    </LegalPage>
  )
}
