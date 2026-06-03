import type { Metadata } from 'next'
import LegalPage from '@/components/layout/LegalPage'

export const metadata: Metadata = {
  title: 'Terms of Use',
  robots: { index: false },
}

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <p className="text-sm text-muted">
        Last updated: May 2025. This is a summary for the Tyrian preview. Full terms will be
        published before general availability.
      </p>
      <p>
        Tyrian is a professional network for Freemasons. By using the site you agree to provide
        accurate information, respect lodge verification processes, and use the platform in good
        faith — including honest listings and requests.
      </p>
      <p>
        Tyrian facilitates introductions between members and professionals. We do not guarantee
        outcomes of any hire, contract, or service arrangement. Users are responsible for their
        own due diligence.
      </p>
      <p>
        Lodge administrators are responsible for member verification decisions within their
        lodge. Tyrian may suspend accounts or listings that violate community standards or
        misrepresent membership.
      </p>
      <p>
        Questions:{' '}
        <a href="mailto:hello@tyrian.work" className="text-navy font-semibold hover:text-gold">
          hello@tyrian.work
        </a>
      </p>
    </LegalPage>
  )
}
