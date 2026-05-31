import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import type { LodgeSummary } from '@/hooks/useLodgeAdminGate'

interface Props {
  lodge: LodgeSummary | null
  title: string
  description?: string
  count?: number
  loading?: boolean
  error?: string
  children: React.ReactNode
}

export default function AdminDirectoryShell({
  lodge,
  title,
  description,
  count,
  loading,
  error,
  children,
}: Props) {
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center bg-stone">
          <Loader2 size={32} className="text-navy animate-spin" />
        </div>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-stone">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <p className="text-lg font-bold text-navy mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Access restricted
            </p>
            <p className="text-sm text-muted mb-4">{error}</p>
            <Link href="/claim" className="text-sm font-semibold text-navy underline">
              Enter a claim code →
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-stone">
      <Navbar />

      <div className="bg-navy text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Lodge Admin
          </Link>
          <p className="text-white/50 text-sm mb-1">
            {lodge ? `${lodge.name} #${lodge.number}` : 'Lodge Admin'}
          </p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            {title}
            {count !== undefined ? (
              <span className="text-white/50 font-normal text-2xl ml-2">({count})</span>
            ) : null}
          </h1>
          {description && <p className="text-white/60 mt-2 text-sm max-w-2xl">{description}</p>}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">{children}</div>

      <Footer />
    </div>
  )
}
