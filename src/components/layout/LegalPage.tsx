import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

interface Props {
  title: string
  children: React.ReactNode
}

export default function LegalPage({ title, children }: Props) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-stone">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h1
            className="font-serif text-4xl font-bold text-navy mb-8"
          >
            {title}
          </h1>
          <div className="prose prose-neutral text-muted leading-relaxed space-y-4 text-base">
            {children}
          </div>
          <p className="mt-10">
            <Link href="/" className="text-sm font-semibold text-navy hover:text-gold transition-colors">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
