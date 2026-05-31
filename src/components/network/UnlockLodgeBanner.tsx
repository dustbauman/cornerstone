import Link from 'next/link'
import { Building2 } from 'lucide-react'

export default function UnlockLodgeBanner() {
  return (
    <section className="mt-12 bg-white rounded-2xl border border-[#E5E0D5] shadow-sm p-8 md:p-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex gap-4">
          <div className="hidden sm:flex w-12 h-12 rounded-xl bg-navy/5 items-center justify-center flex-shrink-0">
            <Building2 size={24} className="text-navy" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gold mb-2">
              Lodge not listed?
            </p>
            <h2
              className="font-serif text-2xl font-bold text-navy mb-2"
            >
              Unlock your lodge on Tyrian
            </h2>
            <p className="text-muted max-w-xl leading-relaxed text-sm">
              If your lodge isn&apos;t on the network yet, a Worshipful Master or Secretary can
              unlock Tyrian for your lodge — then invite members and manage verification from one
              place.
            </p>
          </div>
        </div>
        <Link
          href="/join"
          className="inline-flex items-center justify-center bg-gold hover:bg-gold-dark text-navy font-bold px-6 py-3 rounded-xl transition-colors flex-shrink-0 whitespace-nowrap"
        >
          Unlock your lodge →
        </Link>
      </div>
    </section>
  )
}
