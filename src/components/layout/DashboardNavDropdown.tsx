'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, LayoutDashboard, Shield, Building2 } from 'lucide-react'

interface DashboardNavDropdownProps {
  isLodgeAdmin: boolean
  lodgeSlug: string | null
  /** 'desktop' nav bar or 'mobile' drawer section */
  variant?: 'desktop' | 'mobile'
  onNavigate?: () => void
}

export default function DashboardNavDropdown({
  isLodgeAdmin,
  lodgeSlug,
  variant = 'desktop',
  onNavigate,
}: DashboardNavDropdownProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const dashboardActive = pathname.startsWith('/dashboard')
  const adminActive = pathname.startsWith('/admin')
  const lodgeActive = lodgeSlug ? pathname.startsWith(`/lodge/${lodgeSlug}`) : false
  const menuActive = dashboardActive || adminActive || lodgeActive

  useEffect(() => {
    if (variant !== 'desktop') return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [variant])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const items = [
    {
      href: '/dashboard',
      label: 'My Dashboard',
      icon: LayoutDashboard,
      show: true,
      active: dashboardActive,
    },
    {
      href: lodgeSlug ? `/lodge/${lodgeSlug}` : '/dashboard',
      label: 'My Lodge',
      icon: Building2,
      show: isLodgeAdmin && !!lodgeSlug,
      active: lodgeActive,
    },
    {
      href: '/admin',
      label: 'Lodge Admin',
      icon: Shield,
      show: isLodgeAdmin,
      active: adminActive,
    },
  ].filter(item => item.show)

  function handleLinkClick() {
    setOpen(false)
    onNavigate?.()
  }

  if (variant === 'mobile') {
    return (
      <div className="pt-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#C9A84C] px-1 mb-1">
          Dashboard
        </p>
        <div className="ml-2 pl-3 border-l border-white/15 space-y-0.5">
          {items.map(item => (
            <Link
              key={item.href + item.label}
              href={item.href}
              onClick={handleLinkClick}
              className={`flex items-center gap-2 text-base font-medium py-2 ${
                item.active ? 'text-white' : 'text-white/80 hover:text-white'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
          menuActive
            ? 'bg-[#C9A84C] text-navy'
            : 'bg-[#C9A84C]/15 border border-[#C9A84C]/35 text-[#C9A84C] hover:bg-[#C9A84C]/25'
        }`}
      >
        <LayoutDashboard size={15} />
        Dashboard
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 min-w-[200px] bg-[#162238] border border-white/10 rounded-xl shadow-lg py-1.5 z-50">
          {items.map(item => (
            <Link
              key={item.href + item.label}
              href={item.href}
              onClick={handleLinkClick}
              className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                item.active
                  ? 'text-[#C9A84C] bg-white/5'
                  : 'text-white/85 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={15} className="flex-shrink-0" />
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
