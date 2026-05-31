import type { Metadata } from 'next'
import LegalPage from '@/components/layout/LegalPage'

export const metadata: Metadata = {
  title: 'Contact · Tyrian',
  description: 'Get in touch with the Tyrian team.',
}

export default function ContactPage() {
  return (
    <LegalPage title="Contact">
      <p>
        Questions about Tyrian, lodge signup, or member verification? We&apos;re happy to help.
      </p>
      <p>
        Email:{' '}
        <a href="mailto:hello@tyrian.work" className="text-navy font-semibold hover:text-gold">
          hello@tyrian.work
        </a>
      </p>
      <p className="text-sm">
        For lodge admin access, use your claim code on the{' '}
        <a href="/claim" className="text-navy font-semibold hover:text-gold underline">
          claim page
        </a>
        . For members joining a lodge, use the invite link from your Worshipful Master or
        Secretary.
      </p>
    </LegalPage>
  )
}
