import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface Props {
  href: string
  label: string
  value: number
  icon: LucideIcon
  highlight?: boolean
}

export default function AdminStatCard({ href, label, value, icon: Icon, highlight }: Props) {
  return (
    <Link
      href={href}
      className={`block bg-white rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md hover:border-gold/40 group ${
        highlight ? 'border-amber-200' : 'border-[#E5E0D5]'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted font-medium group-hover:text-navy transition-colors">{label}</p>
        <Icon size={16} className="text-navy" />
      </div>
      <div
        className="text-3xl font-bold text-navy group-hover:text-gold transition-colors"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        {value}
      </div>
      <p className="text-[10px] text-muted mt-2 uppercase tracking-wider">View directory →</p>
    </Link>
  )
}
