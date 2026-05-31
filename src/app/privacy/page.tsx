import type { Metadata } from 'next'
import LegalPage from '@/components/layout/LegalPage'

export const metadata: Metadata = {
  title: 'Privacy Policy · Tyrian',
  robots: { index: false },
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p className="text-sm text-muted">
        Last updated: May 2025. This is a summary policy for the Tyrian preview. A full legal
        policy will be published before general availability.
      </p>
      <p>
        Tyrian collects information you provide when you create an account, list a business,
        post a service request, or join through your lodge — including name, email, lodge
        affiliation, and professional details.
      </p>
      <p>
        We use this information to operate the directory and request board, verify membership
        through lodge sponsors, and send transactional emails (such as magic links and sponsor
        confirmations). We do not sell your personal information.
      </p>
      <p>
        Public directory listings may be indexed by search engines when you choose a public
        visibility setting. Member-only content is visible to verified members per your
        settings.
      </p>
      <p>
        Contact{' '}
        <a href="mailto:hello@tyrian.work" className="text-navy font-semibold hover:text-gold">
          hello@tyrian.work
        </a>{' '}
        with privacy questions or deletion requests.
      </p>
    </LegalPage>
  )
}
