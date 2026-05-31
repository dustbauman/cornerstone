import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 bg-stone flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1
            className="font-serif text-4xl font-bold text-navy mb-4"
          >
            This page doesn&apos;t exist — but the network does.
          </h1>
          <p className="text-muted leading-relaxed mb-8">
            Head back to the directory to find verified Masonic professionals near you.
          </p>
          <Link
            href="/directory"
            className="inline-flex items-center justify-center bg-navy hover:bg-navy-dark text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Browse the Directory →
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
